import asyncio
import hashlib
import hmac
import json
import logging
import math
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from bson import ObjectId
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from fastapi.encoders import jsonable_encoder
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.core.config import get_settings
from app.core.database import get_database
from app.core.security import (
    VALID_ROLES,
    create_access_token,
    create_session,
    get_current_user,
    hash_password,
    hash_refresh_token,
    require_role,
    verify_password,
)
from app.routers.api import TRANSITIONS, pagination_payload, serialize, utc_now, write_audit
from app.schemas.operations import (
    AssignDroneRequest,
    CancelOrderResponse,
    CitiesResponse,
    ChangePasswordRequest,
    DroneEnvelope,
    DroneHistoryResponse,
    DroneTelemetryResponse,
    DroneCreate,
    DroneUpdate,
    HubEnvelope,
    HubListResponse,
    OrderCreate,
    OrderEnvelope,
    OrderListEnvelope,
    OrderUpdate,
    PaymentDetailsEnvelope,
    PaymentCreateRequest,
    PaymentRefundRequest,
    PaymentVerificationResponse,
    PaymentVerifyRequest,
    RefreshResponse,
    RefundEnvelope,
    ReasonRequest,
    RefreshRequest,
    RescheduleRequest,
    ScheduleRequest,
    StatesResponse,
    TrackingResponse,
    WebhookResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()
WRITE_ROLES = {"admin", "state_manager", "hub_manager", "dispatcher", "operator"}
MANAGEMENT_ROLES = {"admin", "state_manager", "hub_manager"}
PAYMENT_STATUSES = {"created", "pending", "authorized", "paid", "failed", "cancelled", "refunded", "partially_refunded"}


def error(status_code: int, message: str, code: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"error": message, "code": code})


def user_response(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(user["_id"]), "name": user["name"], "full_name": user["name"],
        "email": user["email"], "role": user["role"], "organization": user.get("organization", "IndoWings"),
        "badge_id": user.get("badge_id", ""), "phone": user.get("phone"),
        "state_access": user.get("state_access", []), "hub_access": user.get("hub_access", []),
        "permissions": user.get("permissions", []), "status": user.get("status", "active"),
    }


def require_scope(user: dict[str, Any], state: str | None = None, hub_id: str | None = None) -> None:
    if user.get("role") == "admin":
        return
    states = user.get("state_access", [])
    hubs = user.get("hub_access", [])
    if state and ("*" not in states and state not in states):
        raise error(403, "User does not have access to this state", "STATE_ACCESS_DENIED")
    if hub_id and (user.get("role") == "hub_manager" or hubs) and "*" not in hubs and hub_id not in hubs:
        raise error(403, "User does not have access to this hub", "HUB_ACCESS_DENIED")
    if state is None and hub_id is None and not (states or hubs):
        raise error(403, "User has no resource scope", "RESOURCE_ACCESS_DENIED")


def validate_hub_scope(user: dict[str, Any], resource: dict[str, Any]) -> None:
    hub_id = resource.get("hub_id")
    state = resource.get("state")
    require_scope(user, state=state, hub_id=hub_id)


async def get_order(database: AsyncIOMotorDatabase, order_id: str) -> dict[str, Any]:
    order = await database.orders.find_one({"order_id": order_id})
    if not order:
        raise error(404, "Order not found", "ORDER_NOT_FOUND")
    return order


async def get_order_for_user(database: AsyncIOMotorDatabase, order_id: str, user: dict[str, Any]) -> dict[str, Any]:
    order = await get_order(database, order_id)
    require_scope(user, order.get("pickup", {}).get("state"), order.get("pickup", {}).get("hub_id"))
    require_scope(user, order.get("delivery", {}).get("state"), order.get("delivery", {}).get("hub_id"))
    return order


async def queue_order_notification(database: AsyncIOMotorDatabase, order: dict[str, Any], event: str) -> None:
    customer = order.get("customer", {})
    await database.notifications.insert_one({
        "notification_id": f"NTF-{uuid4().hex[:16].upper()}",
        "entity_type": "order",
        "entity_id": order["order_id"],
        "event": event,
        "recipient": {"email": customer.get("email"), "phone": customer.get("phone")},
        "channels": ["email", "sms"],
        "status": "queued",
        "provider": None,
        "attempts": 0,
        "created_at": utc_now(),
    })


async def append_order_timeline(database: AsyncIOMotorDatabase, order: dict[str, Any], action: str, user: dict[str, Any], metadata: dict[str, Any] | None = None) -> None:
    await write_audit(database, user, action, "order", order["order_id"], order.get("status"), metadata or {})


