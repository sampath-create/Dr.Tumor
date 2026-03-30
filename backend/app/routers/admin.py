from fastapi import APIRouter, Depends, HTTPException
from app.auth.dependencies import require_role
from app.core.database import get_database
from app.models.user import UserRole
from bson import ObjectId

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
            "revenue": completed_appointments * 100 # Revenue: Rs.100 per completed patient appointment
        },
        "charts": {
            "user_roles": user_stats,
            "appointment_status": appointment_stats,
            "lab_requests": lab_stats
        }
    }

@router.get("/users/{user_id}/dashboard")
async def get_user_dashboard(
    user_id: str,
    db = Depends(get_database),
    current_user = Depends(require_role(UserRole.ADMIN))
):
    try:
        obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    user = await db["users"].find_one({"_id": obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_id_str = str(user["_id"])
    role = user.get("role")

    appointment_query = {}
    prescription_query = {}
    lab_query = {}

    if role == UserRole.PATIENT.value:
        appointment_query = {"patient_id": user_id_str}
        prescription_query = {"patient_id": user_id_str}
        lab_query = {"patient_id": user_id_str}
    elif role == UserRole.DOCTOR.value:
        appointment_query = {"doctor_id": user_id_str}
        prescription_query = {"doctor_id": user_id_str}
        lab_query = {"doctor_id": user_id_str}
    elif role == UserRole.LAB_TECHNICIAN.value:
        lab_query = {"technician_id": user_id_str}

    total_appointments = await db["appointments"].count_documents(appointment_query) if appointment_query else 0
    completed_appointments = await db["appointments"].count_documents({**appointment_query, "status": "completed"}) if appointment_query else 0

    total_prescriptions = await db["prescriptions"].count_documents(prescription_query) if prescription_query else 0
    dispensed_prescriptions = await db["prescriptions"].count_documents({**prescription_query, "is_dispensed": True}) if prescription_query else 0

    total_lab_requests = await db["lab_requests"].count_documents(lab_query) if lab_query else 0
    completed_lab_requests = await db["lab_requests"].count_documents({**lab_query, "status": "completed"}) if lab_query else 0

    appt_status_data = []
    if appointment_query:
        appt_status_data = await db["appointments"].aggregate([
            {"$match": appointment_query},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]).to_list(length=None)

    rx_status_data = []
    if prescription_query:
        rx_status_data = await db["prescriptions"].aggregate([
            {"$match": prescription_query},
            {"$group": {"_id": "$is_dispensed", "count": {"$sum": 1}}}
        ]).to_list(length=None)

    lab_status_data = []
    if lab_query:
        lab_status_data = await db["lab_requests"].aggregate([
            {"$match": lab_query},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]).to_list(length=None)

    recent_appointments = []
    if appointment_query:
        recent_appointments = await db["appointments"].find(appointment_query).sort("date_time", -1).limit(5).to_list(5)
        for item in recent_appointments:
            item["id"] = str(item["_id"])

    recent_prescriptions = []
    if prescription_query:
        recent_prescriptions = await db["prescriptions"].find(prescription_query).sort("created_at", -1).limit(5).to_list(5)
        for item in recent_prescriptions:
            item["id"] = str(item["_id"])

    recent_lab_requests = []
    if lab_query:
        recent_lab_requests = await db["lab_requests"].find(lab_query).sort("created_at", -1).limit(5).to_list(5)
        for item in recent_lab_requests:
            item["id"] = str(item["_id"])

    return {
        "user": {
            "id": user_id_str,
            "full_name": user.get("full_name"),
            "email": user.get("email"),
            "role": user.get("role"),
            "is_verified": user.get("is_verified", False),
            "created_at": user.get("created_at"),
            "gender": user.get("gender"),
            "height": user.get("height"),
            "weight": user.get("weight"),
            "sleep_routine": user.get("sleep_routine"),
            "verification_document": user.get("verification_document"),
            "last_login_at": user.get("last_login_at"),
            "last_login_ip": user.get("last_login_ip"),
            "login_count": user.get("login_count", 0),
        },
        "overview": {
            "total_appointments": total_appointments,
            "completed_appointments": completed_appointments,
            "total_prescriptions": total_prescriptions,
            "dispensed_prescriptions": dispensed_prescriptions,
            "total_lab_requests": total_lab_requests,
            "completed_lab_requests": completed_lab_requests,
        },
        "charts": {
            "appointment_status": [{"name": (item["_id"] or "unknown").title(), "value": item["count"]} for item in appt_status_data],
            "prescription_status": [{"name": "Dispensed" if item["_id"] else "Pending", "value": item["count"]} for item in rx_status_data],
            "lab_status": [{"name": (item["_id"] or "unknown").title().replace("_", " "), "value": item["count"]} for item in lab_status_data],
        },
        "recent_activity": {
            "appointments": recent_appointments,
            "prescriptions": recent_prescriptions,
            "lab_requests": recent_lab_requests,
        }
    }
