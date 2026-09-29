import logging
import math
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from bson import ObjectId
from fastapi import APIRouter, Depends, Query, Request
from fastapi.encoders import jsonable_encoder
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.core.config import get_settings
from app.core.database import get_database
from app.core.security import VALID_ROLES, create_session, get_current_user, require_role, verify_password
from app.schemas.api import (
    AuditLogListResponse,
    ContactResponse,
    DemoAccountsResponse,
    DemoRequest,
    FleetResponse,
    HealthResponse,
    LoginRequest,
    LoginResponse,
    MissionCreate,
    MissionListResponse,
    MissionResponseEnvelope,
    MissionStatusUpdate,
    StatsResponse,
    UserResponseEnvelope,
)

logger = logging.getLogger(__name__)
router = APIRouter()
mission_router = APIRouter(prefix="/api/missions", tags=["Missions"])
fleet_router = APIRouter(prefix="/api/fleet", tags=["Fleet"])
audit_router = APIRouter(prefix="/api/audit-logs", tags=["Audit Logs"])
TRANSITIONS: dict[str, set[str]] = {
    "pending": {"scheduled", "cancelled", "failed"},
    "scheduled": {"assigned", "rescheduled", "cancelled", "failed"},
    "assigned": {"dispatched", "scheduled", "rescheduled", "cancelled", "failed"},
    "dispatched": {"in_transit", "on_hold", "cancelled", "failed"},
    "in_transit": {"on_hold", "delivered", "cancelled", "failed"},
    "on_hold": {"rescheduled", "cancelled", "failed"},
    "rescheduled": {"scheduled", "cancelled", "failed"},
    "delivered": set(),
    "cancelled": set(),
    "failed": set(),
}
DRONE_STATUS_BY_MISSION = {
    "pending": "assigned",
    "scheduled": "scheduled",
    "assigned": "assigned",
    "dispatched": "in_transit",
    "in_transit": "in_transit",
    "on_hold": "on_hold",
    "rescheduled": "rescheduled",
}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def serialize(document: dict[str, Any]) -> dict[str, Any]:
    result = dict(document)
    if isinstance(result.get("_id"), ObjectId):
        result["id"] = str(result.pop("_id"))
    else:
        result["id"] = str(result.pop("_id", result.get("id", "")))
    return jsonable_encoder(result)


def pagination_payload(page: int, page_size: int, total: int) -> dict[str, int]:
    return {"page": page, "pageSize": page_size, "total": total, "totalPages": math.ceil(total / page_size) if total else 0}


