from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from supabase import create_client
from dotenv import load_dotenv
import os
import secrets

# ---------------------------------------------------------
# ENVIRONMENT
# ---------------------------------------------------------

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError(
        "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from .env"
    )

supabase = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
)

# ---------------------------------------------------------
# FASTAPI
# ---------------------------------------------------------

app = FastAPI(
    title="CyberShield API",
    description="Adaptive Human Threat Defense Simulator",
    version="1.0"
)

# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# MODELS
# ---------------------------------------------------------

class CampaignRequest(BaseModel):
    target_role: str
    difficulty: str


# ---------------------------------------------------------
# ROLE TEMPLATES
# ---------------------------------------------------------

ROLE_TEMPLATES = {
    "payroll": {
        "subject": "Payment Verification Required",
        "body": """
This is a simulated payroll security awareness message.

A payment-related request requires verification.

This is a safe CyberShield simulation. No credentials are collected.
"""
    },

    "developer": {
        "subject": "Repository Security Verification",
        "body": """
This is a simulated developer security awareness message.

A repository-related security action appears to require attention.

This is a safe CyberShield simulation. No credentials are collected.
"""
    },

    "hr": {
        "subject": "Employee Data Verification",
        "body": """
This is a simulated HR security awareness message.

An employee-data related request requires verification.

This is a safe CyberShield simulation. No credentials are collected.
"""
    },

    "executive": {
        "subject": "Executive Security Request",
        "body": """
This is a simulated executive security awareness message.

An urgent business request requires verification.

This is a safe CyberShield simulation. No credentials are collected.
"""
    }
}


# ---------------------------------------------------------
# TRAINING MODULES
# ---------------------------------------------------------

ROLE_TRAINING = {
    "payroll": "Invoice & Payment Fraud",
    "developer": "Credential & Repository Security",
    "hr": "Employee Data Protection",
    "executive": "Executive Spear-Phishing Awareness"
}


# ---------------------------------------------------------
# ROOT
# ---------------------------------------------------------

@app.get("/")
def root():
    return {
        "status": "online",
        "message": "CyberShield API is running",
        "supabase": "connected"
    }


# ---------------------------------------------------------
# EMPLOYEES
# ---------------------------------------------------------

@app.get("/employees")
def get_employees():

    response = (
        supabase
        .table("employees")
        .select("*")
        .order("created_at")
        .execute()
    )

    return response.data


# ---------------------------------------------------------
# LAUNCH CAMPAIGN
# ---------------------------------------------------------

@app.post("/campaigns/launch")
def launch_campaign(request: CampaignRequest):

    role = request.target_role.lower()
    difficulty = request.difficulty.lower()

    if role not in ROLE_TEMPLATES:
        raise HTTPException(
            status_code=400,
            detail="Invalid target role"
        )

    if difficulty not in ["easy", "medium", "hard"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid difficulty"
        )

    template = ROLE_TEMPLATES[role]

    # -----------------------------------------------------
    # CREATE CAMPAIGN
    # -----------------------------------------------------

    campaign_response = (
        supabase
        .table("campaigns")
        .insert({
            "target_role": role,
            "difficulty": difficulty,
            "template_subject": template["subject"],
            "template_body": template["body"]
        })
        .execute()
    )

    if not campaign_response.data:
        raise HTTPException(
            status_code=500,
            detail="Campaign could not be created"
        )

    campaign = campaign_response.data[0]
    campaign_id = campaign["id"]

    # -----------------------------------------------------
    # FIND EMPLOYEES
    # -----------------------------------------------------

    employees_response = (
        supabase
        .table("employees")
        .select("*")
        .eq("role", role)
        .execute()
    )

    employees = employees_response.data

    links = []

    # -----------------------------------------------------
    # CREATE UNIQUE SIMULATION LINKS
    # -----------------------------------------------------

    for employee in employees:

        token = secrets.token_urlsafe(24)

        target_response = (
            supabase
            .table("campaign_targets")
            .insert({
                "campaign_id": campaign_id,
                "employee_id": employee["id"],
                "token": token
            })
            .execute()
        )

        if not target_response.data:
            continue

        # Record sent event
        supabase.table("events").insert({
            "employee_id": employee["id"],
            "campaign_id": campaign_id,
            "event_type": "sent"
        }).execute()

        simulation_url = (
            f"http://127.0.0.1:8000/simulate/{token}"
        )

        links.append({
            "employee": employee["name"],
            "email": employee["email"],
            "role": employee["role"],
            "token": token,
            "simulation_url": simulation_url
        })

    return {
        "success": True,
        "campaign_id": campaign_id,
        "target_count": len(links),
        "links": links
    }


# ---------------------------------------------------------
# SAFE SIMULATION CLICK
# ---------------------------------------------------------

