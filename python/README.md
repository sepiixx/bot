# Dynamic Telegram Bot CMS with Web Admin Panel (Python Backend Blueprint)

This modular codebase represents a production-ready, data-driven Telegram Bot Management System built using Python 3.12+, FastAPI, and SQLAlchemy ORM.

## Features Included
1. **Dynamic Menu Routing**: Complete database-driven menu tree. Supports unlimited submenus, links, automatic "Back" and "Home" navigation matrices.
2. **Forced Join Gates**: Blocks access until users are validated inside partner Telegram Channels or Groups. Supports scheduling active dates and delays.
3. **Points reward Matrix**: Set referral bounds. Tracks invitation links under telegram handles.
4. **Direct Support Inbox**: Forward ticketing dialogs from user sessions. Operators reply directly inside the backend.
5. **Campaign mass broadcasts**: Manage and log texts or multimedia announcements.

---

## Directory Architecture
```
/python/
├── main.py            # FastAPI main entrypoint & JWT Authenticator
├── bot.py             # python-telegram-bot client polling thread 
├── models.py          # SQLAlchemy ORM declarations 
├── database.py        # Database engine pool & custom seeds
├── config.py          # Environment settings loader
├── requirements.txt   # Pip package dependencies
├── Dockerfile         # Docker compiler container definition
└── docker-compose.yml # Orchestrated multi-service layouts
```

---

## Database Schema Layouts

### 1. `users` Table
| Column Name | Type | Key | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY | Primary auto-increment indexing |
| `telegram_id` | VARCHAR(50) | UNIQUE | User Telegram ID |
| `username` | VARCHAR(100) | NULLABLE | User custom handler |
| `points` | INTEGER | DEFAULT 0 | Accumulated balance |
| `referred_by` | VARCHAR(50) | NULLABLE | Referrer Telegram ID |
| `status` | VARCHAR(30) | "active" | Active / Banned statuses |

### 2. `buttons` Table
| Column Name | Type | Key | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY | Primary index ID |
| `name` | VARCHAR(150) | - | Button keyboard caption label |
| `parent_id` | INTEGER | FOREIGN | Self-referencing menu folder mapping |
| `required_points` | INTEGER | DEFAULT 0 | Locked doors points limit |
| `button_type` | VARCHAR(50) | "content"| Submenu, content, or link redirects |
| `content` | TEXT | NULLABLE | Account password text dumps |

---

## Configuration & Local Installation

### Prerequisites
- Python 3.12+
- Optional: Docker Desktop

### 1. Install Dependencies
```bash
cd python
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment variables (.env)
Create a `.env` file in `/python` folder:
```env
JWT_SECRET=super_secret_vps_jwt_token_2026
DATABASE_URL=sqlite:///./bot_cms_database.db
TELEGRAM_BOT_TOKEN=YOUR_REAL_TELEGRAM_BOT_TOKEN_FROM_BOTFATHER
```

### 3. Running Services
Run the Web API server:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
Run the Telegram Bot Poller separately:
```bash
python bot.py
```

---

## Docker Quickstart

To run both services (FastAPI + Bot) inside an isolated container automatically:
```bash
docker-compose up --build -d
```
All schema migrations are performed automatically on database startup.
