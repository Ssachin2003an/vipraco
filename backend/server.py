from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from bson import ObjectId
import jwt
import bcrypt
import google.generativeai as genai


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get("MONGO_URL", "mongodb://mongo:27017")
client = AsyncIOMotorClient(mongo_url)
db_name = os.environ.get("DB_NAME", "vipraco_hr")
db = client[db_name]

# Gemini AI configuration
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")


# JWT configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"

# Create the main app without a prefix
app = FastAPI(title="VipraCo HR Assistant API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Pydantic Models
class Organization(BaseModel):
    organization_id: str
    org_name: str
    subscription_plan: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class User(BaseModel):
    user_id: str
    organization_id: str
    first_name: str
    last_name: str
    email: str
    role: str
    manager_id: Optional[str] = None
    date_of_joining: datetime
    department: str
    location: str

class LeaveBalance(BaseModel):
    balance_id: str
    organization_id: str
    user_id: str
    leave_type: str
    total_allotted: int
    leaves_taken: int = 0
    leaves_pending_approval: int = 0
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CompanyPolicy(BaseModel):
    policy_id: str
    organization_id: str
    policy_title: str
    policy_category: str
    policy_content: str
    last_reviewed: datetime
    keywords: str

class PayrollData(BaseModel):
    payroll_id: str
    organization_id: str
    user_id: str
    base_salary: float
    hra: float
    conveyance_allowance: float
    medical_allowance: float
    pf_deduction: float
    esi_deduction: float
    professional_tax: float
    ctc: float

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: Dict[str, Any]
    organization: Dict[str, Any]

class ChatMessage(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    type: str  # "hr_data" or "general_ai"
    data: Optional[Dict[str, Any]] = None

# Authentication functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict) -> str:
    return jwt.encode(data, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def init_sample_data():
    """
    Seeds demo organizations and users into MongoDB if they don't exist.
    """
    orgs = [
        {"organization_id": "TECHCORP_IN", "org_name": "TechCorp"},
        {"organization_id": "MGFAB_GLOBAL", "org_name": "MGFab"},
        {"organization_id": "BMS_EDU", "org_name": "BMS Education"}
    ]

    users = [
        {
            "user_id": "U001",
            "first_name": "Rahul",
            "last_name": "Verma",
            "email": "rahul.verma@techcorp.in",
            "password_hash": bcrypt.hashpw("password123".encode("utf-8"), bcrypt.gensalt()).decode(),
            "organization_id": "TECHCORP_IN",
            "role": "Software Engineer",
            "department": "IT"
        },
        {
            "user_id": "U002",
            "first_name": "Geeta",
            "last_name": "Devi",
            "email": "geeta.devi@mgfab.com",
            "password_hash": bcrypt.hashpw("password123".encode("utf-8"), bcrypt.gensalt()).decode(),
            "organization_id": "MGFAB_GLOBAL",
            "role": "HR Manager",
            "department": "Human Resources"
        },
        {
            "user_id": "U003",
            "first_name": "Ramesh",
            "last_name": "Iyer",
            "email": "ramesh.iyer@bms.edu",
            "password_hash": bcrypt.hashpw("password123".encode("utf-8"), bcrypt.gensalt()).decode(),
            "organization_id": "BMS_EDU",
            "role": "Professor",
            "department": "Education"
        }
    ]

    # Insert only if empty
    if await db.organizations.count_documents({}) == 0:
        await db.organizations.insert_many(orgs)
        print("✅ Inserted demo organizations")

    if await db.users.count_documents({}) == 0:
        await db.users.insert_many(users)
        print("✅ Inserted demo users")
    
    # Users (with hashed passwords - using 'password123' for all)
    default_password = hash_password('password123')

    users = [
    {"user_id": "TCI_MGR001", "organization_id": "TECHCORP_IN", "first_name": "Ananya", "last_name": "Sharma", 
     "email": "ananya.sharma@techcorp.in", "password_hash": default_password, "role": "Manager", 
     "manager_id": None, "date_of_joining": datetime(2020, 1, 15), "department": "Engineering", 
     "location": "Bangalore", "contract_years": 5, "contract_end_date": datetime(2025, 1, 15)},

    {"user_id": "TCI_EMP002", "organization_id": "TECHCORP_IN", "first_name": "Rahul", "last_name": "Verma", 
     "email": "rahul.verma@techcorp.in", "password_hash": default_password, "role": "Employee", 
     "manager_id": "TCI_MGR001", "date_of_joining": datetime(2021, 3, 20), "department": "Engineering", 
     "location": "Bangalore", "contract_years": 3, "contract_end_date": datetime(2024, 3, 20)},

    {"user_id": "TCI_HR003", "organization_id": "TECHCORP_IN", "first_name": "Priya", "last_name": "Singh", 
     "email": "priya.singh@techcorp.in", "password_hash": default_password, "role": "Admin", 
     "manager_id": None, "date_of_joining": datetime(2019, 6, 10), "department": "HR", 
     "location": "Bangalore", "contract_years": 6, "contract_end_date": datetime(2025, 6, 10)},

    {"user_id": "TCI_EMP004", "organization_id": "TECHCORP_IN", "first_name": "Amit", "last_name": "Kumar", 
     "email": "amit.kumar@techcorp.in", "password_hash": default_password, "role": "Employee", 
     "manager_id": "TCI_MGR001", "date_of_joining": datetime(2022, 1, 5), "department": "Engineering", 
     "location": "Bangalore", "contract_years": 4, "contract_end_date": datetime(2026, 1, 5)},

    {"user_id": "TCI_EMP005", "organization_id": "TECHCORP_IN", "first_name": "Sneha", "last_name": "Patel", 
     "email": "sneha.patel@techcorp.in", "password_hash": default_password, "role": "Employee", 
     "manager_id": "TCI_MGR001", "date_of_joining": datetime(2021, 8, 15), "department": "QA", 
     "location": "Bangalore", "contract_years": 3, "contract_end_date": datetime(2024, 8, 15)},

    {"user_id": "MGF_MGR001", "organization_id": "MGFAB_GLOBAL", "first_name": "Suresh", "last_name": "Kumar", 
     "email": "suresh.kumar@mgfab.com", "password_hash": default_password, "role": "Manager", 
     "manager_id": None, "date_of_joining": datetime(2018, 4, 12), "department": "Production", 
     "location": "Muzaffarpur", "contract_years": 10, "contract_end_date": datetime(2028, 4, 12)},

    {"user_id": "MGF_EMP002", "organization_id": "MGFAB_GLOBAL", "first_name": "Geeta", "last_name": "Devi", 
     "email": "geeta.devi@mgfab.com", "password_hash": default_password, "role": "Employee", 
     "manager_id": "MGF_MGR001", "date_of_joining": datetime(2020, 7, 8), "department": "Quality Control", 
     "location": "Muzaffarpur", "contract_years": 5, "contract_end_date": datetime(2025, 7, 8)},

    {"user_id": "MGF_EMP003", "organization_id": "MGFAB_GLOBAL", "first_name": "Arjun", "last_name": "Singh", 
     "email": "arjun.singh@mgfab.com", "password_hash": default_password, "role": "Employee", 
     "manager_id": "MGF_MGR001", "date_of_joining": datetime(2021, 2, 18), "department": "Operations", 
     "location": "Muzaffarpur", "contract_years": 3, "contract_end_date": datetime(2024, 2, 18)},

    {"user_id": "EDU_MGR001", "organization_id": "EDU_INST", "first_name": "Neha", "last_name": "Joshi", 
     "email": "neha.joshi@bms.edu", "password_hash": default_password, "role": "Manager", 
     "manager_id": None, "date_of_joining": datetime(2017, 8, 22), "department": "Academics", 
     "location": "Pune", "contract_years": 8, "contract_end_date": datetime(2025, 8, 22)},

    {"user_id": "EDU_EMP002", "organization_id": "EDU_INST", "first_name": "Ramesh", "last_name": "Iyer", 
     "email": "ramesh.iyer@bms.edu", "password_hash": default_password, "role": "Employee", 
     "manager_id": "EDU_MGR001", "date_of_joining": datetime(2019, 11, 5), "department": "IT", 
     "location": "Pune", "contract_years": 4, "contract_end_date": datetime(2023, 11, 5)}
]
    await db.users.insert_many(users)
    
    # Leave Balances for all users
    leave_balances = [
    # --- TECHCORP_IN ---
    {"balance_id": str(uuid.uuid4()), "organization_id": "TECHCORP_IN", "user_id": "TCI_MGR001", "leave_type": "Casual Leave", "total_allotted": 15, "leaves_taken": 2, "leaves_pending_approval": 0},
    {"balance_id": str(uuid.uuid4()), "organization_id": "TECHCORP_IN", "user_id": "TCI_MGR001", "leave_type": "Sick Leave", "total_allotted": 10, "leaves_taken": 1, "leaves_pending_approval": 0},

    {"balance_id": str(uuid.uuid4()), "organization_id": "TECHCORP_IN", "user_id": "TCI_EMP002", "leave_type": "Casual Leave", "total_allotted": 12, "leaves_taken": 3, "leaves_pending_approval": 1},
    {"balance_id": str(uuid.uuid4()), "organization_id": "TECHCORP_IN", "user_id": "TCI_EMP002", "leave_type": "Sick Leave", "total_allotted": 10, "leaves_taken": 2, "leaves_pending_approval": 0},
    {"balance_id": str(uuid.uuid4()), "organization_id": "TECHCORP_IN", "user_id": "TCI_EMP004", "leave_type": "Casual Leave", "total_allotted": 12, "leaves_taken": 4, "leaves_pending_approval": 0},
    {"balance_id": str(uuid.uuid4()), "organization_id": "TECHCORP_IN", "user_id": "TCI_EMP005", "leave_type": "Casual Leave", "total_allotted": 10, "leaves_taken": 1, "leaves_pending_approval": 0},
    {"balance_id": str(uuid.uuid4()), "organization_id": "TECHCORP_IN", "user_id": "TCI_HR003", "leave_type": "Earned Leave", "total_allotted": 20, "leaves_taken": 5, "leaves_pending_approval": 0},

    # --- MGFAB_GLOBAL ---
    {"balance_id": str(uuid.uuid4()), "organization_id": "MGFAB_GLOBAL", "user_id": "MGF_MGR001", "leave_type": "Casual Leave", "total_allotted": 14, "leaves_taken": 2, "leaves_pending_approval": 0},
    {"balance_id": str(uuid.uuid4()), "organization_id": "MGFAB_GLOBAL", "user_id": "MGF_EMP002", "leave_type": "Casual Leave", "total_allotted": 10, "leaves_taken": 4, "leaves_pending_approval": 0},
    {"balance_id": str(uuid.uuid4()), "organization_id": "MGFAB_GLOBAL", "user_id": "MGF_EMP003", "leave_type": "Sick Leave", "total_allotted": 8, "leaves_taken": 2, "leaves_pending_approval": 1},

    # --- EDU_INST ---
    {"balance_id": str(uuid.uuid4()), "organization_id": "EDU_INST", "user_id": "EDU_MGR001", "leave_type": "Casual Leave", "total_allotted": 18, "leaves_taken": 3, "leaves_pending_approval": 0},
    {"balance_id": str(uuid.uuid4()), "organization_id": "EDU_INST", "user_id": "EDU_EMP002", "leave_type": "Casual Leave", "total_allotted": 15, "leaves_taken": 6, "leaves_pending_approval": 1}
]
    await db.leave_balances.insert_many(leave_balances)

    # Company Policies for all organizations
    policies = [
    # --- TECHCORP_IN ---
    {"policy_id": str(uuid.uuid4()), "organization_id": "TECHCORP_IN", "policy_title": "Work From Home Policy", "policy_category": "Workplace", "policy_content": "Employees can work from home up to 3 days per week with manager approval. Core hours 10 AM - 4 PM must be maintained.", "last_reviewed": datetime(2024, 1, 15), "keywords": "remote work, wfh, flexible work"},
    {"policy_id": str(uuid.uuid4()), "organization_id": "TECHCORP_IN", "policy_title": "Travel and Expense Policy", "policy_category": "Finance", "policy_content": "All business travel must be pre-approved. Meals up to ₹1000/day, accommodation as per grade. Submit receipts within 7 days.", "last_reviewed": datetime(2024, 2, 10), "keywords": "travel, expenses, reimbursement"},
    {"policy_id": str(uuid.uuid4()), "organization_id": "TECHCORP_IN", "policy_title": "Code of Conduct", "policy_category": "Behavior", "policy_content": "All employees must maintain professionalism and adhere to TechCorp's ethical standards. Harassment is strictly prohibited.", "last_reviewed": datetime(2024, 3, 5), "keywords": "ethics, behavior, hr policy"},

    # --- MGFAB_GLOBAL ---
    {"policy_id": str(uuid.uuid4()), "organization_id": "MGFAB_GLOBAL", "policy_title": "Safety Regulations", "policy_category": "Safety", "policy_content": "All factory employees must wear safety helmets and protective gear. Regular safety drills conducted monthly.", "last_reviewed": datetime(2024, 1, 20), "keywords": "safety, helmet, protective gear, factory"},
    {"policy_id": str(uuid.uuid4()), "organization_id": "MGFAB_GLOBAL", "policy_title": "Shift Policy", "policy_category": "Operations", "policy_content": "Employees are assigned to morning or evening shifts based on production requirements. Requests for changes must be approved by the shift manager.", "last_reviewed": datetime(2024, 4, 10), "keywords": "shifts, factory, production"},

    # --- EDU_INST ---
    {"policy_id": str(uuid.uuid4()), "organization_id": "EDU_INST", "policy_title": "Leave Policy for Faculty", "policy_category": "HR", "policy_content": "Faculty members are entitled to 15 days of casual leave and 10 days of sick leave per academic year.", "last_reviewed": datetime(2024, 1, 25), "keywords": "leave, faculty, education"},
    {"policy_id": str(uuid.uuid4()), "organization_id": "EDU_INST", "policy_title": "Research and Publication Policy", "policy_category": "Academics", "policy_content": "Faculty are encouraged to publish at least one research paper annually in reputed journals. Support for conferences is available upon request.", "last_reviewed": datetime(2024, 3, 15), "keywords": "research, academics, paper"}
]
    await db.company_policies.insert_many(policies)

# Payroll Data for all users
    payroll_data = [
    # --- TECHCORP_IN ---
    {"payroll_id": str(uuid.uuid4()), "organization_id": "TECHCORP_IN", "user_id": "TCI_MGR001", "base_salary": 85000.0, "hra": 34000.0, "conveyance_allowance": 3000.0, "medical_allowance": 2000.0, "pf_deduction": 10200.0, "esi_deduction": 0.0, "professional_tax": 2500.0, "ctc": 1020000.0},
    {"payroll_id": str(uuid.uuid4()), "organization_id": "TECHCORP_IN", "user_id": "TCI_EMP002", "base_salary": 60000.0, "hra": 24000.0, "conveyance_allowance": 2400.0, "medical_allowance": 1500.0, "pf_deduction": 7200.0, "esi_deduction": 0.0, "professional_tax": 2400.0, "ctc": 720000.0},
    {"payroll_id": str(uuid.uuid4()), "organization_id": "TECHCORP_IN", "user_id": "TCI_HR003", "base_salary": 50000.0, "hra": 20000.0, "conveyance_allowance": 2000.0, "medical_allowance": 1500.0, "pf_deduction": 6000.0, "esi_deduction": 0.0, "professional_tax": 2000.0, "ctc": 600000.0},
    {"payroll_id": str(uuid.uuid4()), "organization_id": "TECHCORP_IN", "user_id": "TCI_EMP004", "base_salary": 45000.0, "hra": 18000.0, "conveyance_allowance": 2000.0, "medical_allowance": 1200.0, "pf_deduction": 5400.0, "esi_deduction": 0.0, "professional_tax": 2400.0, "ctc": 540000.0},
    {"payroll_id": str(uuid.uuid4()), "organization_id": "TECHCORP_IN", "user_id": "TCI_EMP005", "base_salary": 48000.0, "hra": 19200.0, "conveyance_allowance": 2200.0, "medical_allowance": 1300.0, "pf_deduction": 5800.0, "esi_deduction": 0.0, "professional_tax": 2400.0, "ctc": 576000.0},

    # --- MGFAB_GLOBAL ---
    {"payroll_id": str(uuid.uuid4()), "organization_id": "MGFAB_GLOBAL", "user_id": "MGF_MGR001", "base_salary": 55000.0, "hra": 22000.0, "conveyance_allowance": 2500.0, "medical_allowance": 1500.0, "pf_deduction": 6600.0, "esi_deduction": 0.0, "professional_tax": 2200.0, "ctc": 660000.0},
    {"payroll_id": str(uuid.uuid4()), "organization_id": "MGFAB_GLOBAL", "user_id": "MGF_EMP002", "base_salary": 35000.0, "hra": 14000.0, "conveyance_allowance": 1800.0, "medical_allowance": 1000.0, "pf_deduction": 4200.0, "esi_deduction": 900.0, "professional_tax": 2000.0, "ctc": 420000.0},
    {"payroll_id": str(uuid.uuid4()), "organization_id": "MGFAB_GLOBAL", "user_id": "MGF_EMP003", "base_salary": 30000.0, "hra": 12000.0, "conveyance_allowance": 1500.0, "medical_allowance": 1000.0, "pf_deduction": 3600.0, "esi_deduction": 800.0, "professional_tax": 1800.0, "ctc": 360000.0},

    # --- EDU_INST ---
    {"payroll_id": str(uuid.uuid4()), "organization_id": "EDU_INST", "user_id": "EDU_MGR001", "base_salary": 70000.0, "hra": 28000.0, "conveyance_allowance": 2500.0, "medical_allowance": 1800.0, "pf_deduction": 8400.0, "esi_deduction": 0.0, "professional_tax": 2400.0, "ctc": 840000.0},
    {"payroll_id": str(uuid.uuid4()), "organization_id": "EDU_INST", "user_id": "EDU_EMP002", "base_salary": 45000.0, "hra": 18000.0, "conveyance_allowance": 2000.0, "medical_allowance": 1200.0, "pf_deduction": 5400.0, "esi_deduction": 0.0, "professional_tax": 2400.0, "ctc": 540000.0}
]
    await db.payroll_data.insert_many(payroll_data)


# HR Query Processing
async def process_hr_query(user_id: str, organization_id: str, query: str) -> Dict[str, Any]:
    query_lower = query.lower()
    
    # Get user data
    user = await db.users.find_one({"user_id": user_id, "organization_id": organization_id})
    if not user:
        return {"type": "error", "response": "User not found"}
    
    # Personal Information queries
    if any(keyword in query_lower for keyword in ["employee id", "my id", "user id"]):
        return {"type": "hr_data", "response": f"Your employee ID is {user['user_id']}", "data": {"user_id": user['user_id']}}
    
    if any(keyword in query_lower for keyword in ["role", "designation", "position"]):
        return {"type": "hr_data", "response": f"Your current role is {user['role']} in the {user['department']} department.", "data": {"role": user['role'], "department": user['department']}}
    
    if any(keyword in query_lower for keyword in ["manager", "reports to", "supervisor"]):
        if user['manager_id']:
            manager = await db.users.find_one({"user_id": user['manager_id'], "organization_id": organization_id})
            if manager:
                return {"type": "hr_data", "response": f"You report to {manager['first_name']} {manager['last_name']} ({manager['email']})", "data": {"manager": serialize_mongo_doc(manager.copy())}}
        return {"type": "hr_data", "response": "You don't have a manager assigned or you are at the top level."}
    
    if any(keyword in query_lower for keyword in ["email", "official email"]):
        return {"type": "hr_data", "response": f"Your official email address is {user['email']}", "data": {"email": user['email']}}
    
    if any(keyword in query_lower for keyword in ["joining date", "joined", "start date"]):
        joining_date = user['date_of_joining'].strftime("%B %d, %Y")
        return {"type": "hr_data", "response": f"You joined the company on {joining_date}", "data": {"date_of_joining": joining_date}}
    # Contract Details
    if any(keyword in query_lower for keyword in ["contract", "agreement", "bond period", "tenure"]):
        years = user.get("contract_years")
        end_date = user.get("contract_end_date")

        if years and end_date:
            end_date_str = end_date.strftime("%B %d, %Y")
            joining_date = user["date_of_joining"].strftime("%B %d, %Y")

            today = datetime.now()
            completed_years = (today - user["date_of_joining"]).days // 365
            remaining_years = max(years - completed_years, 0)

            response = (
                f"Your contract period is {years} years. You joined on {joining_date}, "
                f"and your contract ends on {end_date_str}. "
                f"You have completed about {completed_years} year(s) and have approximately {remaining_years} year(s) remaining."
            )

            return {
                "type": "hr_data",
                "response": response,
                "data": {
                    "contract_years": years,
                    "contract_end_date": end_date_str,
                    "completed_years": completed_years,
                    "remaining_years": remaining_years,
                },
            }

        return {
            "type": "hr_data",
            "response": "I couldn't find your contract details in the system.",
        }

    if any(keyword in query_lower for keyword in ["department", "team"]):
        return {"type": "hr_data", "response": f"You work in the {user['department']} department at {user['location']}", "data": {"department": user['department'], "location": user['location']}}
    
    # Leave Management queries
    if any(keyword in query_lower for keyword in ["leave balance", "leaves left", "remaining leaves"]):
        leaves = await db.leave_balances.find({
            "user_id": user_id,
            "organization_id": organization_id
        }).to_list(1000)

        if leaves:
            # ✅ Avoid duplicates — store each leave type only once
            unique_leaves = {}
            for leave in leaves:
                leave_type = leave.get("leave_type")
                if leave_type not in unique_leaves:
                    remaining = leave["total_allotted"] - leave["leaves_taken"]
                    unique_leaves[leave_type] = f"• {leave_type}: {remaining} remaining (out of {leave['total_allotted']})"

            # ✅ Build the clean message
            response = "Your current leave balance:\n" + "\n".join(unique_leaves.values())
            serialized_leaves = [serialize_mongo_doc(leave.copy()) for leave in leaves]

            return {
                "type": "hr_data",
                "response": response,
                "data": {"leaves": serialized_leaves}
            }

        return {
            "type": "hr_data",
            "response": "No leave balance information found"
        }

    # Handle specific leave types
    if any(keyword in query_lower for keyword in ["sick leave", "sick"]):
        sick_leave = await db.leave_balances.find_one({
            "user_id": user_id,
            "organization_id": organization_id,
            "leave_type": "Sick Leave"
        })
        if sick_leave:
            remaining = sick_leave["total_allotted"] - sick_leave["leaves_taken"]
            return {
                "type": "hr_data",
                "response": f"You have {remaining} sick leaves remaining out of {sick_leave['total_allotted']}. "
                            f"You've taken {sick_leave['leaves_taken']} sick leaves so far.",
                "data": {"sick_leave": serialize_mongo_doc(sick_leave.copy())}
            }

    if any(keyword in query_lower for keyword in ["casual leave", "casual"]):
        casual_leave = await db.leave_balances.find_one({
            "user_id": user_id,
            "organization_id": organization_id,
            "leave_type": "Casual Leave"
        })
        if casual_leave:
            remaining = casual_leave["total_allotted"] - casual_leave["leaves_taken"]
            return {
                "type": "hr_data",
                "response": f"You have {remaining} casual leaves remaining out of {casual_leave['total_allotted']}. "
                            f"You've taken {casual_leave['leaves_taken']} casual leaves so far.",
                "data": {"casual_leave": serialize_mongo_doc(casual_leave.copy())}
            }

    
    # Payroll queries
    if any(keyword in query_lower for keyword in ["salary", "pay", "ctc", "compensation"]):
        payroll = await db.payroll_data.find_one({"user_id": user_id, "organization_id": organization_id})
        if payroll:
            response = f"Your salary details:\n• Base Salary: ₹{payroll['base_salary']:,.0f}\n• HRA: ₹{payroll['hra']:,.0f}\n• Total CTC: ₹{payroll['ctc']:,.0f}\n• PF Deduction: ₹{payroll['pf_deduction']:,.0f}"
            return {"type": "hr_data", "response": response, "data": {"payroll": serialize_mongo_doc(payroll.copy())}}
    
    # Policy queries
    if any(keyword in query_lower for keyword in ["policy", "policies", "work from home", "wfh", "travel", "expense"]):
        policies = await db.company_policies.find({"organization_id": organization_id}).to_list(1000)
        if policies:
            # Search for relevant policy
            for policy in policies:
                if any(keyword in policy['policy_title'].lower() for keyword in query_lower.split()):
                    return {"type": "hr_data", "response": f"{policy['policy_title']}:\n{policy['policy_content']}", "data": {"policy": serialize_mongo_doc(policy.copy())}}
            
            # If no specific policy found, return all policies
            policy_list = [f"• {policy['policy_title']}" for policy in policies]
            response = f"Here are the available policies for your organization:\n" + "\n".join(policy_list)
            serialized_policies = [serialize_mongo_doc(policy.copy()) for policy in policies]
            return {"type": "hr_data", "response": response, "data": {"policies": serialized_policies}}
    
    # If no HR query matched, return None to indicate it should be processed by AI
    return None
# API Routes
def serialize_mongo_doc(doc):
    """Convert MongoDB document to JSON serializable format"""
    if doc is None:
        return None
    
    # Convert ObjectId to string
    if '_id' in doc:
        del doc['_id']
    
    # Convert datetime objects
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
        elif isinstance(value, ObjectId):
            doc[key] = str(value)
    
    return doc

@api_router.post("/login", response_model=LoginResponse)
async def login(login_request: LoginRequest):
    user = await db.users.find_one({"email": login_request.email})
    if not user or not verify_password(login_request.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    organization = await db.organizations.find_one({"organization_id": user['organization_id']})
    
    token_data = {
        "user_id": user['user_id'],
        "organization_id": user['organization_id'],
        "email": user['email']
    }
    token = create_access_token(token_data)
    
    # Clean user data (remove password and serialize)
    user_data = {k: v for k, v in user.items() if k != 'password_hash'}
    user_data = serialize_mongo_doc(user_data)
    organization_data = serialize_mongo_doc(organization)
    
    return LoginResponse(
        token=token,
        user=user_data,
        organization=organization_data
    )

@api_router.post("/chat", response_model=ChatResponse)
async def chat(message: ChatMessage, current_user: dict = Depends(verify_token)):
    user_id = current_user['user_id']
    organization_id = current_user['organization_id']
    
    # First try to process as HR query
    hr_result = await process_hr_query(user_id, organization_id, message.message)
    
    if hr_result:
        return ChatResponse(
            response=hr_result['response'],
            type=hr_result['type'],
            data=hr_result.get('data')
        )
    
    # If not an HR query, process with Gemini AI
    try:
        # Get user context for personalization
        user = await db.users.find_one({"user_id": user_id, "organization_id": organization_id})
        organization = await db.organizations.find_one({"organization_id": organization_id})
        
        context_prompt = f"""You are VipraCo, an AI assistant for {organization['org_name']}. 
        You are helping {user['first_name']} {user['last_name']}, who works as a {user['role']} in the {user['department']} department.
        
        User question: {message.message}
        
        Provide a helpful, professional response. If this is a general question not related to HR, feel free to answer using your knowledge."""
        
        response = model.generate_content(context_prompt)
        
        return ChatResponse(
            response=response.text,
            type="general_ai",
            data=None
        )
    except Exception as e:
        logger.error(f"Gemini AI error: {str(e)}")
        return ChatResponse(
            response="I'm sorry, I'm having trouble processing your request right now. Please try again later.",
            type="error",
            data=None
        )

@api_router.get("/profile")
async def get_profile(current_user: dict = Depends(verify_token)):
    user = await db.users.find_one({"user_id": current_user['user_id'], "organization_id": current_user['organization_id']})
    organization = await db.organizations.find_one({"organization_id": current_user['organization_id']})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Remove password hash from response and serialize
    user_data = {k: v for k, v in user.items() if k != 'password_hash'}
    user_data = serialize_mongo_doc(user_data)
    organization_data = serialize_mongo_doc(organization)
    
    return {
        "user": user_data,
        "organization": organization_data
    }

# Basic health check
@api_router.get("/")
async def root():
    return {"message": "VipraCo HR Assistant API is running"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await init_sample_data()
    logger.info("VipraCo HR Assistant API started successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()