@app.get("/simulate/{token}", response_class=HTMLResponse)
def simulate_click(token: str):

    # Find target
    target_response = (
        supabase
        .table("campaign_targets")
        .select("*")
        .eq("token", token)
        .limit(1)
        .execute()
    )

    if not target_response.data:
        raise HTTPException(
            status_code=404,
            detail="Simulation link not found"
        )

    target = target_response.data[0]

    employee_id = target["employee_id"]
    campaign_id = target["campaign_id"]

    # -----------------------------------------------------
    # RECORD CLICK EVENT
    # -----------------------------------------------------

    supabase.table("events").insert({
        "employee_id": employee_id,
        "campaign_id": campaign_id,
        "event_type": "clicked"
    }).execute()

    # -----------------------------------------------------
    # GET CURRENT EMPLOYEE
    # -----------------------------------------------------

    employee_response = (
        supabase
        .table("employees")
        .select("*")
        .eq("id", employee_id)
        .limit(1)
        .execute()
    )

    if not employee_response.data:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    employee = employee_response.data[0]

    current_risk = employee.get("risk_score", 0)

    new_risk = min(
        100,
        current_risk + 25
    )

    # -----------------------------------------------------
    # UPDATE EMPLOYEE REMEDIATION STATUS
    # -----------------------------------------------------

    supabase.table("employees").update({
        "status": "remediation",
        "risk_score": new_risk
    }).eq(
        "id",
        employee_id
    ).execute()

    # -----------------------------------------------------
    # ASSIGN TRAINING
    # -----------------------------------------------------

    training_name = ROLE_TRAINING.get(
        employee["role"],
        "Security Awareness Fundamentals"
    )

    existing_training = (
        supabase
        .table("trainings")
        .select("*")
        .eq("employee_id", employee_id)
        .eq("status", "assigned")
        .limit(1)
        .execute()
    )

    if not existing_training.data:

        supabase.table("trainings").insert({
            "employee_id": employee_id,
            "module_name": training_name,
            "status": "assigned",
            "score": 0
        }).execute()

    # -----------------------------------------------------
    # SAFE RESULT PAGE
    # -----------------------------------------------------

    return f"""
    <!DOCTYPE html>

    <html>
    <head>

        <title>CyberShield Simulation</title>

        <style>

            body {{
                margin: 0;
                min-height: 100vh;

                display: flex;
                justify-content: center;
                align-items: center;

                background:
                    #07111f;

                color: white;

                font-family:
                    Arial,
                    sans-serif;
            }}

            .card {{
                width: 90%;
                max-width: 600px;

                padding: 40px;

                border-radius: 20px;

                background: #101d30;

                border:
                    1px solid #24405f;

                box-shadow:
                    0 20px 60px
                    rgba(0,0,0,.4);

                text-align: center;
            }}

            .icon {{
                font-size: 60px;
                margin-bottom: 20px;
            }}

            h1 {{
                margin-bottom: 15px;
            }}

            .success {{
                color: #43e6a4;
                font-weight: bold;
            }}

            .warning {{
                color: #ffb84d;
            }}

            p {{
                color: #b7c7da;
                line-height: 1.6;
            }}

            .box {{
                margin-top: 25px;
                padding: 20px;

                border-radius: 12px;

                background: #0a1626;
            }}

        </style>

    </head>

    <body>

        <div class="card">

            <div class="icon">🛡️</div>

            <h1>
                CyberShield Simulation Triggered
            </h1>

            <p class="success">
                Interaction recorded successfully.
            </p>

            <div class="box">

                <p>
                    This was a controlled security-awareness
                    simulation.
                </p>

                <p class="warning">
                    No password or real credential was collected.
                </p>

                <p>
                    The employee account has been placed into
                    remediation status.
                </p>

                <p>
                    Role-specific micro-training has been assigned.
                </p>

            </div>

        </div>

    </body>

    </html>
    """


# ---------------------------------------------------------
# DASHBOARD
# ---------------------------------------------------------

@app.get("/dashboard")
def dashboard():

    employees_response = (
        supabase
        .table("employees")
        .select("*")
        .execute()
    )

    campaigns_response = (
        supabase
        .table("campaigns")
        .select("id")
        .execute()
    )

    events_response = (
        supabase
        .table("events")
        .select("*")
        .execute()
    )

    employees = employees_response.data
    campaigns = campaigns_response.data
    events = events_response.data

    sent_count = sum(
        1 for event in events
        if event["event_type"] == "sent"
    )

    click_count = sum(
        1 for event in events
        if event["event_type"] == "clicked"
    )

    remediation_employees = [
        employee
        for employee in employees
        if employee["status"] == "remediation"
    ]

    risk_index = 0

    if sent_count > 0:
        risk_index = round(
            (click_count / sent_count) * 100,
            1
        )

    return {
        "employees": len(employees),
        "campaigns": len(campaigns),
        "simulations_sent": sent_count,
        "clicks": click_count,
        "risk_index": risk_index,
        "remediation_required": len(
            remediation_employees
        ),
        "employees_at_risk": remediation_employees
    }


# ---------------------------------------------------------
# TRAININGS
# ---------------------------------------------------------

@app.get("/trainings/{employee_id}")
def get_trainings(employee_id: str):

    response = (
        supabase
        .table("trainings")
        .select("*")
        .eq("employee_id", employee_id)
        .order("created_at", desc=True)
        .execute()
    )

    return response.data


# ---------------------------------------------------------
# COMPLETE TRAINING
# ---------------------------------------------------------

@app.post("/trainings/{training_id}/complete")
def complete_training(
    training_id: str,
    score: int = 0
):

    score = max(
        0,
        min(100, score)
    )

    training_response = (
        supabase
        .table("trainings")
        .select("*")
        .eq("id", training_id)
        .limit(1)
        .execute()
    )

    if not training_response.data:
        raise HTTPException(
            status_code=404,
            detail="Training not found"
        )

    training = training_response.data[0]

    # -----------------------------------------------------
    # UPDATE TRAINING
    # -----------------------------------------------------

    supabase.table("trainings").update({
        "status": "completed",
        "score": score
    }).eq(
        "id",
        training_id
    ).execute()

    # -----------------------------------------------------
    # RESTORE EMPLOYEE STATUS
    # -----------------------------------------------------

    new_risk = max(
        0,
        100 - score
    )

    supabase.table("employees").update({
        "status": "active",
        "risk_score": new_risk
    }).eq(
        "id",
        training["employee_id"]
    ).execute()

    return {
        "success": True,
        "training_id": training_id,
        "score": score,
        "employee_status": "active"
    }