async def write_audit(
    database: AsyncIOMotorDatabase,
    user: dict[str, Any] | None,
    action: str,
    entity_type: str,
    entity_id: str,
    old_value: Any = None,
    new_value: Any = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    await database.audit_logs.insert_one({
        "user_id": str(user["_id"]) if user else "system",
        "user_email": user.get("email", "system") if user else "system",
        "ip_address": (metadata or {}).get("ip_address", ""),
        "user_agent": (metadata or {}).get("user_agent", ""),
        "role": user.get("role", "system") if user else "system",
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "resource": f"{entity_type}:{entity_id}",
        "old_value": old_value,
        "new_value": new_value,
        "metadata": metadata or {},
        "created_at": utc_now(),
        "timestamp": utc_now(),
    })


@router.post("/api/auth/login", tags=["Authentication"], response_model=LoginResponse)
async def login(payload: LoginRequest, request: Request, database: AsyncIOMotorDatabase = Depends(get_database)) -> dict[str, Any]:
    user = await database.users.find_one({"email": payload.email.lower()})
    if not user or user.get("role") not in VALID_ROLES or user.get("status", "active") != "active":
        raise HTTPException(status_code=401, detail={"error": "Invalid email or password", "code": "INVALID_CREDENTIALS"})
    password_hash = user.get("password_hash")
    demo_login = user.get("demo_login") and get_settings().app_env.lower() == "development" and payload.password is None
    if password_hash and (payload.password is None or not verify_password(payload.password, password_hash)):
        raise HTTPException(status_code=401, detail={"error": "Invalid email or password", "code": "INVALID_CREDENTIALS"})
    if not password_hash and not demo_login:
        raise HTTPException(status_code=401, detail={"error": "Invalid email or password", "code": "INVALID_CREDENTIALS"})
    if not get_settings().jwt_secret_configured:
        raise HTTPException(status_code=503, detail={"error": "Authentication is not configured", "code": "AUTH_NOT_CONFIGURED"})
    token, refresh_token = await create_session(
        database, user, request.headers.get("user-agent", ""), request.client.host if request.client else "",
    )
    await write_audit(database, user, "LOGIN", "user", str(user["_id"]), metadata={
        "source": "api", "ip_address": request.client.host if request.client else "",
        "user_agent": request.headers.get("user-agent", ""),
    })
    return {"token": token, "refresh_token": refresh_token, "user": {
        "id": str(user["_id"]), "name": user["name"], "full_name": user["name"],
        "email": user["email"], "role": user["role"], "organization": user.get("organization", "IndoWings"),
        "badge_id": user.get("badge_id", ""), "phone": user.get("phone"),
        "state_access": user.get("state_access", []), "hub_access": user.get("hub_access", []),
        "permissions": user.get("permissions", []), "status": user.get("status", "active"),
    }}


@router.get("/api/auth/demo-accounts", tags=["Authentication"], response_model=DemoAccountsResponse)
async def demo_accounts() -> dict[str, Any]:
    return {"accounts": [
        {"id": "demo-admin", "name": "Fleet Admin", "email": "admin@indowings.com", "role": "admin"},
        {"id": "demo-dispatcher", "name": "Dispatcher", "email": "dispatcher@indowings.com", "role": "dispatcher"},
        {"id": "demo-operator", "name": "Fleet Operator", "email": "operator@indowings.com", "role": "operator"},
    ]}


@router.get("/api/auth/me", tags=["Authentication"], response_model=UserResponseEnvelope)
async def current_session(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return {"user": {
        "id": str(user["_id"]), "name": user["name"], "full_name": user["name"],
        "email": user["email"], "role": user["role"], "organization": user.get("organization", "IndoWings"),
        "badge_id": user.get("badge_id", ""), "phone": user.get("phone"),
        "state_access": user.get("state_access", []), "hub_access": user.get("hub_access", []),
        "permissions": user.get("permissions", []), "status": user.get("status", "active"),
    }}


@fleet_router.get("", response_model=FleetResponse)
async def get_fleet(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, alias="pageSize", ge=1, le=1000),
    database: AsyncIOMotorDatabase = Depends(get_database),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    query: dict[str, Any] = {"decommissioned_at": {"$exists": False}}
    if user.get("role") != "admin":
        states = user.get("state_access", [])
        hubs = user.get("hub_access", [])
        if "*" not in states and states:
            query["location.state"] = {"$in": states}
        if "*" not in hubs and hubs:
            query["location.hub_id"] = {"$in": hubs}
        if not states and not hubs:
            raise HTTPException(status_code=403, detail={"error": "User has no resource scope", "code": "RESOURCE_ACCESS_DENIED"})
    rows = await database.drones.find(query).sort("drone_id", 1).skip((page - 1) * page_size).limit(page_size).to_list(length=page_size)
    total = await database.drones.count_documents(query)
    fleet = []
    for row in rows:
        drone = serialize(row)
        drone.update({
            "name": row.get("name", row["drone_id"].replace("-", " ")),
            "model": row.get("model", "RPAV 700"),
            "model_name": row.get("model", "RPAV 700"),
            "serial_number": row.get("serial_number", row["drone_id"]),
            "battery": row.get("battery", 100),
            "battery_pct": row.get("battery", 100),
            "status": row.get("status", "available"),
            "legacy_status": {"available": "ready", "in_transit": "in-flight", "offline": "standby"}.get(row.get("status"), row.get("status")),
            "flight_hours": row.get("flight_hours", 0),
            "max_range_km": row.get("max_range_km", 35),
            "endurance_mins": row.get("endurance_mins", 60),
            "current_mission_id": row.get("current_mission_id") or row.get("current_delivery_id"),
            "location": {
                **row.get("location", {}),
                "lat": row.get("location", {}).get("latitude", row.get("location", {}).get("lat", 0)),
                "lng": row.get("location", {}).get("longitude", row.get("location", {}).get("lng", 0)),
            },
        })
        fleet.append(drone)
    return {"fleet": fleet, "pagination": pagination_payload(page, page_size, total)}


@mission_router.get("", response_model=MissionListResponse)
async def get_missions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, alias="pageSize", ge=1, le=200),
    database: AsyncIOMotorDatabase = Depends(get_database),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    query: dict[str, Any] = {}
    if user.get("role") != "admin":
        states = user.get("state_access", [])
        hubs = user.get("hub_access", [])
        if "*" not in states and states:
            query["pickup.state"] = {"$in": states}
        if "*" not in hubs and hubs:
            query["pickup.hub_id"] = {"$in": hubs}
        elif not states and "*" not in hubs:
            raise HTTPException(status_code=403, detail={"error": "User has no resource scope", "code": "RESOURCE_ACCESS_DENIED"})
    total = await database.missions.count_documents(query)
    rows = await database.missions.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(length=page_size)
    missions = []
    for row in rows:
        mission = serialize(row)
        mission.update({
            "title": row.get("title", row.get("order_id", row["mission_id"])),
            "drone_model": row.get("drone_model", "RPAV 700"),
            "location_name": row.get("delivery", {}).get("city", ""),
            "area_hectares": row.get("area_hectares", 0),
            "pilot_email": row.get("pilot_email", ""),
            "legacy_status": {"dispatched": "ACTIVE", "in_transit": "ACTIVE", "delivered": "COMPLETED", "cancelled": "ABORTED", "failed": "ABORTED"}.get(row.get("status"), row.get("status", "").upper()),
        })
        missions.append(mission)
    return {"missions": missions, "pagination": pagination_payload(page, page_size, total)}


@mission_router.post("", response_model=MissionResponseEnvelope)
async def create_mission(
    payload: MissionCreate,
    database: AsyncIOMotorDatabase = Depends(get_database),
    user: dict[str, Any] = Depends(require_role("admin", "dispatcher", "operator")),
) -> dict[str, Any]:
    order_id = payload.order_id or f"ORD-{uuid4().hex[:12].upper()}"
    if await database.missions.find_one({"order_id": order_id}):
        raise HTTPException(status_code=409, detail={"error": "Order ID already exists", "code": "DUPLICATE_ORDER"})
    if payload.status not in {"pending", "scheduled"}:
        raise HTTPException(status_code=400, detail={"error": "A new mission must begin as pending or scheduled", "code": "INVALID_INITIAL_STATUS"})
    now = utc_now()
    mission_id = f"MIS-{now.year}-{uuid4().hex[:12].upper()}"
    reservation = {"$set": {"status": "assigned", "current_mission_id": mission_id, "updated_at": now}}
    if payload.drone_id:
        drone = await database.drones.find_one_and_update(
            {"drone_id": payload.drone_id, "status": "available"},
            reservation,
            return_document=ReturnDocument.AFTER,
        )
        if drone is None:
            if await database.drones.find_one({"drone_id": payload.drone_id}):
                raise HTTPException(status_code=409, detail={"error": "Drone is not available", "code": "DRONE_UNAVAILABLE"})
            raise HTTPException(status_code=404, detail={"error": "Drone not found", "code": "DRONE_NOT_FOUND"})
    else:
        drone = await database.drones.find_one_and_update(
            {"status": "available"},
            reservation,
            sort=[("drone_id", 1)],
            return_document=ReturnDocument.AFTER,
        )
    document = {
        "mission_id": mission_id,
        "order_id": order_id,
        "pickup": payload.pickup.model_dump(),
        "delivery": payload.delivery.model_dump(),
        "drone_id": drone["drone_id"] if drone else None,
        "status": "assigned" if drone else payload.status,
        "scheduled_at": payload.scheduled_at,
        "estimated_delivery": payload.estimated_delivery,
        "title": payload.title or order_id,
        "drone_model": drone.get("model", "RPAV 700") if drone else "RPAV 700",
        "area_hectares": payload.area_hectares or 0,
        "created_at": now,
        "updated_at": now,
    }
    try:
        result = await database.missions.insert_one(document)
    except DuplicateKeyError as exc:
        if drone:
            await database.drones.update_one(
                {"drone_id": drone["drone_id"], "current_mission_id": mission_id},
                {"$set": {"status": "available", "current_mission_id": None, "updated_at": utc_now()}},
            )
        raise HTTPException(status_code=409, detail={"error": "Order ID already exists", "code": "DUPLICATE_ORDER"}) from exc
    document["_id"] = result.inserted_id
    if drone:
        await write_audit(database, user, "DRONE_ASSIGNED", "drone", drone["drone_id"], None, mission_id)
    await write_audit(database, user, "MISSION_CREATED", "mission", mission_id, None, document["status"], {"order_id": order_id})
    mission = serialize(document)
    mission.update({"title": document["title"], "drone_model": document["drone_model"], "location_name": payload.delivery.city, "area_hectares": document["area_hectares"]})
    return {"mission": mission}


@mission_router.patch("/{mission_id}/status", response_model=MissionResponseEnvelope)
async def update_mission_status(
    mission_id: str,
    payload: MissionStatusUpdate,
    database: AsyncIOMotorDatabase = Depends(get_database),
    user: dict[str, Any] = Depends(require_role("admin", "dispatcher", "operator")),
) -> dict[str, Any]:
    identity: dict[str, Any] = {"mission_id": mission_id}
    if ObjectId.is_valid(mission_id):
        identity = {"$or": [{"mission_id": mission_id}, {"_id": ObjectId(mission_id)}]}
    mission = await database.missions.find_one(identity)
    if not mission:
        raise HTTPException(status_code=404, detail={"error": "Mission not found", "code": "MISSION_NOT_FOUND"})
    old_status = mission["status"]
    if payload.status == old_status or payload.status not in TRANSITIONS.get(old_status, set()):
        raise HTTPException(status_code=400, detail={"error": f"Cannot transition mission from {old_status} to {payload.status}", "code": "INVALID_TRANSITION"})
    now = utc_now()
    update: dict[str, Any] = {"status": payload.status, "updated_at": now}
    if payload.status == "rescheduled":
        update["rescheduled_at"] = now
    newly_assigned_drone = None
    if payload.status == "assigned" and not mission.get("drone_id"):
        newly_assigned_drone = await database.drones.find_one_and_update(
            {"status": "available"},
            {"$set": {"status": "assigned", "current_mission_id": mission["mission_id"], "updated_at": now}},
            sort=[("drone_id", 1)],
            return_document=ReturnDocument.AFTER,
        )
        if newly_assigned_drone is None:
            raise HTTPException(status_code=409, detail={"error": "No drone is available for assignment", "code": "NO_AVAILABLE_DRONE"})
        update["drone_id"] = newly_assigned_drone["drone_id"]
        update["drone_model"] = newly_assigned_drone.get("model", "RPAV 700")
    changed = await database.missions.update_one(
        {"_id": mission["_id"], "status": old_status},
        {"$set": update},
    )
    if changed.matched_count == 0:
        if newly_assigned_drone:
            await database.drones.update_one(
                {"drone_id": newly_assigned_drone["drone_id"], "current_mission_id": mission["mission_id"]},
                {"$set": {"status": "available", "current_mission_id": None, "updated_at": utc_now()}},
            )
        raise HTTPException(status_code=409, detail={"error": "Mission status changed concurrently", "code": "MISSION_CONFLICT"})
    drone_id = mission.get("drone_id") or (newly_assigned_drone["drone_id"] if newly_assigned_drone else None)
    if drone_id:
        if payload.status in {"delivered", "cancelled", "failed"}:
            await database.drones.update_one(
                {"drone_id": drone_id},
                {"$set": {"status": "available", "current_mission_id": None, "updated_at": now}},
            )
        elif payload.status in DRONE_STATUS_BY_MISSION:
            await database.drones.update_one(
                {"drone_id": drone_id},
                {"$set": {"status": DRONE_STATUS_BY_MISSION[payload.status], "updated_at": now}},
            )
    action = {
        "dispatched": "MISSION_DISPATCHED", "on_hold": "MISSION_HELD", "rescheduled": "MISSION_RESCHEDULED",
        "cancelled": "MISSION_CANCELLED", "delivered": "MISSION_DELIVERED",
    }.get(payload.status, "MISSION_STATUS_CHANGED")
    if newly_assigned_drone:
        await write_audit(database, user, "DRONE_ASSIGNED", "drone", drone_id, None, mission["mission_id"])
    await write_audit(database, user, action, "mission", mission["mission_id"], old_status, payload.status)
    mission.update(update)
    serialized = serialize(mission)
    serialized.update({"title": mission.get("title", mission["order_id"]), "drone_model": mission.get("drone_model", "RPAV 700"), "location_name": mission.get("delivery", {}).get("city", ""), "area_hectares": mission.get("area_hectares", 0)})
    return {"success": True, "mission": serialized}


async def get_stats(database: AsyncIOMotorDatabase) -> dict[str, Any]:
    fleet_filter = {"decommissioned_at": {"$exists": False}}
    counts = {status: await database.drones.count_documents({**fleet_filter, "status": status}) for status in [
        "available", "assigned", "in_transit", "scheduled", "on_hold", "rescheduled", "maintenance", "offline",
    ]}
    return {
        "summary": {
            "total": await database.drones.count_documents(fleet_filter),
            "active": counts["assigned"] + counts["in_transit"],
            "ready": counts["available"],
            "scheduled": counts["scheduled"],
            "onHold": counts["on_hold"],
            "rescheduled": counts["rescheduled"],
            "maintenance": counts["maintenance"],
            "offline": counts["offline"],
            "available": counts["available"],
            "assigned": counts["assigned"],
            "inTransit": counts["in_transit"],
        },
        "chart": [
            {"label": "Available", "value": counts["available"]},
            {"label": "Assigned", "value": counts["assigned"]},
            {"label": "In Transit", "value": counts["in_transit"]},
            {"label": "Scheduled", "value": counts["scheduled"]},
            {"label": "On Hold", "value": counts["on_hold"]},
            {"label": "Maint.", "value": counts["maintenance"]},
            {"label": "Offline", "value": counts["offline"]},
        ],
    }


@audit_router.get("", response_model=AuditLogListResponse)
async def get_audit_logs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, alias="pageSize", ge=1, le=200),
    database: AsyncIOMotorDatabase = Depends(get_database),
    user: dict[str, Any] = Depends(require_role("admin", "state_manager", "hub_manager", "viewer")),
) -> dict[str, Any]:
    query: dict[str, Any] = {}
    if user.get("role") != "admin":
        clauses = []
        if user.get("state_access") and "*" not in user["state_access"]:
            clauses.append({"metadata.state": {"$in": user["state_access"]}})
        if user.get("hub_access") and "*" not in user["hub_access"]:
            clauses.append({"metadata.hub_id": {"$in": user["hub_access"]}})
        if not clauses and not ("*" in user.get("state_access", []) or "*" in user.get("hub_access", [])):
            raise HTTPException(status_code=403, detail={"error": "User has no audit scope", "code": "RESOURCE_ACCESS_DENIED"})
        if clauses:
            query["$or"] = clauses
    total = await database.audit_logs.count_documents(query)
    rows = await database.audit_logs.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(length=page_size)
    logs = []
    for row in rows:
        log = serialize(row)
        log.update({
            "user_email": row.get("user_email", "system"), "role": row.get("role", "system"),
            "resource": row.get("resource", f"{row.get('entity_type', '')}:{row.get('entity_id', '')}"),
            "ip_address": row.get("metadata", {}).get("ip_address", ""),
            "severity": "INFO", "timestamp": row.get("created_at", row.get("timestamp")),
        })
        logs.append(log)
    return {"logs": logs, "pagination": pagination_payload(page, page_size, total)}


