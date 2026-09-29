# IndoWings Fleet Management API

FastAPI backend for the fleet and delivery mission API. MongoDB is the source of truth; API operations fail with `503` when it is unavailable instead of returning fabricated data.

## Windows PowerShell Startup

Start MongoDB first and make sure it accepts connections at `mongodb://localhost:27017`.

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
Copy-Item .env.example .env
pip install -r requirements.txt
```

Edit `.env` and replace `JWT_SECRET_KEY` with a unique random secret before starting the API. Generate one in PowerShell with:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Paste that generated value into `backend/.env`. The example placeholder is deliberately rejected by the API. Restart any already-running Uvicorn process after changing the key; the local `.env` is ignored by Git.

Seed or migrate the fleet and demo records once MongoDB is running:

```powershell
python seed.py
```

The idempotent migration upgrades the former 700 four-digit RPAV records in place, preserves mission/order drone references, and seeds IDs `RPAV-000001` through `RPAV-001000` with unique serial numbers. It adds operations hubs and locations across all Indian states and union territories, plus sample orders. Run it again safely to verify it does not duplicate seeded records.

Start the service:

```powershell
python -m uvicorn app.main:app --host 0.0.0.0 --port 4000 --reload
```

The API listens on `http://localhost:4000`; Swagger is at `http://localhost:4000/docs` and the OpenAPI document is at `http://localhost:4000/openapi.json`. Run the frontend from the repository root with `npm run dev`; Vite serves port `3000` and proxies relative `/api/*` requests to this service.

## Authentication

`POST /api/auth/login` returns a short-lived JWT and an opaque refresh token. Refresh tokens are stored only as hashes, rotate on use, and revoke the previous access-token generation. Logout revokes the session. Seeded email-only demo login is allowed only when `APP_ENV=development`; production users need a bcrypt password hash. Role and state/hub scope checks are applied to resource reads and writes.

Demo accounts:

| Email | Role |
| --- | --- |
| `admin@indowings.com` | admin |
| `dispatcher@indowings.com` | dispatcher |
| `operator@indowings.com` | operator |
| `state.manager@indowings.com` | state_manager |
| `hub.manager@indowings.com` | hub_manager |

## API Routes

| Method | Route | Access |
| --- | --- | --- |
| `GET` | `/health` | Public; returns `503` when MongoDB is disconnected |
| `POST` | `/api/auth/login` | Public |
| `GET` | `/api/auth/demo-accounts` | Public |
| `GET` | `/api/auth/me` | Bearer token |
| `POST` | `/api/auth/logout`, `/api/auth/refresh`, `/api/auth/change-password` | Bearer token except refresh |
| `GET` | `/api/fleet?page=1&pageSize=100` | Bearer token; state/hub scoped |
| `GET` | `/api/fleet/{drone_id}` | Bearer token; scoped |
| `POST` | `/api/fleet` | Admin, state manager, hub manager |
| `PATCH` | `/api/fleet/{drone_id}` | Admin, state manager, hub manager |
| `DELETE` | `/api/fleet/{drone_id}` | Admin, state manager, hub manager; soft decommission |
| `GET` | `/api/fleet/{drone_id}/history`, `/location`, `/deliveries` | Bearer token; scoped |
| `GET` | `/api/locations/states`, `/cities`, `/hubs`, `/hubs/{hub_id}` | Bearer token; scoped |
| `GET` | `/api/orders?page=1&pageSize=20` | Bearer token; scoped |
| `POST` | `/api/orders` | Authenticated operations roles |
| `GET`, `PATCH` | `/api/orders/{order_id}` | Bearer token / operations roles |
| `POST` | `/api/orders/{order_id}/schedule`, `/reschedule`, `/assign-drone` | Authenticated operations roles |
| `POST` | `/api/orders/{order_id}/dispatch`, `/in-transit`, `/hold`, `/cancel`, `/complete` | Authenticated operations roles; transition validated |
| `GET` | `/api/orders/{order_id}/tracking` | Bearer token; reports telemetry availability |
| `GET` | `/api/missions?page=1&pageSize=20` | Bearer token |
| `POST` | `/api/missions` | Admin, dispatcher, operator |
| `PATCH` | `/api/missions/{id}/status` | Admin, dispatcher, operator |
| `GET` | `/api/audit-logs?page=1&pageSize=50` | Admin or authorized regional scope |
| `GET` | `/api/stats` | Public; calculated from MongoDB drone records |
| `POST` | `/api/contact/demo-request` | Public |
| `POST` | `/api/payments/create-order`, `/verify`, `/webhook` | Authenticated payment operations / signed provider webhook |
| `GET` | `/api/payments/{payment_id}` | Bearer token; order scoped |
| `POST` | `/api/payments/{payment_id}/refund` | Admin or state manager; confirmed gateway payment only |

Order and mission state changes are validated server-side and audited. Drone assignment is reserved atomically. Tracking never fabricates GPS coordinates: `live_telemetry_available` remains false until an authenticated telemetry integration writes an actual fix. Order events create queued notification records; this API does not claim email or SMS delivery.

Payments use the Razorpay SDK only when `PAYMENT_PROVIDER=razorpay`, key ID, key secret, and webhook secret are configured. Verification fetches the gateway payment server-side, webhook signatures and event IDs are validated, and refunds are recorded only according to the provider response. No card data, CVV, UPI PIN, or bank credentials are stored. Without provider credentials, payment creation fails with `503` rather than returning a fake payment.

Run backend integration tests with MongoDB running:

```powershell
pip install -r requirements-dev.txt
$env:JWT_SECRET_KEY = 'a-local-test-secret-with-at-least-32-bytes'
python -m unittest discover -s tests -v
```

The current frontend's operations UI uses relative `/api/*` routes through Vite. Legacy customer-account/OTP/profile, feedback, chatbot identity-verification, and expert-request features still reference `/api/delivery/*`; those paths are not implemented by this Fleet API and require a separate provider or a future migration. They are no longer directed to a hardcoded backend port.