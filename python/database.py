# ==========================================
# MODULE: DATABASE UTILS
# PURPOSE: Manage SQL connection engines and seeds initialization
# ==========================================

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import Config
from models import Base, Button

# Configured for instant SQLite deployments & compatible with cloud PostgreSQL transitions
engine = create_engine(
    Config.DATABASE_URL, 
    connect_args={"check_same_thread": False} if Config.DATABASE_URL.startswith("sqlite") else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db_with_seeds():
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if buttons already exist to prevent duplicated seeds
        if db.query(Button).count() == 0:
            # Seed root folders
            btn_cod = Button(
                name="Free Call Of Duty Accounts",
                parent_id=None,
                required_points=0,
                button_type="submenu",
                content="Browse our list of available premium COD accounts.",
                status="enabled",
                visibility="public",
                order=1
            )
            btn_tut = Button(
                name="Tutorials & Guides",
                parent_id=None,
                required_points=0,
                button_type="submenu",
                content="Learn tips and tricks on how to secure free accounts and optimize gameplay.",
                status="enabled",
                visibility="public",
                order=2
            )
            btn_sup = Button(
                name="Contact Support",
                parent_id=None,
                required_points=0,
                button_type="content",
                content="Message us here. Type your enquiry and click send, our support team will get straight back to you!",
                status="enabled",
                visibility="public",
                order=3
            )
            
            db.add_all([btn_cod, btn_tut, btn_sup])
            db.commit()
            
            # Seed nested items
            cod_sub1 = Button(
                name="Xbox Premium Account",
                parent_id=btn_cod.id,
                required_points=5,
                button_type="content",
                content="🎮 Xbox Login Details:\n📧 Email: cod_xbox_premium_01@outlook.com\n🔑 Password: PremiumGamer2026\n⭐ Membership: Level 150 + Obsidian Camo Skins",
                status="enabled",
                visibility="restricted",
                order=1
            )
            cod_sub2 = Button(
                name="PlayStation Elite Account",
                parent_id=btn_cod.id,
                required_points=8,
                button_type="content",
                content="🎮 PlayStation Network (PSN) Login Details:\n📧 Email: cod_psn_elite_99@gmail.com\n🔑 Password: EliteSniper998\n⭐ Membership: Battlepass Season 5 Active + Damascus unlocked",
                status="enabled",
                visibility="restricted",
                order=2
            )
            
            tut_sub1 = Button(
                name="Points Farming Guide",
                parent_id=btn_tut.id,
                required_points=0,
                button_type="content",
                content="📈 HOW TO FARM POINTS FAST:\n1. Copy your unique referral link.\n2. Share it in Telegram groups or socials.\n3. Every user that joins using your link grants you 3 points instantly!\n4. Use your points to unlock Premium Accounts.",
                status="enabled",
                visibility="public",
                order=1
            )
            
            db.add_all([cod_sub1, cod_sub2, tut_sub1])
            db.commit()
            print("Successfully pre-seeded SQLAlchemy SQLite database.")
    except Exception as e:
        print("Database seeding exception:", e)
    finally:
        db.close()