@router.get("/api/stats", tags=["Statistics"], response_model=StatsResponse)
async def stats_alias(database: AsyncIOMotorDatabase = Depends(get_database)) -> dict[str, Any]:
    return await get_stats(database)


@router.post("/api/contact/demo-request", tags=["Contact"], response_model=ContactResponse)
async def submit_demo_request(payload: DemoRequest, database: AsyncIOMotorDatabase = Depends(get_database)) -> dict[str, Any]:
    await database.contact_requests.insert_one({**payload.model_dump(), "email": str(payload.email).lower(), "created_at": utc_now(), "status": "new"})
    return {"success": True, "message": "Demo request submitted successfully"}


@router.get("/health", tags=["Health"], response_model=HealthResponse)
async def health(request: Request) -> Any:
    client = getattr(request.app.state, "mongo_client", None)
    try:
        if client is None:
            raise RuntimeError("Mongo client is not connected")
        await client.admin.command("ping")
        return {"status": "ok", "service": "IndoWings Fleet API", "database": "connected"}
    except Exception:
        from fastapi.responses import JSONResponse

        return JSONResponse(status_code=503, content={"status": "degraded", "service": "IndoWings Fleet API", "database": "disconnected"})


router.include_router(fleet_router)
router.include_router(mission_router)
router.include_router(audit_router)