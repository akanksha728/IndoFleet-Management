import os
import hashlib
import hmac
import json
import unittest
import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import Mock, patch

import jwt
from fastapi.testclient import TestClient
from pymongo import MongoClient

os.environ.setdefault("JWT_SECRET_KEY", "integration-test-secret-key-at-least-32-bytes-long")

from app.core.config import get_settings
from app.core.security import hash_password
from app.main import app


class OperationsApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.mongo = MongoClient(get_settings().mongodb_url, serverSelectionTimeoutMS=1500)
        try:
            cls.mongo.admin.command("ping")
        except Exception as exc:
            cls.mongo.close()
            raise unittest.SkipTest(f"MongoDB is unavailable: {exc}") from exc
        cls.database = cls.mongo[get_settings().mongodb_database]
        cls.client = TestClient(app, raise_server_exceptions=False)
        cls.client.__enter__()
        cls.session_ids: set[str] = set()
        cls.test_order_ids: set[str] = set()
        cls.test_drone_ids: set[str] = set()
        cls.test_user_ids: set[str] = set()
        cls.test_webhook_event_ids: set[str] = set()
        cls.test_contact_emails: set[str] = set()
        cls.admin = cls.login("admin@indowings.com")
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin['token']}"}

    @classmethod
    def tearDownClass(cls) -> None:
        if hasattr(cls, "database"):
            if cls.test_order_ids:
                payment_ids = cls.database.payments.distinct("payment_id", {"order_id": {"$in": list(cls.test_order_ids)}})
                if payment_ids:
                    cls.database.payment_transactions.delete_many({"payment_id": {"$in": payment_ids}})
                cls.database.orders.delete_many({"order_id": {"$in": list(cls.test_order_ids)}})
                cls.database.payments.delete_many({"order_id": {"$in": list(cls.test_order_ids)}})
                cls.database.refunds.delete_many({"order_id": {"$in": list(cls.test_order_ids)}})
                cls.database.notifications.delete_many({"entity_id": {"$in": list(cls.test_order_ids)}})
            if cls.test_webhook_event_ids:
                cls.database.payment_transactions.delete_many({"webhook_event_id": {"$in": list(cls.test_webhook_event_ids)}})
            if cls.test_contact_emails:
                cls.database.contact_requests.delete_many({"email": {"$in": list(cls.test_contact_emails)}})
            if cls.test_drone_ids:
                cls.database.drones.delete_many({"drone_id": {"$in": list(cls.test_drone_ids)}})
            if cls.test_user_ids:
                cls.database.users.delete_many({"_id": {"$in": list(cls.test_user_ids)}})
            if cls.session_ids:
                cls.database.sessions.delete_many({"_id": {"$in": list(cls.session_ids)}})
            touched = list(cls.test_order_ids | cls.test_drone_ids)
            if touched:
                cls.database.audit_logs.delete_many({"entity_id": {"$in": touched}})
            cls.client.__exit__(None, None, None)
            cls.mongo.close()

    @classmethod
    def login(cls, email: str, password: str | None = None) -> dict:
        response = cls.client.post("/api/auth/login", json={"email": email, "password": password})
        if response.status_code == 200:
            claims = jwt.decode(response.json()["token"], options={"verify_signature": False})
            if claims.get("sid"):
                cls.session_ids.add(claims["sid"])
        return response.json() if response.status_code == 200 else {"_status": response.status_code, "_body": response.json()}

    def create_order(self, order_id: str) -> dict:
        self.test_order_ids.add(order_id)
        response = self.client.post("/api/orders", headers=self.admin_headers, json={
            "order_id": order_id,
            "customer": {"name": "API Test Customer", "email": "api-test@example.com", "phone": "9999999999"},
            "pickup": {"address": "New Delhi Hub", "city": "New Delhi", "state": "Delhi", "hub_id": "DEL-HUB-001"},
            "delivery": {"address": "Noida Sector 18", "city": "Noida", "state": "Uttar Pradesh", "hub_id": "NOI-HUB-001"},
            "package": {"description": "Test parcel", "weight": 1.25},
        })
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["order"]

    def test_health_and_authenticated_fleet(self) -> None:
        health = self.client.get("/health")
        self.assertEqual(health.status_code, 200, health.text)
        self.assertEqual(health.json()["database"], "connected")
        unauthorized = self.client.get("/api/fleet")
        self.assertEqual(unauthorized.status_code, 401)
        fleet = self.client.get("/api/fleet?page=1&pageSize=1000", headers=self.admin_headers)
        self.assertEqual(fleet.status_code, 200, fleet.text)
        self.assertEqual(fleet.json()["pagination"]["total"], 1000)
        self.assertEqual(fleet.json()["fleet"][-1]["drone_id"], "RPAV-001000")
        stats = self.client.get("/api/stats")
        self.assertEqual(stats.status_code, 200, stats.text)
        self.assertEqual(stats.json()["summary"]["total"], 1000)
        audit = self.client.get("/api/audit-logs", headers=self.admin_headers)
        self.assertEqual(audit.status_code, 200, audit.text)

    def test_validation_response_does_not_echo_credentials(self) -> None:
        response = self.client.post("/api/auth/login", json={"email": "not-an-email", "password": "never-echo-this-secret"})
        self.assertEqual(response.status_code, 422)
        self.assertNotIn("never-echo-this-secret", response.text)

    def test_refresh_rotation_and_logout_revocation(self) -> None:
        session = self.login("admin@indowings.com")
        self.assertIn("refresh_token", session)
        refreshed = self.client.post("/api/auth/refresh", json={"refresh_token": session["refresh_token"]})
        self.assertEqual(refreshed.status_code, 200, refreshed.text)
        old_access = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {session['token']}"})
        self.assertEqual(old_access.status_code, 401)
        replay = self.client.post("/api/auth/refresh", json={"refresh_token": session["refresh_token"]})
        self.assertEqual(replay.status_code, 401)
        headers = {"Authorization": f"Bearer {refreshed.json()['token']}"}
        logout = self.client.post("/api/auth/logout", headers=headers)
        self.assertEqual(logout.status_code, 200, logout.text)
        revoked = self.client.get("/api/auth/me", headers=headers)
        self.assertEqual(revoked.status_code, 401)

    def test_locations_and_hub_scope(self) -> None:
        states = self.client.get("/api/locations/states", headers=self.admin_headers)
        self.assertEqual(states.status_code, 200, states.text)
        self.assertGreaterEqual(len(states.json()["states"]), 36)
        self.assertTrue(self.client.get("/api/locations/hubs?state=Maharashtra", headers=self.admin_headers).json()["hubs"])
        suffix = uuid.uuid4().hex[:8]
        user_id = f"scope-test-{suffix}"
        self.test_user_ids.add(user_id)
        self.database.users.insert_one({
            "_id": user_id, "name": "Kerala State Manager", "email": f"scope-{suffix}@example.com",
            "role": "state_manager", "password_hash": hash_password("state-manager-test-password"),
            "state_access": ["Kerala"], "hub_access": [], "permissions": ["orders:read"], "status": "active",
        })
        scoped = self.login(f"scope-{suffix}@example.com", "state-manager-test-password")
        scoped_headers = {"Authorization": f"Bearer {scoped['token']}"}
        self.assertEqual(self.client.get("/api/locations/hubs?state=Delhi", headers=scoped_headers).status_code, 403)
        self.assertEqual(self.client.get("/api/locations/hubs?state=Kerala", headers=scoped_headers).status_code, 200)
        fleet = self.client.get("/api/fleet?pageSize=1000", headers=scoped_headers)
        self.assertEqual(fleet.status_code, 200, fleet.text)
        self.assertTrue(all(item["location"]["state"] == "Kerala" for item in fleet.json()["fleet"]))

    def test_drone_create_duplicate_update_and_soft_delete(self) -> None:
        drone_id = f"RPAV-{uuid.uuid4().int % 900000 + 100000:06d}"
        serial_number = f"RPAV700-{drone_id[-6:]}"
        self.test_drone_ids.add(drone_id)
        body = {
            "drone_id": drone_id, "serial_number": serial_number,
            "location": {"state": "Uttar Pradesh", "city": "Noida", "hub_id": "NOI-HUB-001", "latitude": 28.5355, "longitude": 77.3910},
        }
        created = self.client.post("/api/fleet", headers=self.admin_headers, json=body)
        self.assertEqual(created.status_code, 200, created.text)
        duplicate = self.client.post("/api/fleet", headers=self.admin_headers, json=body)
        self.assertEqual(duplicate.status_code, 409)
        duplicate_serial = {**body, "drone_id": f"RPAV-{(int(drone_id[-6:]) + 1):06d}"}
        self.assertEqual(self.client.post("/api/fleet", headers=self.admin_headers, json=duplicate_serial).status_code, 409)
        updated = self.client.patch(f"/api/fleet/{drone_id}", headers=self.admin_headers, json={"battery": 87})
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual(updated.json()["drone"]["battery"], 87)
        deleted = self.client.delete(f"/api/fleet/{drone_id}", headers=self.admin_headers)
        self.assertEqual(deleted.status_code, 200, deleted.text)
        self.assertEqual(self.client.get(f"/api/fleet/{drone_id}", headers=self.admin_headers).status_code, 404)

    def test_order_lifecycle_tracking_and_duplicate_guard(self) -> None:
        order_id = f"ORD-TEST-{uuid.uuid4().hex[:12].upper()}"
        order = self.create_order(order_id)
        duplicate = self.client.post("/api/orders", headers=self.admin_headers, json={
            "order_id": order_id,
            "customer": {"name": "API Test Customer", "email": "api-test@example.com", "phone": "9999999999"},
            "pickup": {"address": "New Delhi Hub", "city": "New Delhi", "state": "Delhi", "hub_id": "DEL-HUB-001"},
            "delivery": {"address": "Noida Sector 18", "city": "Noida", "state": "Uttar Pradesh", "hub_id": "NOI-HUB-001"},
            "package": {"description": "Test parcel", "weight": 1.25},
        })
        self.assertEqual(duplicate.status_code, 409)
        scheduled_at = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
        scheduled = self.client.post(f"/api/orders/{order_id}/schedule", headers=self.admin_headers, json={"scheduled_at": scheduled_at})
        self.assertEqual(scheduled.status_code, 200, scheduled.text)
        unavailable = self.client.post(f"/api/orders/{order_id}/assign-drone", headers=self.admin_headers, json={"drone_id": "RPAV-000001"})
        self.assertEqual(unavailable.status_code, 409)
        assignment = self.client.post(f"/api/orders/{order_id}/assign-drone", headers=self.admin_headers, json={"drone_id": "RPAV-000037"})
        self.assertEqual(assignment.status_code, 200, assignment.text)
        dispatch = self.client.post(f"/api/orders/{order_id}/dispatch", headers=self.admin_headers)
        self.assertEqual(dispatch.status_code, 200, dispatch.text)
        tracking = self.client.get(f"/api/orders/{order_id}/tracking", headers=self.admin_headers)
        self.assertEqual(tracking.status_code, 200, tracking.text)
        self.assertFalse(tracking.json()["live_telemetry_available"])
        self.assertIsNone(tracking.json()["drone"]["location"])
        hold = self.client.post(f"/api/orders/{order_id}/hold", headers=self.admin_headers, json={"reason": "Test weather hold"})
        self.assertEqual(hold.status_code, 200, hold.text)
        reschedule = self.client.post(f"/api/orders/{order_id}/reschedule", headers=self.admin_headers, json={
            "scheduled_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(), "reason": "Test operational delay",
        })
        self.assertEqual(reschedule.status_code, 200, reschedule.text)
        scheduled_again = self.client.post(f"/api/orders/{order_id}/schedule", headers=self.admin_headers, json={
            "scheduled_at": (datetime.now(timezone.utc) + timedelta(days=1, hours=1)).isoformat(),
        })
        self.assertEqual(scheduled_again.status_code, 200, scheduled_again.text)
        cancelled = self.client.post(f"/api/orders/{order_id}/cancel", headers=self.admin_headers, json={"reason": "Test cleanup"})
        self.assertEqual(cancelled.status_code, 200, cancelled.text)
        self.assertEqual(cancelled.json()["order"]["status"], "cancelled")
        self.assertGreater(self.database.notifications.count_documents({"entity_id": order_id}), 0)
        persisted = self.database.orders.find_one({"order_id": order_id})
        self.assertGreaterEqual(len(persisted["timeline"]), 7)

    def test_delivery_completion_requires_in_transit(self) -> None:
        order_id = f"ORD-DONE-{uuid.uuid4().hex[:10].upper()}"
        self.create_order(order_id)
        scheduled = self.client.post(f"/api/orders/{order_id}/schedule", headers=self.admin_headers, json={
            "scheduled_at": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
        })
        self.assertEqual(scheduled.status_code, 200, scheduled.text)
        assignment = self.client.post(f"/api/orders/{order_id}/assign-drone", headers=self.admin_headers, json={"drone_id": "RPAV-000073"})
        self.assertEqual(assignment.status_code, 200, assignment.text)
        dispatched = self.client.post(f"/api/orders/{order_id}/dispatch", headers=self.admin_headers)
        self.assertEqual(dispatched.status_code, 200, dispatched.text)
        premature = self.client.post(f"/api/orders/{order_id}/complete", headers=self.admin_headers)
        self.assertEqual(premature.status_code, 409)
        in_transit = self.client.post(f"/api/orders/{order_id}/in-transit", headers=self.admin_headers)
        self.assertEqual(in_transit.status_code, 200, in_transit.text)
        delivered = self.client.post(f"/api/orders/{order_id}/complete", headers=self.admin_headers)
        self.assertEqual(delivered.status_code, 200, delivered.text)
        self.assertEqual(delivered.json()["order"]["status"], "delivered")

    def test_payment_routes_fail_closed_without_gateway(self) -> None:
        response = self.client.post("/api/payments/create-order", headers=self.admin_headers, json={
            "order_id": "ORD-SEED-2026-000001", "amount": 1499, "currency": "INR", "method": "upi",
        })
        self.assertEqual(response.status_code, 503, response.text)

    def test_demo_accounts_and_contact_request(self) -> None:
        accounts = self.client.get("/api/auth/demo-accounts")
        self.assertEqual(accounts.status_code, 200, accounts.text)
        self.assertEqual(len(accounts.json()["accounts"]), 3)
        email = f"contact-{uuid.uuid4().hex[:10]}@example.com"
        self.test_contact_emails.add(email)
        submitted = self.client.post("/api/contact/demo-request", json={
            "name": "Demo Integration", "email": email, "drone_interest": "RPAV-700", "use_case": "Delivery",
        })
        self.assertEqual(submitted.status_code, 200, submitted.text)
        self.assertTrue(self.database.contact_requests.find_one({"email": email}))

    def test_payment_verification_webhook_and_refund_flow(self) -> None:
        order_id = f"ORD-PAY-{uuid.uuid4().hex[:10].upper()}"
        self.create_order(order_id)
        gateway = SimpleNamespace(
            order=SimpleNamespace(create=Mock(return_value={"id": "order_test_123", "amount": 149900, "currency": "INR"})),
            utility=SimpleNamespace(verify_payment_signature=Mock(return_value=None)),
            payment=SimpleNamespace(
                fetch=Mock(return_value={"id": "pay_test_123", "order_id": "order_test_123", "amount": 149900, "currency": "INR", "status": "captured", "method": "upi"}),
                refund=Mock(return_value={"id": "rfnd_test_123", "status": "processed"}),
            ),
        )
        settings = get_settings()
        previous_provider = settings.payment_provider
        previous_key_id = settings.payment_key_id
        previous_key_secret = settings.payment_key_secret
        previous_webhook_secret = settings.payment_webhook_secret
        settings.payment_provider = "razorpay"
        settings.payment_key_id = "rzp_test_key"
        settings.payment_key_secret = "gateway-test-secret"
        settings.payment_webhook_secret = "webhook-test-secret"
        try:
            with patch("app.routers.operations.payment_client", return_value=gateway):
                created = self.client.post("/api/payments/create-order", headers=self.admin_headers, json={
                    "order_id": order_id, "amount": 1499, "currency": "INR", "method": "upi",
                })
                self.assertEqual(created.status_code, 200, created.text)
                payment_id = created.json()["payment"]["payment_id"]
                verified = self.client.post("/api/payments/verify", headers=self.admin_headers, json={
                    "payment_id": payment_id,
                    "gateway_order_id": "order_test_123",
                    "gateway_payment_id": "pay_test_123",
                    "gateway_signature": "verified-by-provider-mock",
                })
                self.assertEqual(verified.status_code, 200, verified.text)
                self.assertEqual(verified.json()["payment"]["status"], "paid")

                event = {
                    "event": "payment.captured",
                    "payload": {"payment": {"entity": {
                        "id": "pay_test_123", "order_id": "order_test_123", "amount": 149900, "currency": "INR",
                    }}},
                }
                raw_body = json.dumps(event, separators=(",", ":")).encode()
                signature = hmac.new(b"webhook-test-secret", raw_body, hashlib.sha256).hexdigest()
                event_id = f"evt_test_{uuid.uuid4().hex}"
                self.test_webhook_event_ids.add(event_id)
                webhook_headers = {"X-Razorpay-Signature": signature, "X-Razorpay-Event-Id": event_id}
                webhook = self.client.post("/api/payments/webhook", content=raw_body, headers=webhook_headers)
                self.assertEqual(webhook.status_code, 200, webhook.text)
                duplicate = self.client.post("/api/payments/webhook", content=raw_body, headers=webhook_headers)
                self.assertEqual(duplicate.status_code, 200, duplicate.text)
                self.assertTrue(duplicate.json()["duplicate"])

                partial = self.client.post(f"/api/payments/{payment_id}/refund", headers=self.admin_headers, json={"amount": 500, "reason": "Partial test refund"})
                self.assertEqual(partial.status_code, 200, partial.text)
                excess = self.client.post(f"/api/payments/{payment_id}/refund", headers=self.admin_headers, json={"amount": 1000, "reason": "Over refund test"})
                self.assertEqual(excess.status_code, 400)
                remainder = self.client.post(f"/api/payments/{payment_id}/refund", headers=self.admin_headers, json={"reason": "Remaining test refund"})
                self.assertEqual(remainder.status_code, 200, remainder.text)
        finally:
            settings.payment_provider = previous_provider
            settings.payment_key_id = previous_key_id
            settings.payment_key_secret = previous_key_secret
            settings.payment_webhook_secret = previous_webhook_secret


if __name__ == "__main__":
    unittest.main()
