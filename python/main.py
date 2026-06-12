# ==========================================
# MODULE: FASTAPI ADMINISTRATIVE BACKEND
# PURPOSE: Full REST API management with JWT authorization and automation triggers
# ==========================================

import datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from config import Config
from database import get_db, init_db_with_seeds
import models

app = FastAPI(title="Unified Bot CMS Panel", version="1.0.0")

# Allow cross origin communication for separate dashboard frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security_bearer = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Pydantic Schemas definitions
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    token: str
    username: str

class ButtonSchema(BaseModel):
    name: str
    parent_id: Optional[int] = None
    required_points: int = 0
    button_type: str = "content"
    content: Optional[str] = ""
    status: str = "enabled"
    visibility: str = "public"
    order: int = 1
    link_url: Optional[str] = ""
    media_type: Optional[str] = "text"
    media_url: Optional[str] = ""

class PointAdjustment(BaseModel):
    points: int

class ForceGateSchema(BaseModel):
    type: str
    title: str
    chat_id: str
    invite_link: str
    add_after_hours: Optional[int] = None
    remove_after_hours: Optional[int] = None
    status: str = "active"

class SupportReply(BaseModel):
    text: str

# JWT verification utility
def verify_admin_token(credentials: HTTPAuthorizationCredentials = Security(security_bearer)) -> str:
    token = credentials.credentials
    try:
        decoded = jwt.decode(token, Config.JWT_SECRET, algorithms=[Config.JWT_ALGORITHM])
        return decoded["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin token has expired.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session credentials.")

# Startup seeds hook
@app.on_event("startup")
def startup_db_initialization():
    init_db_with_seeds()

# ==========================================
# MODULE: JWT AUTHENTICATION API
# PURPOSE: Secure administration login and signature validations
# ==========================================
@app.post("/api/auth/login", response_model=TokenResponse)
def admin_login(payload: LoginRequest):
    # Simulated hashed validation; matches 'admin' / 'admin123' standard credentials
    if payload.username == "admin" and payload.password == "admin123":
        exp_time = datetime.datetime.utcnow() + datetime.timedelta(minutes=Config.JWT_EXP_MINUTES)
        jwt_payload = {
            "sub": payload.username,
            "role": "administrator",
            "exp": exp_time
        }
        token = jwt.encode(jwt_payload, Config.JWT_SECRET, algorithm=Config.JWT_ALGORITHM)
        return {"token": token, "username": payload.username}
    else:
        raise HTTPException(status_code=400, detail="Invalid administrator credentials.")

# ==========================================
# MODULE: SYSTEM ANALYTICS & STATS
# PURPOSE: Fetch global totals for dashboard displays
# ==========================================
@app.get("/api/dashboard/stats")
def fetch_global_intel(admin_user: str = Depends(verify_admin_token), db: Session = Depends(get_db)):
    total_users = db.query(models.User).count()
    active_users = db.query(models.User).filter(models.User.status == "active").count()
    total_buttons = db.query(models.Button).count()
    open_tickets = db.query(models.SupportTicket).filter(models.SupportTicket.status == "open").count()
    total_referrals = db.query(models.User).filter(models.User.referred_by != None).count()
    
    # Broadcast counters
    logs = db.query(models.BroadcastLog).all()
    success_sum = sum(l.success_count for l in logs) if logs else 0
    failed_sum = sum(l.failure_count for l in logs) if logs else 0
    
    return {
        "totalUsers": total_users,
        "activeUsers": active_users,
        "totalButtons": total_buttons,
        "openSupportTickets": open_tickets,
        "totalReferrals": total_referrals,
        "broadcastStats": {
            "success": success_sum,
            "failed": failed_sum
        }
    }

# ==========================================
# MODULE: USER REGISTRY API
# PURPOSE: Manage users lists, ban status, and manual ledger adjustments
# ==========================================
@app.get("/api/users")
def get_subscribers_list(admin_user: str = Depends(verify_admin_token), db: Session = Depends(get_db)):
    return db.query(models.User).all()

@app.put("/api/users/{user_id}/points")
def adjust_points_ledger(user_id: int, payload: PointAdjustment, admin_user: str = Depends(verify_admin_token), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.points = max(0, payload.points)
    db.commit()
    return {"id": user.id, "points": user.points}

@app.put("/api/users/{user_id}/status")
def toggle_ban_status(user_id: int, status: str, admin_user: str = Depends(verify_admin_token), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
         raise HTTPException(status_code=404, detail="User profile missing.")
    user.status = "banned" if status == "banned" else "active"
    db.commit()
    return {"id": user.id, "status": user.status}

# ==========================================
# MODULE: BUTTON CMS API
# PURPOSE: Manage bot menus layouts, commands order, and point costs
# ==========================================
@app.get("/api/buttons")
def list_bot_buttons(admin_user: str = Depends(verify_admin_token), db: Session = Depends(get_db)):
    return db.query(models.Button).order_by(models.Button.order).all()

@app.post("/api/buttons")
def create_cms_button(payload: ButtonSchema, admin_user: str = Depends(verify_admin_token), db: Session = Depends(get_db)):
    btn = models.Button(**payload.dict())
    db.add(btn)
    db.commit()
    db.refresh(btn)
    return btn

@app.delete("/api/buttons/{button_id}")
def delete_cms_button(button_id: int, admin_user: str = Depends(verify_admin_token), db: Session = Depends(get_db)):
    btn = db.query(models.Button).filter(models.Button.id == button_id).first()
    if not btn:
        raise HTTPException(status_code=404, detail="Record not found.")
    db.delete(btn)
    db.commit()
    return {"success": True}

# ==========================================
# MODULE: SUPPORT ADMIN API
# PURPOSE: Read and dispatch help ticket conversations replies
# ==========================================
@app.get("/api/tickets")
def list_tickets(admin_user: str = Depends(verify_admin_token), db: Session = Depends(get_db)):
    return db.query(models.SupportTicket).all()

@app.post("/api/tickets/{ticket_id}/reply")
def reply_support_ticket(ticket_id: int, payload: SupportReply, admin_user: str = Depends(verify_admin_token), db: Session = Depends(get_db)):
    ticket = db.query(models.SupportTicket).filter(models.SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")
        
    # Append message log
    msg = models.SupportMessage(
        ticket_id=ticket.id,
        sender="admin",
        text=payload.text
    )
    db.add(msg)
    db.commit()
    
    # In production, background worker routes actual Telegram Message API:
    # bot.send_message(chat_id=ticket.telegram_id, text=payload.text)
    
    return {"success": True}
