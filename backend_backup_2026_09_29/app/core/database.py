import logging
from collections.abc import AsyncIterator

from fastapi import Request
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import get_settings

logger = logging.getLogger(__name__)


async def connect_database(app: object) -> None:
    settings = get_settings()
    app.state.mongo_client = None
    app.state.database = None
    try:
        client = AsyncIOMotorClient(settings.mongodb_url, serverSelectionTimeoutMS=3000)
        await client.admin.command("ping")
        database = client[settings.mongodb_database]
        await database.users.create_index("email", unique=True)
        await database.drones.create_index("serial_number", unique=True, sparse=True)
        await database.drones.create_index("drone_id", unique=True)
        await database.drones.create_index("status")
        await database.drones.create_index([("location.state", 1), ("location.city", 1)])
        await database.locations.create_index([("state", 1), ("city", 1)])
        await database.hubs.create_index("hub_id", unique=True)
        await database.orders.create_index("order_id", unique=True)
        await database.orders.create_index("status")
        await database.orders.create_index("drone_id")
        await database.orders.create_index("scheduled_at")
        await database.payments.create_index("payment_id", unique=True)
        await database.payments.create_index("status")
        await database.payment_transactions.create_index("created_at")
        await database.payment_transactions.create_index("webhook_event_id", unique=True, sparse=True)
        await database.refunds.create_index("refund_id", unique=True)
        await database.notifications.create_index([("status", 1), ("created_at", 1)])
        await database.sessions.create_index("token_hash", unique=True)
        await database.sessions.create_index("user_id")
        await database.sessions.create_index("expires_at", expireAfterSeconds=0)
        await database.missions.create_index("mission_id", unique=True)
        await database.missions.create_index("order_id", unique=True, sparse=True)
        await database.missions.create_index("status")
        await database.missions.create_index("drone_id")
        await database.missions.create_index("scheduled_at")
        await database.audit_logs.create_index("created_at")
        app.state.mongo_client = client
        app.state.database = database
    except Exception:
        logger.exception("MongoDB is unavailable; API will report degraded health")
        if "client" in locals():
            client.close()


async def close_database(app: object) -> None:
    client = getattr(app.state, "mongo_client", None)
    if client:
        client.close()


async def get_database(request: Request) -> AsyncIterator[AsyncIOMotorDatabase]:
    database = getattr(request.app.state, "database", None)
    if database is None:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=503,
            detail={"error": "Database is unavailable", "code": "DATABASE_UNAVAILABLE"},
        )
    yield database