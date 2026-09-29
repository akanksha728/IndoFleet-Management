import unittest

from pydantic import ValidationError

from app.core.security import hash_password, verify_password
from app.core.config import Settings
from app.routers.api import TRANSITIONS
from app.schemas.api import MissionCreate, MissionStatusUpdate
from app.schemas.operations import ScheduleRequest


class ApiContractTests(unittest.TestCase):
    def test_current_command_center_mission_form_is_accepted(self) -> None:
        mission = MissionCreate(
            title="Urgent delivery",
            drone_model="Cyberone Pro",
            location_name="Noida",
            area_hectares=0,
        )
        self.assertEqual(mission.pickup.city, "Delhi")
        self.assertEqual(mission.delivery.city, "Noida")
        self.assertIsNotNone(mission.scheduled_at)

    def test_mission_status_is_restricted_to_contract_values(self) -> None:
        with self.assertRaises(ValidationError):
            MissionStatusUpdate(status="watching")

    def test_mission_transition_lifecycle(self) -> None:
        self.assertIn("assigned", TRANSITIONS["scheduled"])
        self.assertIn("on_hold", TRANSITIONS["in_transit"])
        self.assertIn("scheduled", TRANSITIONS["rescheduled"])
        self.assertNotIn("scheduled", TRANSITIONS["delivered"])

    def test_schedule_requires_timezone(self) -> None:
        with self.assertRaises(ValidationError):
            ScheduleRequest(scheduled_at="2026-10-01T12:00:00")

    def test_password_hash_is_not_plaintext_and_verifies(self) -> None:
        password = "local-test-password"
        password_hash = hash_password(password)
        self.assertNotEqual(password_hash, password)
        self.assertTrue(verify_password(password, password_hash))
        self.assertFalse(verify_password("wrong-password", password_hash))

    def test_jwt_requires_a_real_random_secret(self) -> None:
        self.assertFalse(Settings(jwt_secret_key="").jwt_secret_configured)
        self.assertFalse(Settings(jwt_secret_key="replace-with-a-long-random-secret-before-starting").jwt_secret_configured)
        self.assertFalse(Settings(jwt_secret_key="too-short").jwt_secret_configured)
        self.assertTrue(Settings(jwt_secret_key="a-real-random-secret-with-at-least-32-bytes").jwt_secret_configured)


if __name__ == "__main__":
    unittest.main()