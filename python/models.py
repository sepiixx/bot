# ==========================================
# MODULE: DATABASE SCHEMAS & MODELS
# PURPOSE: Declares SQLAlchemy structures for ORM tracking
# ==========================================

import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class User(Base):
    """
    # ==========================================
    # MODULE: USER MANAGEMENT
    # PURPOSE: Manage bot subscribers, points, and referrals
    # ==========================================
    """
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(String(50), unique=True, index=True, nullable=False)
    username = Column(String(100), nullable=True)
    first_name = Column(String(150), nullable=False)
    points = Column(Integer, default=0, nullable=False)
    referred_by = Column(String(50), nullable=True) # References telegram_id of inviter
    joined_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_active = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    status = Column(String(30), default="active") # active, banned

class Button(Base):
    """
    # ==========================================
    # MODULE: BUTTON MANAGEMENT
    # PURPOSE: Manage dynamic bot buttons and nesting paths
    # ==========================================
    """
    __tablename__ = "buttons"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    parent_id = Column(Integer, ForeignKey("buttons.id", ondelete="SET NULL"), nullable=True)
    required_points = Column(Integer, default=0, nullable=False)
    button_type = Column(String(50), default="content") # content, submenu, link
    content = Column(Text, nullable=True) # Description or account keys mapping
    status = Column(String(30), default="enabled") # enabled, disabled
    visibility = Column(String(30), default="public") # public, restricted
    order = Column(Integer, default=1)
    link_url = Column(String(255), nullable=True)
    media_type = Column(String(30), default="text") # text, photo, video, document
    media_url = Column(String(255), nullable=True)

    parent = relationship("Button", remote_side=[id])

class ForcedJoinGate(Base):
    """
    # ==========================================
    # MODULE: FORCED JOIN SYSTEM
    # PURPOSE: Manage channel membership gates and schedules
    # ==========================================
    """
    __tablename__ = "forced_join_gates"
    
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(30), default="channel") # channel, group
    title = Column(String(150), nullable=False)
    chat_id = Column(String(100), nullable=False) # @handle or numeric ID
    invite_link = Column(String(255), nullable=False)
    add_after_hours = Column(Integer, nullable=True)
    remove_after_hours = Column(Integer, nullable=True)
    activate_at = Column(DateTime, nullable=True)
    deactivate_at = Column(DateTime, nullable=True)
    status = Column(String(30), default="active") # active, scheduled_add, scheduled_remove, inactive
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class SupportTicket(Base):
    """
    # ==========================================
    # MODULE: SUPPORT SYSTEM
    # PURPOSE: Handle support conversations and message forwarding
    # ==========================================
    """
    __tablename__ = "support_tickets"
    
    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(String(50), nullable=False)
    username = Column(String(100), nullable=True)
    first_name = Column(String(150), nullable=False)
    status = Column(String(30), default="open") # open, resolved, archived
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    messages = relationship("SupportMessage", back_populates="ticket", cascade="all, delete-orphan")

class SupportMessage(Base):
    __tablename__ = "support_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False)
    sender = Column(String(30), nullable=False) # user, admin
    text = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    ticket = relationship("SupportTicket", back_populates="messages")

class BroadcastLog(Base):
    """
    # ==========================================
    # MODULE: BROADCAST SYSTEM
    # PURPOSE: Record dynamic massive dispatches logs
    # ==========================================
    """
    __tablename__ = "broadcast_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(30), nullable=False) # text, photo, video, document
    content = Column(Text, nullable=False)
    media_url = Column(String(255), nullable=True)
    target = Column(String(55), default="all") # all, active, selected
    success_count = Column(Integer, default=0)
    failure_count = Column(Integer, default=0)
    sent_at = Column(DateTime, default=datetime.datetime.utcnow)

class SchedulerTask(Base):
    """
    # ==========================================
    # MODULE: SCHEDULER SYSTEM
    # PURPOSE: Track automation and timed actions
    # ==========================================
    """
    __tablename__ = "scheduler_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    trigger_at = Column(DateTime, nullable=False)
    action = Column(String(100), nullable=False) # add_channel, remove_channel, enable_button, disable_button
    payload_json = Column(JSON, nullable=True) # Arguments to pass info to executables
    status = Column(String(30), default="pending") # pending, completed, failed
