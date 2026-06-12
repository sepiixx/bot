# ==========================================
# MODULE: SYSTEM CONFIGURATION
# PURPOSE: Manage environment variables, keys, and bot parameters
# ==========================================

import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """System settings representing credentials and SQLite/Postgres options"""
    
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super_secret_jwt_encryption_key_2026")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXP_MINUTES: int = 240 # 4 Hours admin sessions
    
    # SQLite fallback, or PostgreSQL-ready URL
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./bot_cms_database.db")
    
    # Telegram Bot Token setup
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "123456789:ABCdefGhIJKlmNoPQRStUvWxYz")
    
    # Multipliers parameters
    POINTS_PER_REFERRAL: int = int(os.getenv("POINTS_PER_REFERRAL", "3"))
    MAX_REFERRALS: int = int(os.getenv("MAX_REFERRALS", "100"))