async def change_order_status(
    database: AsyncIOMotorDatabase,
    order: dict[str, Any],
    target: str,
    user: dict[str, Any],
    action: str,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    old_status = order["status"]
    if target not in TRANSITIONS.get(old_status, set()):
        raise error(400, f"Cannot transition order from {old_status} to {target}", "INVALID_TRANSITION")
    now = utc_now()
    result = await database.orders.update_one(
        {"_id": order["_id"], "status": old_status},
        {
            "$set": {"status": target, "updated_at": now},
            "$push": {"timeline": {"status": target, "at": now, "user_id": str(user["_id"]), "metadata": metadata or {}}},
        },
    )
    if result.matched_count == 0:
        raise error(409, "Order changed concurrently", "ORDER_CONFLICT")
    drone_id = order.get("drone_id")
    if drone_id:
        if target in {"delivered", "cancelled", "failed"}:
            await database.drones.update_one(
                {"drone_id": drone_id, "current_delivery_id": order["order_id"]},
                {"$set": {"status": "available", "current_delivery_id": None, "current_mission_id": None, "updated_at": now}},
            )
        elif target in {"on_hold", "rescheduled", "scheduled", "assigned", "in_transit"}:
            await database.drones.update_one({"drone_id": drone_id}, {"$set": {"status": target, "updated_at": now}})
    await write_audit(database, user, action, "order", order["order_id"], old_status, target, metadata)
    await queue_order_notification(database, order, target)
    order["status"] = target
    order["updated_at"] = now
    return order


def payment_client():
    settings = get_settings()
    if settings.payment_provider.lower() != "razorpay" or not settings.payment_key_id or not settings.payment_key_secret:
        raise error(503, "A configured payment gateway is required", "PAYMENT_PROVIDER_UNAVAILABLE")
    try:
        import razorpay
    except ImportError as exc:
        logger.exception("Razorpay SDK is not installed")
        raise error(503, "Payment provider SDK is unavailable", "PAYMENT_PROVIDER_UNAVAILABLE") from exc
    return razorpay.Client(auth=(settings.payment_key_id, settings.payment_key_secret))


@router.post("/api/auth/logout", tags=["Authentication"])
async def logout(
    user: dict[str, Any] = Depends(get_current_user),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    session_id = user.get("_session_id")
    if session_id:
        await database.sessions.update_one({"_id": session_id}, {"$set": {"active": False, "revoked_at": utc_now()}})
    await write_audit(database, user, "LOGOUT", "user", str(user["_id"]))
    return {"success": True, "message": "Session revoked"}


@router.post("/api/auth/refresh", tags=["Authentication"], response_model=RefreshResponse)
async def refresh_token(payload: RefreshRequest, database: AsyncIOMotorDatabase = Depends(get_database)) -> dict[str, str]:
    now = utc_now()
    old_hash = hash_refresh_token(payload.refresh_token)
    session = await database.sessions.find_one({"token_hash": old_hash, "active": True, "expires_at": {"$gt": now}})
    if not session:
        raise error(401, "Refresh token is invalid, expired, or revoked", "INVALID_REFRESH_TOKEN")
    user = await database.users.find_one({"_id": session["user_id"], "status": {"$ne": "disabled"}})
    if not user:
        await database.sessions.update_one({"_id": session["_id"]}, {"$set": {"active": False}})
        raise error(401, "Session user is unavailable", "INVALID_REFRESH_TOKEN")
    next_refresh = __import__("secrets").token_urlsafe(48)
    replaced = await database.sessions.update_one(
        {"_id": session["_id"], "token_hash": old_hash, "active": True},
        {"$set": {"token_hash": hash_refresh_token(next_refresh), "rotated_at": now}, "$inc": {"version": 1}},
    )
    if replaced.modified_count != 1:
        raise error(401, "Refresh token was already used", "INVALID_REFRESH_TOKEN")
    return {"token": create_access_token(user, session["_id"], session.get("version", 0) + 1), "refresh_token": next_refresh}


@router.post("/api/auth/change-password", tags=["Authentication"])
async def change_password(
    payload: ChangePasswordRequest,
    user: dict[str, Any] = Depends(get_current_user),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    existing_hash = user.get("password_hash")
    if not existing_hash or not verify_password(payload.current_password, existing_hash):
        raise error(400, "Current password is incorrect or password login is not enabled", "INVALID_CURRENT_PASSWORD")
    await database.users.update_one({"_id": user["_id"]}, {"$set": {"password_hash": hash_password(payload.new_password), "demo_login": False, "updated_at": utc_now()}})
    await database.sessions.update_many({"user_id": str(user["_id"]), "active": True}, {"$set": {"active": False, "revoked_at": utc_now()}})
    await write_audit(database, user, "PASSWORD_CHANGED", "user", str(user["_id"]))
    return {"success": True, "message": "Password changed; sign in again"}


@router.get("/api/locations/states", tags=["Locations"], response_model=StatesResponse)
async def list_states(database: AsyncIOMotorDatabase = Depends(get_database), user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    states = await database.locations.distinct("state", {"country": "India"})
    if user.get("role") != "admin" and "*" not in user.get("state_access", []):
        states = [state for state in states if state in user.get("state_access", [])]
    return {"states": sorted(states)}


@router.get("/api/locations/cities", tags=["Locations"], response_model=CitiesResponse)
async def list_cities(
    state: str | None = None,
    database: AsyncIOMotorDatabase = Depends(get_database),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    if state:
        require_scope(user, state=state)
    query: dict[str, Any] = {"country": "India"}
    if state:
        query["state"] = state
    elif user.get("role") != "admin" and "*" not in user.get("state_access", []):
        query["state"] = {"$in": user.get("state_access", [])}
    rows = await database.locations.find(query, {"_id": 0, "state": 1, "city": 1}).sort([("state", 1), ("city", 1)]).to_list(length=2000)
    return {"cities": rows}


@router.get("/api/locations/hubs", tags=["Locations"], response_model=HubListResponse)
async def list_hubs(
    state: str | None = None,
    city: str | None = None,
    database: AsyncIOMotorDatabase = Depends(get_database),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    query: dict[str, Any] = {"status": "active"}
    if state:
        require_scope(user, state=state)
        query["state"] = state
    elif user.get("role") != "admin" and "*" not in user.get("state_access", []):
        query["state"] = {"$in": user.get("state_access", [])}
    if city:
        query["city"] = city
    rows = await database.hubs.find(query).sort([("state", 1), ("city", 1)]).to_list(length=2000)
    hubs = []
    for row in rows:
        require_scope(user, row["state"], row["hub_id"])
        hubs.append(serialize(row))
    return {"hubs": hubs}


@router.get("/api/locations/hubs/{hub_id}", tags=["Locations"], response_model=HubEnvelope)
async def get_hub(hub_id: str, database: AsyncIOMotorDatabase = Depends(get_database), user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    hub = await database.hubs.find_one({"hub_id": hub_id})
    if not hub:
        raise error(404, "Operations hub not found", "HUB_NOT_FOUND")
    require_scope(user, hub["state"], hub["hub_id"])
    return {"hub": serialize(hub)}


@router.post("/api/fleet", tags=["Fleet"], response_model=DroneEnvelope)
async def create_drone(
    payload: DroneCreate,
    user: dict[str, Any] = Depends(require_role("admin", "state_manager", "hub_manager")),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    require_scope(user, payload.location.state, payload.location.hub_id)
    hub = await database.hubs.find_one({"hub_id": payload.location.hub_id, "state": payload.location.state, "city": payload.location.city, "status": "active"})
    if not hub:
        raise error(400, "Active hub does not match the drone location", "INVALID_HUB")
    now = utc_now()
    record = {
        **payload.model_dump(), "name": payload.drone_id.replace("-", " "),
        "location": payload.location.model_dump(), "current_delivery_id": None,
        "current_mission_id": None, "last_seen": None, "created_at": now, "updated_at": now,
        "flight_hours": 0, "max_range_km": 35, "endurance_mins": 60,
    }
    try:
        result = await database.drones.insert_one(record)
    except DuplicateKeyError as exc:
        raise error(409, "Drone ID or serial number already exists", "DUPLICATE_DRONE") from exc
    record["_id"] = result.inserted_id
    await write_audit(database, user, "DRONE_CREATED", "drone", payload.drone_id, None, payload.model_dump(), {"state": payload.location.state, "hub_id": payload.location.hub_id})
    return {"drone": serialize(record)}


@router.get("/api/fleet/{drone_id}", tags=["Fleet"], response_model=DroneEnvelope)
async def get_drone(drone_id: str, database: AsyncIOMotorDatabase = Depends(get_database), user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    drone = await database.drones.find_one({"drone_id": drone_id})
    if not drone or drone.get("decommissioned_at"):
        raise error(404, "Drone not found", "DRONE_NOT_FOUND")
    require_scope(user, drone.get("location", {}).get("state"), drone.get("location", {}).get("hub_id"))
    return {"drone": serialize(drone)}


@router.patch("/api/fleet/{drone_id}", tags=["Fleet"], response_model=DroneEnvelope)
async def update_drone(
    drone_id: str,
    payload: DroneUpdate,
    user: dict[str, Any] = Depends(require_role("admin", "state_manager", "hub_manager")),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    drone = await database.drones.find_one({"drone_id": drone_id})
    if not drone or drone.get("decommissioned_at"):
        raise error(404, "Drone not found", "DRONE_NOT_FOUND")
    require_scope(user, drone.get("location", {}).get("state"), drone.get("location", {}).get("hub_id"))
    changes = payload.model_dump(exclude_unset=True)
    if "status" in changes and changes["status"] != drone.get("status"):
        if drone.get("current_delivery_id") or drone.get("current_mission_id"):
            raise error(409, "Drone status is controlled by its active delivery or mission", "DRONE_STATUS_OWNED_BY_DELIVERY")
        if changes["status"] not in {"available", "maintenance", "offline"}:
            raise error(400, "Use delivery operations to assign, schedule, hold, or dispatch a drone", "INVALID_DRONE_STATUS_OPERATION")
    if "location" in changes:
        require_scope(user, changes["location"]["state"], changes["location"]["hub_id"])
        if not await database.hubs.find_one({"hub_id": changes["location"]["hub_id"], "state": changes["location"]["state"], "city": changes["location"]["city"], "status": "active"}):
            raise error(400, "Active hub does not match the drone location", "INVALID_HUB")
    if not changes:
        return {"drone": serialize(drone)}
    changes["updated_at"] = utc_now()
    await database.drones.update_one({"_id": drone["_id"]}, {"$set": changes})
    await write_audit(database, user, "DRONE_UPDATED", "drone", drone_id, {key: drone.get(key) for key in changes if key != "updated_at"}, changes, {"state": drone.get("location", {}).get("state"), "hub_id": drone.get("location", {}).get("hub_id")})
    updated = await database.drones.find_one({"_id": drone["_id"]})
    return {"drone": serialize(updated)}


@router.delete("/api/fleet/{drone_id}", tags=["Fleet"])
async def decommission_drone(
    drone_id: str,
    user: dict[str, Any] = Depends(require_role("admin", "state_manager", "hub_manager")),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    drone = await database.drones.find_one({"drone_id": drone_id})
    if not drone or drone.get("decommissioned_at"):
        raise error(404, "Drone not found", "DRONE_NOT_FOUND")
    require_scope(user, drone.get("location", {}).get("state"), drone.get("location", {}).get("hub_id"))
    if drone.get("current_delivery_id") or drone.get("current_mission_id"):
        raise error(409, "Drone with an active delivery cannot be decommissioned", "DRONE_IN_USE")
    now = utc_now()
    await database.drones.update_one({"_id": drone["_id"]}, {"$set": {"status": "offline", "decommissioned_at": now, "updated_at": now}})
    await write_audit(database, user, "DRONE_DECOMMISSIONED", "drone", drone_id, drone.get("status"), "offline", {"state": drone.get("location", {}).get("state"), "hub_id": drone.get("location", {}).get("hub_id")})
    return {"success": True, "message": "Drone decommissioned; operational record retained"}


@router.get("/api/fleet/{drone_id}/history", tags=["Fleet"], response_model=DroneHistoryResponse)
async def drone_history(
    drone_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, alias="pageSize", ge=1, le=200),
    database: AsyncIOMotorDatabase = Depends(get_database),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    drone = await database.drones.find_one({"drone_id": drone_id})
    if not drone:
        raise error(404, "Drone not found", "DRONE_NOT_FOUND")
    require_scope(user, drone.get("location", {}).get("state"), drone.get("location", {}).get("hub_id"))
    query = {"entity_type": "drone", "entity_id": drone_id}
    total = await database.audit_logs.count_documents(query)
    rows = await database.audit_logs.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(length=page_size)
    return {"history": [serialize(row) for row in rows], "pagination": pagination_payload(page, page_size, total)}


@router.get("/api/fleet/{drone_id}/location", tags=["Fleet", "Tracking"], response_model=DroneTelemetryResponse)
async def drone_location(drone_id: str, database: AsyncIOMotorDatabase = Depends(get_database), user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    drone = await database.drones.find_one({"drone_id": drone_id})
    if not drone:
        raise error(404, "Drone not found", "DRONE_NOT_FOUND")
    require_scope(user, drone.get("location", {}).get("state"), drone.get("location", {}).get("hub_id"))
    return {"drone_id": drone_id, "location": drone.get("telemetry_location") if drone.get("telemetry_received_at") else None, "last_seen": drone.get("last_seen"), "live_telemetry_available": bool(drone.get("telemetry_received_at"))}


@router.get("/api/fleet/{drone_id}/deliveries", tags=["Fleet", "Orders"])
async def drone_deliveries(
    drone_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, alias="pageSize", ge=1, le=200),
    database: AsyncIOMotorDatabase = Depends(get_database),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    drone = await database.drones.find_one({"drone_id": drone_id})
    if not drone:
        raise error(404, "Drone not found", "DRONE_NOT_FOUND")
    require_scope(user, drone.get("location", {}).get("state"), drone.get("location", {}).get("hub_id"))
    query = {"drone_id": drone_id}
    total = await database.orders.count_documents(query)
    rows = await database.orders.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(length=page_size)
    return {"orders": [serialize(row) for row in rows], "pagination": pagination_payload(page, page_size, total)}


@router.post("/api/orders", tags=["Orders"], response_model=OrderEnvelope)
async def create_order(
    payload: OrderCreate,
    request: Request,
    user: dict[str, Any] = Depends(require_role(*WRITE_ROLES)),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    require_scope(user, payload.pickup.state, payload.pickup.hub_id)
    require_scope(user, payload.delivery.state, payload.delivery.hub_id)
    for endpoint in (payload.pickup, payload.delivery):
        if endpoint.hub_id and not await database.hubs.find_one({"hub_id": endpoint.hub_id, "state": endpoint.state, "city": endpoint.city, "status": "active"}):
            raise error(400, "Pickup or delivery hub is invalid or inactive", "INVALID_HUB")
    now = utc_now()
    if payload.scheduled_at and payload.scheduled_at <= now:
        raise error(400, "Scheduled time must be in the future", "INVALID_SCHEDULE")
    if payload.drone_id:
        raise error(400, "Create the order first, then use the assign-drone operation after scheduling", "USE_ASSIGN_DRONE_OPERATION")
    order_id = payload.order_id or f"ORD-{now.year}-{uuid4().hex[:12].upper()}"
    document = {
        "order_id": order_id,
        "customer": {**payload.customer.model_dump(), "email": str(payload.customer.email).lower()},
        "pickup": payload.pickup.model_dump(),
        "delivery": payload.delivery.model_dump(),
        "package": payload.package.model_dump(),
        "status": "scheduled" if payload.scheduled_at else "pending",
        "drone_id": None,
        "scheduled_at": payload.scheduled_at,
        "estimated_delivery": None,
        "created_by": str(user["_id"]),
        "created_at": now,
        "updated_at": now,
        "timeline": [{"status": "scheduled" if payload.scheduled_at else "pending", "at": now, "user_id": str(user["_id"])}],
    }
    try:
        result = await database.orders.insert_one(document)
    except DuplicateKeyError as exc:
        raise error(409, "Order ID collision; retry the request", "DUPLICATE_ORDER") from exc
    document["_id"] = result.inserted_id
    await write_audit(database, user, "ORDER_CREATED", "order", order_id, None, document["status"], {"state": payload.pickup.state, "hub_id": payload.pickup.hub_id, "ip_address": request.client.host if request.client else "", "user_agent": request.headers.get("user-agent", "")})
    await queue_order_notification(database, document, document["status"])
    return {"order": serialize(document)}


@router.get("/api/orders", tags=["Orders"], response_model=OrderListEnvelope)
async def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, alias="pageSize", ge=1, le=200),
    status: str | None = None,
    database: AsyncIOMotorDatabase = Depends(get_database),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    query: dict[str, Any] = {}
    if status:
        if status not in TRANSITIONS:
            raise error(400, "Invalid order status", "INVALID_STATUS")
        query["status"] = status
    if user.get("role") != "admin":
        states = user.get("state_access", [])
        if "*" not in states:
            query["pickup.state"] = {"$in": states}
        hubs = user.get("hub_access", [])
        if hubs and "*" not in hubs:
            query["pickup.hub_id"] = {"$in": hubs}
        elif not states and not hubs:
            raise error(403, "User has no resource scope", "RESOURCE_ACCESS_DENIED")
    total = await database.orders.count_documents(query)
    rows = await database.orders.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(length=page_size)
    return {"orders": [serialize(row) for row in rows], "pagination": pagination_payload(page, page_size, total)}


@router.get("/api/orders/{order_id}", tags=["Orders"], response_model=OrderEnvelope)
async def read_order(order_id: str, database: AsyncIOMotorDatabase = Depends(get_database), user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return {"order": serialize(await get_order_for_user(database, order_id, user))}


@router.patch("/api/orders/{order_id}", tags=["Orders"], response_model=OrderEnvelope)
async def patch_order(
    order_id: str,
    payload: OrderUpdate,
    user: dict[str, Any] = Depends(require_role(*WRITE_ROLES)),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    order = await get_order_for_user(database, order_id, user)
    if order["status"] in {"cancelled", "delivered", "failed"}:
        raise error(409, "Terminal orders cannot be edited", "ORDER_TERMINAL")
    changes = payload.model_dump(exclude_unset=True)
    for endpoint_key in ("pickup", "delivery"):
        endpoint = changes.get(endpoint_key)
        if endpoint:
            require_scope(user, endpoint["state"], endpoint.get("hub_id"))
            if endpoint.get("hub_id") and not await database.hubs.find_one({"hub_id": endpoint["hub_id"], "state": endpoint["state"], "city": endpoint["city"], "status": "active"}):
                raise error(400, "Pickup or delivery hub is invalid or inactive", "INVALID_HUB")
    if not changes:
        return {"order": serialize(order)}
    changes["updated_at"] = utc_now()
    await database.orders.update_one({"_id": order["_id"]}, {"$set": changes})
    await write_audit(database, user, "ORDER_UPDATED", "order", order_id, None, {key: value for key, value in changes.items() if key != "updated_at"}, {"state": order["pickup"]["state"], "hub_id": order["pickup"].get("hub_id")})
    return {"order": serialize(await get_order(database, order_id))}


@router.post("/api/orders/{order_id}/schedule", tags=["Scheduling"], response_model=OrderEnvelope)
async def schedule_order(
    order_id: str,
    payload: ScheduleRequest,
    user: dict[str, Any] = Depends(require_role(*WRITE_ROLES)),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    order = await get_order_for_user(database, order_id, user)
    if payload.scheduled_at <= utc_now():
        raise error(400, "Scheduled time must be in the future", "INVALID_SCHEDULE")
    if order["status"] not in {"pending", "rescheduled"}:
        raise error(409, "Only pending or rescheduled orders can be scheduled", "ORDER_NOT_SCHEDULABLE")
    old = order.get("scheduled_at")
    order = await change_order_status(database, order, "scheduled", user, "ORDER_SCHEDULED", {"old_schedule": old, "new_schedule": payload.scheduled_at})
    await database.orders.update_one({"_id": order["_id"]}, {"$set": {"scheduled_at": payload.scheduled_at, "updated_at": utc_now()}})
    order["scheduled_at"] = payload.scheduled_at
    return {"order": serialize(order)}


@router.post("/api/orders/{order_id}/reschedule", tags=["Scheduling"], response_model=OrderEnvelope)
async def reschedule_order(
    order_id: str,
    payload: RescheduleRequest,
    user: dict[str, Any] = Depends(require_role(*WRITE_ROLES)),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    order = await get_order_for_user(database, order_id, user)
    if payload.scheduled_at <= utc_now():
        raise error(400, "Rescheduled time must be in the future", "INVALID_SCHEDULE")
    if order["status"] not in {"scheduled", "assigned", "on_hold"}:
        raise error(409, "Order cannot be rescheduled from its current status", "ORDER_NOT_RESCHEDULABLE")
    old_schedule = order.get("scheduled_at")
    now = utc_now()
    changed = await database.orders.update_one(
        {"_id": order["_id"], "status": order["status"]},
        {"$set": {"status": "rescheduled", "scheduled_at": payload.scheduled_at, "updated_at": now},
         "$push": {"reschedules": {"old_schedule": old_schedule, "new_schedule": payload.scheduled_at, "reason": payload.reason, "user_id": str(user["_id"]), "created_at": now}}},
    )
    if changed.matched_count != 1:
        raise error(409, "Order changed concurrently", "ORDER_CONFLICT")
    if order.get("drone_id"):
        await database.drones.update_one({"drone_id": order["drone_id"], "current_delivery_id": order_id}, {"$set": {"status": "rescheduled", "updated_at": now}})
    await write_audit(database, user, "ORDER_RESCHEDULED", "order", order_id, old_schedule, payload.scheduled_at, {"reason": payload.reason, "state": order["pickup"]["state"], "hub_id": order["pickup"].get("hub_id")})
    updated = await get_order(database, order_id)
    await queue_order_notification(database, updated, "rescheduled")
    return {"order": serialize(updated)}


@router.post("/api/orders/{order_id}/assign-drone", tags=["Orders"], response_model=OrderEnvelope)
async def assign_order_drone(
    order_id: str,
    payload: AssignDroneRequest,
    user: dict[str, Any] = Depends(require_role(*WRITE_ROLES)),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    order = await get_order_for_user(database, order_id, user)
    if order["status"] not in {"scheduled", "rescheduled"} or not order.get("scheduled_at"):
        raise error(409, "Order must be scheduled before drone assignment", "ORDER_NOT_SCHEDULED")
    drone = await database.drones.find_one({"drone_id": payload.drone_id})
    if not drone:
        raise error(404, "Drone not found", "DRONE_NOT_FOUND")
    location = drone.get("location", {})
    require_scope(user, location.get("state"), location.get("hub_id"))
    if drone.get("status") != "available" or drone.get("decommissioned_at"):
        raise error(409, "Drone is unavailable, maintained, offline, or already assigned", "DRONE_UNAVAILABLE")
    pickup = order["pickup"]
    if pickup.get("hub_id") and location.get("hub_id") != pickup["hub_id"]:
        raise error(409, "Drone is not based at the pickup hub", "DRONE_LOCATION_MISMATCH")
    if location.get("state") != pickup["state"]:
        raise error(409, "Drone and pickup must be in the same operating state", "DRONE_LOCATION_MISMATCH")
    now = utc_now()
    reserved = await database.drones.find_one_and_update(
        {"_id": drone["_id"], "status": "available", "decommissioned_at": {"$exists": False}},
        {"$set": {"status": "assigned", "current_delivery_id": order_id, "assigned_operator_id": str(user["_id"]), "updated_at": now}},
        return_document=ReturnDocument.AFTER,
    )
    if reserved is None:
        raise error(409, "Drone was assigned concurrently", "DRONE_UNAVAILABLE")
    updated = await database.orders.update_one(
        {"_id": order["_id"], "drone_id": None, "status": {"$in": ["scheduled", "rescheduled"]}},
        {
            "$set": {"drone_id": payload.drone_id, "status": "assigned", "updated_at": now},
            "$push": {"timeline": {"status": "assigned", "at": now, "user_id": str(user["_id"]), "drone_id": payload.drone_id}},
        },
    )
    if updated.matched_count != 1:
        await database.drones.update_one({"_id": drone["_id"], "current_delivery_id": order_id}, {"$set": {"status": "available", "current_delivery_id": None, "assigned_operator_id": None, "updated_at": utc_now()}})
        raise error(409, "Order changed concurrently", "ORDER_CONFLICT")
    await write_audit(database, user, "DRONE_ASSIGNED", "order", order_id, None, payload.drone_id, {"state": pickup["state"], "hub_id": pickup.get("hub_id"), "drone_id": payload.drone_id})
    await write_audit(database, user, "DRONE_ASSIGNED", "drone", payload.drone_id, "available", "assigned", {"state": location.get("state"), "hub_id": location.get("hub_id"), "order_id": order_id})
    updated_order = await get_order(database, order_id)
    await queue_order_notification(database, updated_order, "assigned")
    return {"order": serialize(updated_order)}


@router.post("/api/orders/{order_id}/dispatch", tags=["Orders"], response_model=OrderEnvelope)
async def dispatch_order(
    order_id: str,
    user: dict[str, Any] = Depends(require_role(*WRITE_ROLES)),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    order = await get_order_for_user(database, order_id, user)
    if not order.get("drone_id") or not order.get("scheduled_at"):
        raise error(409, "Order requires a scheduled slot and drone assignment", "ORDER_NOT_READY")
    drone = await database.drones.find_one({"drone_id": order["drone_id"], "current_delivery_id": order_id})
    if not drone or drone.get("status") not in {"assigned", "scheduled"}:
        raise error(409, "Assigned drone is not dispatch-ready", "DRONE_NOT_READY")
    now = utc_now()
    changed = await database.orders.update_one(
        {"_id": order["_id"], "status": {"$in": ["assigned", "scheduled"]}, "drone_id": drone["drone_id"]},
        {"$set": {"status": "dispatched", "updated_at": now}, "$push": {"timeline": {"status": "dispatched", "at": now, "user_id": str(user["_id"])}}},
    )
    if changed.matched_count != 1:
        raise error(409, "Order changed concurrently", "ORDER_CONFLICT")
    await database.drones.update_one({"_id": drone["_id"], "status": {"$in": ["assigned", "scheduled"]}}, {"$set": {"status": "in_transit", "updated_at": now}})
    await write_audit(database, user, "ORDER_DISPATCHED", "order", order_id, "assigned", "dispatched", {"drone_id": drone["drone_id"], "state": order["pickup"]["state"]})
    updated_order = await get_order(database, order_id)
    await queue_order_notification(database, updated_order, "dispatched")
    return {"order": serialize(updated_order)}


@router.post("/api/orders/{order_id}/hold", tags=["Orders"], response_model=OrderEnvelope)
async def hold_order(
    order_id: str,
    payload: ReasonRequest,
    user: dict[str, Any] = Depends(require_role(*WRITE_ROLES)),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    order = await get_order_for_user(database, order_id, user)
    order = await change_order_status(database, order, "on_hold", user, "ORDER_HELD", {"reason": payload.reason, "state": order["pickup"]["state"]})
    return {"order": serialize(await get_order(database, order_id))}


@router.post("/api/orders/{order_id}/cancel", tags=["Orders"], response_model=CancelOrderResponse)
async def cancel_order(
    order_id: str,
    payload: ReasonRequest,
    user: dict[str, Any] = Depends(require_role(*WRITE_ROLES)),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    order = await get_order_for_user(database, order_id, user)
    if order["status"] == "in_transit" and user.get("role") != "admin":
        raise error(403, "Only an administrator may cancel an in-transit delivery", "CANCELLATION_RESTRICTED")
    order = await change_order_status(database, order, "cancelled", user, "ORDER_CANCELLED", {"reason": payload.reason, "state": order["pickup"]["state"]})
    now = utc_now()
    await database.orders.update_one({"_id": order["_id"]}, {"$set": {"cancellation_reason": payload.reason}, "$push": {"timeline": {"status": "cancelled", "at": now, "user_id": str(user["_id"]), "reason": payload.reason}}})
    payments = await database.payments.find({"order_id": order_id, "status": "paid"}).to_list(length=100)
    for payment in payments:
        await database.payments.update_one({"_id": payment["_id"], "status": "paid"}, {"$set": {"refund_status": "refund_required", "updated_at": now}})
        await database.refunds.update_one({"payment_id": payment["payment_id"], "status": {"$ne": "completed"}}, {"$setOnInsert": {"refund_id": f"REF-{uuid4().hex[:16].upper()}", "payment_id": payment["payment_id"], "order_id": order_id, "amount": payment["amount"], "status": "requested", "reason": payload.reason, "created_at": now}}, upsert=True)
    return {"order": serialize(await get_order(database, order_id)), "refund_processing_required": bool(payments)}


@router.post("/api/orders/{order_id}/complete", tags=["Orders"], response_model=OrderEnvelope)
async def complete_order(
    order_id: str,
    user: dict[str, Any] = Depends(require_role(*WRITE_ROLES)),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    order = await get_order_for_user(database, order_id, user)
    if order["status"] != "in_transit":
        raise error(409, "Only in-transit orders can be completed", "ORDER_NOT_IN_TRANSIT")
    order = await change_order_status(database, order, "delivered", user, "ORDER_DELIVERED", {"state": order["pickup"]["state"]})
    return {"order": serialize(await get_order(database, order_id))}


@router.post("/api/orders/{order_id}/in-transit", tags=["Tracking"])
async def mark_order_in_transit(
    order_id: str,
    user: dict[str, Any] = Depends(require_role(*WRITE_ROLES)),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    order = await get_order_for_user(database, order_id, user)
    order = await change_order_status(database, order, "in_transit", user, "ORDER_IN_TRANSIT", {"state": order["pickup"]["state"]})
    return {"order": serialize(await get_order(database, order_id))}


@router.get("/api/orders/{order_id}/tracking", tags=["Tracking"], response_model=TrackingResponse)
async def track_order(order_id: str, database: AsyncIOMotorDatabase = Depends(get_database), user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    order = await get_order_for_user(database, order_id, user)
    drone = await database.drones.find_one({"drone_id": order.get("drone_id")}) if order.get("drone_id") else None
    telemetry_available = bool(drone and drone.get("telemetry_received_at") and drone.get("telemetry_location"))
    timeline = await database.audit_logs.find({"entity_type": "order", "entity_id": order_id}).sort("created_at", 1).to_list(length=500)
    drone_payload = None
    if drone:
        drone_payload = {
            "drone_id": drone["drone_id"], "battery": drone.get("battery"),
            "location": drone.get("telemetry_location") if telemetry_available else None,
            "last_seen": drone.get("last_seen"),
        }
    return {
        "order_id": order_id, "status": order["status"], "drone": drone_payload,
        "timeline": [{"action": row["action"], "status": row.get("new_value"), "at": row.get("created_at")} for row in timeline],
        "live_telemetry_available": telemetry_available,
    }


@router.post("/api/payments/create-order", tags=["Payments"])
async def create_payment_order(
    payload: PaymentCreateRequest,
    user: dict[str, Any] = Depends(require_role(*WRITE_ROLES)),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    order = await get_order_for_user(database, payload.order_id, user)
    if order["status"] in {"cancelled", "delivered", "failed"}:
        raise error(409, "Cannot charge a terminal order", "ORDER_TERMINAL")
    client = payment_client()
    payment_id = f"PAY-{utc_now().year}-{uuid4().hex[:12].upper()}"
    try:
        gateway_order = await asyncio.to_thread(client.order.create, data={
            "amount": payload.amount * 100, "currency": payload.currency,
            "receipt": payment_id, "notes": {"order_id": payload.order_id, "payment_id": payment_id},
        })
    except Exception as exc:
        logger.exception("Payment provider order creation failed")
        raise error(502, "Payment provider could not create the order", "PAYMENT_PROVIDER_ERROR") from exc
    now = utc_now()
    record = {
        "payment_id": payment_id, "order_id": payload.order_id, "amount": payload.amount,
        "currency": payload.currency, "method": payload.method, "gateway": "razorpay",
        "gateway_order_id": gateway_order["id"], "gateway_payment_id": None,
        "status": "created", "created_at": now, "paid_at": None,
    }
    await database.payments.insert_one(record)
    await write_audit(database, user, "PAYMENT_ORDER_CREATED", "payment", payment_id, None, "created", {"order_id": payload.order_id, "amount": payload.amount})
    return {"payment": {key: record.get(key) for key in ("payment_id", "order_id", "amount", "currency", "method", "gateway", "gateway_order_id", "gateway_payment_id", "status", "created_at", "paid_at")}, "gateway_order": {"id": gateway_order["id"], "amount": gateway_order["amount"], "currency": gateway_order["currency"]}, "key_id": get_settings().payment_key_id}


@router.post("/api/payments/verify", tags=["Payments"])
async def verify_payment(
    payload: PaymentVerifyRequest,
    user: dict[str, Any] = Depends(require_role(*WRITE_ROLES)),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    payment = await database.payments.find_one({"payment_id": payload.payment_id, "gateway_order_id": payload.gateway_order_id})
    if not payment:
        raise error(404, "Payment reference not found", "PAYMENT_NOT_FOUND")
    await get_order_for_user(database, payment["order_id"], user)
    client = payment_client()
    try:
        await asyncio.to_thread(client.utility.verify_payment_signature, {
            "razorpay_order_id": payload.gateway_order_id,
            "razorpay_payment_id": payload.gateway_payment_id,
            "razorpay_signature": payload.gateway_signature,
        })
        gateway_payment = await asyncio.to_thread(client.payment.fetch, payload.gateway_payment_id)
    except Exception as exc:
        logger.warning("Payment signature or gateway lookup rejected")
        raise error(400, "Payment verification failed", "PAYMENT_VERIFICATION_FAILED") from exc
    if gateway_payment.get("order_id") != payload.gateway_order_id or int(gateway_payment.get("amount", 0)) != payment["amount"] * 100:
        raise error(400, "Gateway payment does not match this payment order", "PAYMENT_MISMATCH")
    status = "paid" if gateway_payment.get("status") == "captured" else "authorized" if gateway_payment.get("status") == "authorized" else "failed"
    now = utc_now()
    await database.payments.update_one({"_id": payment["_id"], "status": {"$in": ["created", "pending"]}}, {"$set": {"gateway_payment_id": payload.gateway_payment_id, "status": status, "paid_at": now if status == "paid" else None, "updated_at": now}})
    safe_transaction = {"payment_id": payment["payment_id"], "gateway_payment_id": payload.gateway_payment_id, "status": status, "method": gateway_payment.get("method"), "created_at": now}
    await database.payment_transactions.insert_one(safe_transaction)
    await write_audit(database, user, "PAYMENT_VERIFIED", "payment", payment["payment_id"], payment["status"], status, {"order_id": payment["order_id"]})
    updated = await database.payments.find_one({"_id": payment["_id"]})
    return {"success": status == "paid", "payment": {key: updated.get(key) for key in ("payment_id", "order_id", "amount", "currency", "method", "gateway", "gateway_order_id", "gateway_payment_id", "status", "created_at", "paid_at")}}


@router.post("/api/payments/webhook", tags=["Payments"], response_model=WebhookResponse)
async def payment_webhook(
    request: Request,
    x_razorpay_signature: str | None = Header(default=None),
    x_razorpay_event_id: str | None = Header(default=None),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    secret = get_settings().payment_webhook_secret
    if not secret or not x_razorpay_signature:
        raise error(503, "Payment webhook verification is not configured", "WEBHOOK_NOT_CONFIGURED")
    body = await request.body()
    expected = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, x_razorpay_signature):
        raise error(400, "Invalid webhook signature", "INVALID_WEBHOOK_SIGNATURE")
    try:
        event_data = json.loads(body)
        event = event_data.get("event", "")
        entity = event_data.get("payload", {}).get("payment", {}).get("entity", {})
    except (json.JSONDecodeError, AttributeError) as exc:
        raise error(400, "Invalid webhook payload", "INVALID_WEBHOOK") from exc
    if x_razorpay_event_id:
        try:
            await database.payment_transactions.insert_one({
                "webhook_event_id": x_razorpay_event_id,
                "event": event,
                "created_at": utc_now(),
                "signature_verified": True,
            })
        except DuplicateKeyError:
            return {"success": True, "duplicate": True}
    gateway_payment_id = entity.get("id")
    gateway_order_id = entity.get("order_id")
    payment = await database.payments.find_one({"gateway_order_id": gateway_order_id}) if gateway_order_id else None
    if payment:
        if int(entity.get("amount", 0)) != payment["amount"] * 100 or entity.get("currency", "INR") != payment["currency"]:
            raise error(400, "Webhook payment does not match the expected amount and currency", "PAYMENT_MISMATCH")
        status = "paid" if event in {"payment.captured", "order.paid"} else "failed" if event == "payment.failed" else None
        if status:
            now = utc_now()
            await database.payments.update_one({"_id": payment["_id"], "status": {"$nin": ["refunded", "partially_refunded"]}}, {"$set": {"status": status, "gateway_payment_id": gateway_payment_id, "paid_at": now if status == "paid" else None, "updated_at": now}})
            await database.payment_transactions.insert_one({"payment_id": payment["payment_id"], "gateway_payment_id": gateway_payment_id, "status": status, "event": event, "created_at": now})
    await database.payment_transactions.insert_one({"event": event, "gateway_order_id": gateway_order_id, "gateway_payment_id": gateway_payment_id, "created_at": utc_now(), "signature_verified": True})
    return {"success": True}


@router.get("/api/payments/{payment_id}", tags=["Payments"])
async def get_payment(payment_id: str, database: AsyncIOMotorDatabase = Depends(get_database), user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    payment = await database.payments.find_one({"payment_id": payment_id})
    if not payment:
        raise error(404, "Payment not found", "PAYMENT_NOT_FOUND")
    await get_order_for_user(database, payment["order_id"], user)
    return {"payment": serialize(payment)}


@router.post("/api/payments/{payment_id}/refund", tags=["Payments"])
async def refund_payment(
    payment_id: str,
    payload: PaymentRefundRequest,
    user: dict[str, Any] = Depends(require_role("admin", "state_manager")),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    payment = await database.payments.find_one({"payment_id": payment_id})
    if not payment:
        raise error(404, "Payment not found", "PAYMENT_NOT_FOUND")
    await get_order_for_user(database, payment["order_id"], user)
    if payment["status"] not in {"paid", "partially_refunded"} or not payment.get("gateway_payment_id"):
        raise error(409, "Only confirmed gateway payments can be refunded", "PAYMENT_NOT_REFUNDABLE")
    prior_refunds = await database.refunds.find({"payment_id": payment_id, "status": {"$in": ["pending", "completed"]}}).to_list(length=1000)
    refunded_amount = sum(item.get("amount", 0) for item in prior_refunds)
    remaining_amount = payment["amount"] - refunded_amount
    amount = payload.amount or remaining_amount
    if amount > remaining_amount:
        raise error(400, "Refund exceeds the remaining refundable amount", "INVALID_REFUND_AMOUNT")
    client = payment_client()
    try:
        result = await asyncio.to_thread(client.payment.refund, payment["gateway_payment_id"], {"amount": amount * 100, "notes": {"reason": payload.reason}})
    except Exception as exc:
        logger.exception("Payment provider refund request failed")
        raise error(502, "Payment provider could not process the refund request", "REFUND_PROVIDER_ERROR") from exc
    now = utc_now()
    status = "refunded" if amount == remaining_amount else "partially_refunded"
    refund_id = f"REF-{uuid4().hex[:16].upper()}"
    refund = {"refund_id": refund_id, "payment_id": payment_id, "order_id": payment["order_id"], "amount": amount, "currency": payment["currency"], "gateway_refund_id": result.get("id"), "status": "completed" if result.get("status") == "processed" else "pending", "reason": payload.reason, "created_at": now}
    await database.refunds.insert_one(refund)
    if refund["status"] == "completed":
        await database.payments.update_one({"_id": payment["_id"]}, {"$set": {"status": status, "updated_at": now}})
    await write_audit(database, user, "REFUND_REQUESTED", "payment", payment_id, payment["status"], refund["status"], {"refund_id": refund_id, "amount": amount})
    return {"refund": serialize(refund), "message": "Refund state reflects the payment provider response"}
