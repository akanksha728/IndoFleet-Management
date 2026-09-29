from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.schemas.api import DroneStatus, Location, MissionStatus


class Hub(BaseModel):
    hub_id: str
    name: str
    state: str
    city: str
    status: Literal["active", "inactive"] = "active"
    latitude: float | None = None
    longitude: float | None = None


class HubListResponse(BaseModel):
    hubs: list[Hub]


class HubEnvelope(BaseModel):
    hub: Hub


class StatesResponse(BaseModel):
    states: list[str]


class City(BaseModel):
    state: str
    city: str


class CitiesResponse(BaseModel):
    cities: list[City]


class DroneLocation(BaseModel):
    country: Literal["India"] = "India"
    state: str = Field(min_length=1, max_length=100)
    city: str = Field(min_length=1, max_length=100)
    hub_id: str = Field(min_length=1, max_length=80)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class DroneCreate(BaseModel):
    drone_id: str = Field(pattern=r"^RPAV-\d{6}$")
    model: str = "RPAV-700"
    serial_number: str = Field(pattern=r"^RPAV700-\d{6}$")
    status: DroneStatus = "available"
    location: DroneLocation
    battery: int = Field(default=100, ge=0, le=100)
    assigned_operator_id: str | None = None


class DroneUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: DroneStatus | None = None
    location: DroneLocation | None = None
    battery: int | None = Field(default=None, ge=0, le=100)
    assigned_operator_id: str | None = None


class DroneListResponse(BaseModel):
    fleet: list[dict[str, Any]]
    pagination: dict[str, int]


class DroneResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    drone_id: str
    model: str
    serial_number: str
    status: DroneStatus
    location: DroneLocation
    battery: int
    current_delivery_id: str | None = None
    assigned_operator_id: str | None = None
    last_seen: datetime | None = None
    created_at: datetime
    updated_at: datetime


class DroneEnvelope(BaseModel):
    drone: DroneResponse


class Customer(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=40)


class Address(BaseModel):
    country: Literal["India"] = "India"
    address: str = Field(min_length=1, max_length=300)
    city: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=1, max_length=100)
    hub_id: str | None = None


class Package(BaseModel):
    description: str = Field(min_length=1, max_length=300)
    weight: float = Field(gt=0, le=25)


class OrderCreate(BaseModel):
    order_id: str | None = Field(default=None, min_length=8, max_length=100)
    customer: Customer
    pickup: Address
    delivery: Address
    package: Package
    scheduled_at: datetime | None = None
    drone_id: str | None = None

    @field_validator("scheduled_at")
    @classmethod
    def scheduled_at_must_be_timezone_aware(cls, value: datetime | None) -> datetime | None:
        if value is not None and value.utcoffset() is None:
            raise ValueError("scheduled_at must include a timezone")
        return value


class OrderUpdate(BaseModel):
    customer: Customer | None = None
    pickup: Address | None = None
    delivery: Address | None = None
    package: Package | None = None


class ScheduleRequest(BaseModel):
    scheduled_at: datetime

    @field_validator("scheduled_at")
    @classmethod
    def scheduled_at_must_be_timezone_aware(cls, value: datetime) -> datetime:
        if value.utcoffset() is None:
            raise ValueError("scheduled_at must include a timezone")
        return value


class RescheduleRequest(ScheduleRequest):
    reason: str = Field(min_length=1, max_length=500)


class AssignDroneRequest(BaseModel):
    drone_id: str = Field(pattern=r"^RPAV-\d{6}$")


class ReasonRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=500)


class OrderResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    order_id: str
    customer: Customer
    pickup: Address
    delivery: Address
    package: Package
    status: MissionStatus
    drone_id: str | None = None
    scheduled_at: datetime | None = None
    estimated_delivery: datetime | None = None
    created_by: str
    created_at: datetime
    updated_at: datetime


class OrderEnvelope(BaseModel):
    order: OrderResponse
    success: bool | None = None


class OrderListResponse(BaseModel):
    orders: list[OrderResponse]
    pagination: dict[str, int]


class OrderListEnvelope(BaseModel):
    orders: list[OrderResponse]
    pagination: dict[str, int]


class RefreshResponse(BaseModel):
    token: str
    refresh_token: str


class TrackingResponse(BaseModel):
    order_id: str
    status: MissionStatus
    drone: dict[str, Any] | None = None
    timeline: list[dict[str, Any]]
    live_telemetry_available: bool


class PaymentVerificationResponse(BaseModel):
    success: bool
    payment: PaymentResponse


class PaymentDetailsEnvelope(BaseModel):
    payment: PaymentResponse


class RefundEnvelope(BaseModel):
    refund: dict[str, Any]
    message: str


class CancelOrderResponse(BaseModel):
    order: OrderResponse
    refund_processing_required: bool


class DroneHistoryResponse(BaseModel):
    history: list[dict[str, Any]]
    pagination: dict[str, int]


class DroneTelemetryResponse(BaseModel):
    drone_id: str
    location: dict[str, Any] | None = None
    last_seen: datetime | None = None
    live_telemetry_available: bool


class WebhookResponse(BaseModel):
    success: bool
    duplicate: bool = False


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=32, max_length=256)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=12, max_length=128)


class PaymentCreateRequest(BaseModel):
    order_id: str = Field(min_length=1, max_length=100)
    amount: int = Field(gt=0, le=10_000_000)
    currency: Literal["INR"] = "INR"
    method: Literal["upi", "credit_card", "debit_card", "netbanking", "wallet", "corporate"]


class PaymentVerifyRequest(BaseModel):
    payment_id: str
    gateway_order_id: str
    gateway_payment_id: str
    gateway_signature: str


class PaymentRefundRequest(BaseModel):
    amount: int | None = Field(default=None, gt=0)
    reason: str = Field(min_length=1, max_length=500)


class PaymentResponse(BaseModel):
    payment_id: str
    order_id: str
    amount: int
    currency: str
    method: str
    gateway: str
    gateway_order_id: str | None = None
    gateway_payment_id: str | None = None
    status: str
    created_at: datetime
    paid_at: datetime | None = None


class GatewayOrderResponse(BaseModel):
    payment: PaymentResponse
    gateway_order: dict[str, Any]
    key_id: str


class SuccessResponse(BaseModel):
    success: bool
    message: str
    data: dict[str, Any] | None = None
