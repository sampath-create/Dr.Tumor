import asyncio
from app.core.database import db, connect_to_mongo, close_mongo_connection
from app.core.security import get_password_hash
from app.schemas.user import UserRole

async def seed_data():
    await connect_to_mongo()
    print("Database connected. Seeding data...")

    users_collection = db.client["hospital_db"]["users"]
    
    # Clear existing users (optional)
    # await users_collection.delete_many({})

    password = get_password_hash("password123")

    users = [
        {"email": "admin@hospital.com", "full_name": "Admin User", "role": UserRole.ADMIN.value, "hashed_password": password},
        {"email": "doctor@hospital.com", "full_name": "Dr. Smith", "role": UserRole.DOCTOR.value, "hashed_password": password},
        {"email": "doctor2@hospital.com", "full_name": "Dr. House", "role": UserRole.DOCTOR.value, "hashed_password": password},
        {"email": "patient@hospital.com", "full_name": "John Doe", "role": UserRole.PATIENT.value, "hashed_password": password},
        {"email": "lab@hospital.com", "full_name": "Lab Tech verify", "role": UserRole.LAB_TECHNICIAN.value, "hashed_password": password},
        {"email": "pharmacy@hospital.com", "full_name": "Pharma Staff", "role": UserRole.PHARMACY.value, "hashed_password": password},
    ]

    for user in users:
        existing = await users_collection.find_one({"email": user["email"]})
        if not existing:
            await users_collection.insert_one(user)
            print(f"Created user: {user['email']}")
        else:
            print(f"User already exists: {user['email']}")

    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(seed_data())
