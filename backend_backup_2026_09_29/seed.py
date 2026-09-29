import asyncio
from datetime import datetime, timedelta, timezone

from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import get_settings

INDIA_HUBS = [
    ("Delhi", "New Delhi", "DEL-HUB-001", 28.6139, 77.2090),
    ("Andhra Pradesh", "Visakhapatnam", "VIZ-HUB-001", 17.6868, 83.2185),
    ("Arunachal Pradesh", "Itanagar", "ITA-HUB-001", 27.0844, 93.6053),
    ("Assam", "Guwahati", "GUW-HUB-001", 26.1445, 91.7362),
    ("Bihar", "Patna", "PAT-HUB-001", 25.5941, 85.1376),
    ("Chhattisgarh", "Raipur", "RAI-HUB-001", 21.2514, 81.6296),
    ("Goa", "Panaji", "PAN-HUB-001", 15.4909, 73.8278),
    ("Gujarat", "Ahmedabad", "AHM-HUB-001", 23.0225, 72.5714),
    ("Haryana", "Gurugram", "GUR-HUB-001", 28.4595, 77.0266),
    ("Himachal Pradesh", "Shimla", "SHI-HUB-001", 31.1048, 77.1734),
    ("Jharkhand", "Ranchi", "RAN-HUB-001", 23.3441, 85.3096),
    ("Karnataka", "Bengaluru", "BEN-HUB-001", 12.9716, 77.5946),
    ("Kerala", "Kochi", "KOC-HUB-001", 9.9312, 76.2673),
    ("Madhya Pradesh", "Bhopal", "BHO-HUB-001", 23.2599, 77.4126),
    ("Maharashtra", "Mumbai", "MUM-HUB-001", 19.0760, 72.8777),
    ("Manipur", "Imphal", "IMP-HUB-001", 24.8170, 93.9368),
    ("Meghalaya", "Shillong", "SHI-ME-HUB-001", 25.5788, 91.8933),
    ("Mizoram", "Aizawl", "AIZ-HUB-001", 23.7271, 92.7176),
    ("Nagaland", "Kohima", "KOH-HUB-001", 25.6751, 94.1086),
    ("Odisha", "Bhubaneswar", "BHU-HUB-001", 20.2961, 85.8245),
    ("Punjab", "Ludhiana", "LUD-HUB-001", 30.9010, 75.8573),
    ("Rajasthan", "Jaipur", "JAI-HUB-001", 26.9124, 75.7873),
    ("Sikkim", "Gangtok", "GAN-HUB-001", 27.3389, 88.6065),
    ("Tamil Nadu", "Chennai", "CHE-HUB-001", 13.0827, 80.2707),
    ("Telangana", "Hyderabad", "HYD-HUB-001", 17.3850, 78.4867),
    ("Tripura", "Agartala", "AGA-HUB-001", 23.8315, 91.2868),
    ("Uttar Pradesh", "Noida", "NOI-HUB-001", 28.5355, 77.3910),
    ("Uttarakhand", "Dehradun", "DEH-HUB-001", 30.3165, 78.0322),
    ("West Bengal", "Kolkata", "KOL-HUB-001", 22.5726, 88.3639),
    ("Andaman and Nicobar Islands", "Port Blair", "PBL-HUB-001", 11.6234, 92.7265),
    ("Chandigarh", "Chandigarh", "CHA-HUB-001", 30.7333, 76.7794),
    ("Dadra and Nagar Haveli and Daman and Diu", "Daman", "DAM-HUB-001", 20.3974, 72.8328),
    ("Jammu and Kashmir", "Srinagar", "SRI-HUB-001", 34.0837, 74.7973),
    ("Ladakh", "Leh", "LEH-HUB-001", 34.1526, 77.5771),
    ("Lakshadweep", "Kavaratti", "KAV-HUB-001", 10.5667, 72.6417),
    ("Puducherry", "Puducherry", "PUD-HUB-001", 11.9416, 79.8083),
]

DEMO_USERS = [
    ("demo-admin", "Vikramaditya Sharma", "admin@indowings.com", "admin"),
    ("demo-dispatcher", "Dispatcher", "dispatcher@indowings.com", "dispatcher"),
    ("demo-operator", "Fleet Operator", "operator@indowings.com", "operator"),
    ("demo-viewer", "Fleet Viewer", "viewer@indowings.com", "viewer"),
    ("legacy-pilot", "Aarav Rathore", "pilot@indowings.com", "operator"),
    ("legacy-dispatcher", "Rohan Verma", "defense@indowings.com", "dispatcher"),
    ("legacy-viewer", "Ananya Deshmukh", "auditor@indowings.com", "viewer"),
    ("demo-state-manager", "State Operations Manager", "state.manager@indowings.com", "state_manager"),
    ("demo-hub-manager", "Hub Operations Manager", "hub.manager@indowings.com", "hub_manager"),
]


