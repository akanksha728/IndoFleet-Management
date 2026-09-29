from datetime import datetime, timedelta, timezone
import hashlib
import secrets
from typing import Any

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import get_settings
from app.core.database import get_database

bearer_scheme = HTTPBearer(auto_error=False)
VALID_ROLES = {"admin", "state_manager", "hub_manager", "dispatcher", "operator", "viewer"}


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(user: dict[str, Any], session_id: str | None = None, session_version: int = 0) -> str:
    settings = get_settings()
    if not settings.jwt_secret_configured:
        raise HTTPException(
            status_code=503,
            detail={"error": "JWT_SECRET_KEY is not configured", "code": "AUTH_NOT_CONFIGURED"},
        )
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    claims = {"sub": str(user["_id"]), "role": user["role"], "exp": expires_at}
    if session_id:
        claims["sid"] = session_id
        claims["ver"] = session_version
    return jwt.encode(
        claims,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def create_session(database: AsyncIOMotorDatabase, user: dict[str, Any], user_agent: str = "", ip_address: str = "") -> tuple[str, str]:
    settings = get_settings()
    session_id = secrets.token_urlsafe(24)
    refresh_token = secrets.token_urlsafe(48)
    now = datetime.now(timezone.utc)
    await database.sessions.insert_one({
        "_id": session_id,
        "user_id": str(user["_id"]),
        "token_hash": hash_refresh_token(refresh_token),
        "version": 0,
        "created_at": now,
        "expires_at": now + timedelta(days=settings.refresh_token_expire_days),
        "active": True,
        "user_agent": user_agent[:500],
        "ip_address": ip_address[:64],
    })
    return create_access_token(user, session_id), refresh_token


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    database: AsyncIOMotorDatabase = Depends(get_database),
) -> dict[str, Any]:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Authentication required", "code": "UNAUTHENTICATED"},
            headers={"WWW-Authenticate": "Bearer"},
        )
    settings = get_settings()
    if not settings.jwt_secret_configured:
        raise HTTPException(status_code=503, detail={"error": "Authentication is not configured", "code": "AUTH_NOT_CONFIGURED"})
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Invalid or expired token", "code": "INVALID_TOKEN"},
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    user = await database.users.find_one({"_id": user_id})
    if not user or user.get("role") not in VALID_ROLES or user.get("status", "active") != "active":
        raise HTTPException(status_code=401, detail={"error": "Invalid user", "code": "INVALID_TOKEN"})
    session_id = payload.get("sid")
    if session_id:
        session = await database.sessions.find_one({"_id": session_id, "user_id": str(user["_id"]), "active": True})
        if not session:
            raise HTTPException(status_code=401, detail={"error": "Session has been revoked", "code": "SESSION_REVOKED"})
        if payload.get("ver", 0) != session.get("version", 0):
            raise HTTPException(status_code=401, detail={"error": "Access token has been rotated", "code": "SESSION_TOKEN_ROTATED"})
        user["_session_id"] = session_id
    return user


def require_role(*roles: str):
    async def check_role(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        if user.get("role") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": "You do not have permission to perform this action", "code": "FORBIDDEN"},
            )
        return user

    return check_role