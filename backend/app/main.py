import logging
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.database import close_database, connect_database
from app.routers.api import router
from app.routers.operations import router as operations_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_database(app)
    yield
    await close_database(app)


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Razorpay-Signature", "X-Request-ID"],
)
app.include_router(router)
app.include_router(operations_router)

request_windows: dict[str, deque[float]] = defaultdict(deque)


@app.middleware("http")
async def security_and_rate_limit(request: Request, call_next):
    now = time.monotonic()
    client_id = request.client.host if request.client else "unknown"
    window = request_windows[client_id]
    while window and now - window[0] >= settings.rate_limit_window_seconds:
        window.popleft()
    if request.method != "OPTIONS" and len(window) >= settings.rate_limit_requests:
        return JSONResponse(
            status_code=429,
            content={"success": False, "error": "Too many requests", "code": "RATE_LIMITED"},
            headers={"Retry-After": str(settings.rate_limit_window_seconds)},
        )
    if request.method != "OPTIONS":
        window.append(now)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response


@app.exception_handler(HTTPException)
async def http_error_handler(request: Request, exc: HTTPException) -> JSONResponse:
    detail: Any = exc.detail
    if isinstance(detail, dict):
        error = detail.get("error", "Request failed")
        code = detail.get("code", "HTTP_ERROR")
    else:
        error = str(detail)
        code = "HTTP_ERROR"
    return JSONResponse(status_code=exc.status_code, content={"success": False, "error": error, "code": code}, headers=exc.headers)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    details = [
        {"loc": item.get("loc", []), "msg": item.get("msg", "Invalid value"), "type": item.get("type", "validation_error")}
        for item in exc.errors()
    ]
    return JSONResponse(status_code=422, content={
        "success": False,
        "error": "Request validation failed",
        "code": "VALIDATION_ERROR",
        "details": details,
    })


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled API exception", exc_info=exc)
    return JSONResponse(status_code=500, content={"success": False, "error": "Internal server error", "code": "INTERNAL_SERVER_ERROR"})