async def seed() -> None:
    settings = get_settings()
    client = AsyncIOMotorClient(settings.mongodb_url, serverSelectionTimeoutMS=5000)
    try:
        await client.admin.command("ping")
        database = client[settings.mongodb_database]
        await database.users.create_index("email", unique=True)
        await database.drones.create_index("drone_id", unique=True)
        await database.drones.create_index("serial_number", unique=True, sparse=True)
        await database.drones.create_index("status")
        await database.drones.create_index([("location.state", 1), ("location.city", 1)])
        await database.locations.create_index([("state", 1), ("city", 1)])
        await database.hubs.create_index("hub_id", unique=True)
        await database.orders.create_index("order_id", unique=True)
        await database.orders.create_index("status")
        await database.orders.create_index("drone_id")
        await database.orders.create_index("scheduled_at")
        await database.missions.create_index("mission_id", unique=True)
        await database.missions.create_index("order_id", unique=True, sparse=True)
        await database.payments.create_index("payment_id", unique=True)
        await database.payments.create_index("status")
        await database.payment_transactions.create_index("webhook_event_id", unique=True, sparse=True)
        await database.sessions.create_index("token_hash", unique=True)
        await database.sessions.create_index("expires_at", expireAfterSeconds=0)
        await database.notifications.create_index([("status", 1), ("created_at", 1)])

        for user_id, name, email, role in DEMO_USERS:
            state_access = ["Kerala"] if role == "state_manager" else ["Uttar Pradesh"] if role == "hub_manager" else ["*"]
            hub_access = ["NOI-HUB-001"] if role == "hub_manager" else [] if role == "state_manager" else ["*"]
            await database.users.update_one(
                {"_id": user_id},
                {"$setOnInsert": {
                    "name": name,
                    "email": email,
                    "role": role,
                    "organization": "IndoWings",
                    "badge_id": user_id.upper(),
                    "password_hash": None,
                    "demo_login": True,
                    "phone": None,
                    "status": "active",
                    "created_at": datetime.now(timezone.utc),
                }, "$set": {
                    "state_access": state_access,
                    "hub_access": hub_access,
                    "permissions": ["fleet:read", "orders:read"] if role == "viewer" else ["fleet:read", "fleet:write", "orders:read", "orders:write"],
                }},
                upsert=True,
            )
            await database.users.update_one(
                {"_id": user_id, "password_hash": None},
                {"$set": {"demo_login": True}},
            )

        now = datetime.now(timezone.utc)
        for state, city, hub_id, latitude, longitude in INDIA_HUBS:
            location = {"country": "India", "state": state, "city": city}
            await database.locations.update_one(
                location,
                {"$setOnInsert": {**location, "created_at": now}},
                upsert=True,
            )
            await database.hubs.update_one(
                {"hub_id": hub_id},
                {
                    "$setOnInsert": {"hub_id": hub_id, "name": f"{city} Operations Hub", "state": state, "city": city, "status": "active", "country": "India", "created_at": now},
                    "$set": {"latitude": latitude, "longitude": longitude},
                },
                upsert=True,
            )

        for index in range(1, 1001):
            state, city, hub_id, latitude, longitude = INDIA_HUBS[(index - 1) % len(INDIA_HUBS)]
            drone_id = f"RPAV-{index:06d}"
            serial_number = f"RPAV700-{index:06d}"
            old_drone_id = f"RPAV-{index:04d}"
            seed_status = "assigned" if index == 1 else "in_transit" if index == 2 else "available"
            record = {
                "drone_id": drone_id,
                "name": f"RPAV {index:06d}",
                "model": "RPAV-700",
                "serial_number": serial_number,
                "status": seed_status,
                "location": {"country": "India", "state": state, "city": city, "hub_id": hub_id, "latitude": latitude, "longitude": longitude},
                "battery": 92,
                "current_delivery_id": None,
                "assigned_operator_id": None,
                "current_mission_id": "MIS-SEED-000001" if index == 1 else "MIS-SEED-000002" if index == 2 else None,
                "last_seen": None,
                "flight_hours": 0,
                "max_range_km": 35,
                "endurance_mins": 60,
                "created_at": now,
                "updated_at": now,
            }
            existing = await database.drones.find_one({"drone_id": old_drone_id}) if old_drone_id != drone_id else None
            if existing:
                await database.drones.update_one({"_id": existing["_id"]}, {"$set": record})
                await database.missions.update_many({"drone_id": old_drone_id}, {"$set": {"drone_id": drone_id}})
                await database.orders.update_many({"drone_id": old_drone_id}, {"$set": {"drone_id": drone_id}})
            else:
                await database.drones.update_one({"drone_id": drone_id}, {"$setOnInsert": record}, upsert=True)

        sample_missions = [
            {
                "_id": "seed-mission-1", "mission_id": "MIS-SEED-000001", "order_id": "ORD-SEED-000001",
                "pickup": {"address": "Connaught Place", "city": "Delhi", "state": "Delhi"},
                "delivery": {"address": "Sector 18", "city": "Noida", "state": "Uttar Pradesh"},
                "drone_id": "RPAV-000001", "status": "assigned", "scheduled_at": now + timedelta(hours=1),
                "estimated_delivery": now + timedelta(hours=2), "title": "Delhi to Noida delivery", "drone_model": "RPAV 700",
                "area_hectares": 0, "created_at": now, "updated_at": now,
            },
            {
                "_id": "seed-mission-2", "mission_id": "MIS-SEED-000002", "order_id": "ORD-SEED-000002",
                "pickup": {"address": "Fort Kochi", "city": "Kochi", "state": "Kerala"},
                "delivery": {"address": "Ernakulam", "city": "Kochi", "state": "Kerala"},
                "drone_id": "RPAV-000002", "status": "in_transit", "scheduled_at": now - timedelta(minutes=20),
                "estimated_delivery": now + timedelta(minutes=40), "title": "Kochi medical supplies", "drone_model": "RPAV 700",
                "area_hectares": 0, "created_at": now - timedelta(minutes=25), "updated_at": now,
            },
        ]
        for mission in sample_missions:
            await database.missions.update_one({"_id": mission["_id"]}, {"$setOnInsert": mission}, upsert=True)

        sample_orders = [
            {
                "_id": "seed-order-1", "order_id": "ORD-SEED-2026-000001",
                "customer": {"name": "Demo Customer", "email": "connect@indowings.com", "phone": "0000000000"},
                "pickup": {"address": "New Delhi Operations Hub", "city": "New Delhi", "state": "Delhi", "hub_id": "DEL-HUB-001"},
                "delivery": {"address": "Noida Sector 18", "city": "Noida", "state": "Uttar Pradesh", "hub_id": "NOI-HUB-001"},
                "package": {"description": "Medical supplies", "weight": 1.0}, "status": "pending",
                "drone_id": None, "scheduled_at": None, "estimated_delivery": None,
                "created_by": "system", "created_at": now, "updated_at": now,
                "timeline": [{"status": "pending", "at": now, "user_id": "system"}],
            },
            {
                "_id": "seed-order-2", "order_id": "ORD-SEED-2026-000002",
                "customer": {"name": "Demo Customer", "email": "connect@indowings.com", "phone": "0000000000"},
                "pickup": {"address": "Mumbai Operations Hub", "city": "Mumbai", "state": "Maharashtra", "hub_id": "MUM-HUB-001"},
                "delivery": {"address": "Mumbai Operations Hub", "city": "Mumbai", "state": "Maharashtra", "hub_id": "MUM-HUB-001"},
                "package": {"description": "Documents", "weight": 0.5}, "status": "scheduled",
                "drone_id": None, "scheduled_at": now + timedelta(days=1), "estimated_delivery": None,
                "created_by": "system", "created_at": now, "updated_at": now,
                "timeline": [{"status": "scheduled", "at": now, "user_id": "system"}],
            },
        ]
        for order in sample_orders:
            await database.orders.update_one({"_id": order["_id"]}, {"$setOnInsert": order}, upsert=True)

        seed_logs = [
            ("seed-audit-1", "MISSION_CREATED", "MIS-SEED-000001", "scheduled", "assigned"),
            ("seed-audit-2", "MISSION_DISPATCHED", "MIS-SEED-000002", "dispatched", "in_transit"),
        ]
        for log_id, action, entity_id, old_value, new_value in seed_logs:
            await database.audit_logs.update_one(
                {"_id": log_id},
                {"$setOnInsert": {
                    "user_id": "system", "user_email": "system", "role": "system", "action": action,
                    "entity_type": "mission", "entity_id": entity_id, "resource": f"mission:{entity_id}",
                    "old_value": old_value, "new_value": new_value, "metadata": {},
                    "created_at": now, "timestamp": now,
                }},
                upsert=True,
            )
        print("Seed complete: 1,000 RPAV drones, India-wide hubs, demo users, sample orders/missions, and audit logs.")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(seed())