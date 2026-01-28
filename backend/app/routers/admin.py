from fastapi import APIRouter, Depends
from app.auth.dependencies import require_role
from app.core.database import get_database
from app.schemas.user import UserRole

router = APIRouter()

# Public stats endpoint (no auth required) for landing page
@router.get("/public-stats")
async def get_public_stats(db = Depends(get_database)):
    """Public statistics for the landing/login page - no authentication required"""
    patients_count = await db["users"].count_documents({"role": UserRole.PATIENT.value})
    doctors_count = await db["users"].count_documents({"role": UserRole.DOCTOR.value})
    completed_lab_requests = await db["lab_requests"].count_documents({"status": "completed"})
    
    return {
        "patients": patients_count,
        "doctors": doctors_count,
        "lab_reports_analyzed": completed_lab_requests,
        "accuracy_rate": 98  # This could be calculated from actual data if available
    }

@router.get("/stats")
async def get_system_stats(
    db = Depends(get_database),
    current_user = Depends(require_role(UserRole.ADMIN))
):
    # 1. User Role Distribution
    user_role_pipeline = [
        {"$group": {"_id": "$role", "count": {"$sum": 1}}}
    ]
    user_roles_data = await db["users"].aggregate(user_role_pipeline).to_list(length=None)
    # Format for frontend: [{"name": "doctor", "value": 10}, ...]
    user_stats = [{"name": item["_id"].title().replace("_", " "), "value": item["count"]} for item in user_roles_data]

    # 2. Appointment Status Distribution
    appt_status_pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    appt_status_data = await db["appointments"].aggregate(appt_status_pipeline).to_list(length=None)
    appointment_stats = [{"name": item["_id"].title(), "value": item["count"]} for item in appt_status_data]

    # 3. Simple Counts (Legacy support + quick stats cards)
    total_users = await db["users"].count_documents({})
    total_appointments = await db["appointments"].count_documents({})
    completed_appointments = await db["appointments"].count_documents({"status": "completed"})
    
    # 4. Lab Requests Stats
    lab_status_pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    lab_status_data = await db["lab_requests"].aggregate(lab_status_pipeline).to_list(length=None)
    lab_stats = [{"name": item["_id"].title(), "value": item["count"]} for item in lab_status_data]

    total_prescriptions = await db["prescriptions"].count_documents({})
    dispensed_prescriptions = await db["prescriptions"].count_documents({"is_dispensed": True})

    return {
        "overview": {
            "total_users": total_users,
            "total_appointments": total_appointments,
            "completed_appointments": completed_appointments,
            "total_prescriptions": total_prescriptions,
            "dispensed_prescriptions": dispensed_prescriptions,
            "revnue": completed_appointments * 50 # Mock revenue: $50 per completed appointment
        },
        "charts": {
            "user_roles": user_stats,
            "appointment_status": appointment_stats,
            "lab_requests": lab_stats
        }
    }
