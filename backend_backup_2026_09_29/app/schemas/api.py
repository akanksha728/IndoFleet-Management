from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

MissionStatus = Literal[
    "pending", "scheduled", "assigned", "dispatched", "in_transit", "on_hold",
    "rescheduled", "delivered", "cancelled", "failed",
]
DroneStatus = Literal[
    "available", "assigned", "in_transit", "scheduled", "on_hold", "rescheduled",
    "maintenance", "offline",
]


class LoginRequest(BaseModel):
    email: EmailStr
    password: str | None = None


class Location(BaseModel):
    address: str = Field(min_length=1, max_length=300)
    city: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=1, max_length=100)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)


class MissionCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    order_id: str | None = Field(default=None, min_length=1, max_length=80)
    pickup: Location | None = None
    delivery: Location | None = None
    drone_id: str | None = None
    status: MissionStatus = "scheduled"
    scheduled_at: datetime | None = None
    estimated_delivery: datetime | None = None
    title: str | None = None
    drone_model: str | None = None
    location_name: str | None = None
    area_hectares: float | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def normalize_legacy_command_center_form(self) -> "MissionCreate":
        if self.pickup is None and self.delivery is None and self.location_name:
            destination = self.location_name.strip() or "Noida"
            self.pickup = Location(address="Delhi", city="Delhi", state="Delhi")
            self.delivery = Location(address=destination, city=destination, state="Uttar Pradesh")
        if self.pickup is None or self.delivery is None:
            raise ValueError("pickup and delivery are required")
        if self.scheduled_at is None:
            self.scheduled_at = datetime.now(timezone.utc)
        return self


class MissionStatusUpdate(BaseModel):
    status: MissionStatus


class DemoRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=40)
    organization: str | None = Field(default=None, max_length=160)
    drone_interest: str = Field(min_length=1, max_length=120)
    use_case: str | None = Field(default=None, max_length=300)
    message: str | None = Field(default=None, max_length=4000)


class Pagination(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, alias="pageSize", ge=1, le=200)


class UserResponse(BaseModel):
    id: str
    name: str
    full_name: str
    email: EmailStr
    role: Literal["admin", "state_manager", "hub_manager", "dispatcher", "operator", "viewer"]
    organization: str
    badge_id: str
    phone: str | None = None
    state_access: list[str] = Field(default_factory=list)
    hub_access: list[str] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)
    status: str = "active"


class LoginResponse(BaseModel):
    token: str
    refresh_token: str
    user: UserResponse


class DemoAccount(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: Literal["admin", "dispatcher", "operator"]


class DemoAccountsResponse(BaseModel):
    accounts: list[DemoAccount]


class UserResponseEnvelope(BaseModel):
    user: UserResponse


class PaginationResponse(BaseModel):
    page: int
    pageSize: int
    total: int
    totalPages: int


class MissionResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    mission_id: str
    order_id: str
    pickup: Location
    delivery: Location
    drone_id: str | None
    status: MissionStatus
    scheduled_at: datetime | None
    estimated_delivery: datetime | None = None
    created_at: datetime
    updated_at: datetime
    title: str
    drone_model: str
    location_name: str
    area_hectares: float


class MissionListResponse(BaseModel):
    missions: list[MissionResponse]
    pagination: PaginationResponse


class MissionResponseEnvelope(BaseModel):
    mission: MissionResponse
    success: bool | None = None


class DroneLocation(BaseModel):
    address: str | None = None
    city: str
    state: str
    lat: float
    lng: float


class DroneResponse(BaseModel):
    id: str
    drone_id: str
    name: str
    model: str
    model_name: str
    serial_number: str
    status: DroneStatus
    legacy_status: str
    location: DroneLocation
    battery: int
    battery_pct: int
    current_mission_id: str | None
    updated_at: datetime
    flight_hours: float
    max_range_km: float
    endurance_mins: int


class FleetResponse(BaseModel):
    fleet: list[DroneResponse]
    pagination: PaginationResponse


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    user_id: str
    user_email: str
    role: str
    action: str
    entity_type: str
    entity_id: str
    resource: str
    old_value: Any = None
    new_value: Any = None
    metadata: dict[str, Any]
    created_at: datetime
    timestamp: datetime
    ip_address: str = ""
    severity: str = "INFO"


class AuditLogListResponse(BaseModel):
    logs: list[AuditLogResponse]
    pagination: PaginationResponse


class StatItem(BaseModel):
    label: str
    value: int


class StatsSummary(BaseModel):
    total: int
    active: int
    ready: int
    scheduled: int
    onHold: int
    rescheduled: int
    maintenance: int
    offline: int
    available: int
    assigned: int
    inTransit: int


class StatsResponse(BaseModel):
    summary: StatsSummary
    chart: list[StatItem]


class ContactResponse(BaseModel):
    success: bool
    message: str


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    service: str
    database: Literal["connected", "disconnected"]