# ==========================================
# MODULE: TELEGRAM BOT INTEGRATION
# PURPOSE: Implements python-telegram-bot dynamic routing, point locks, and forced-joins
# ==========================================

import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application,
    CommandHandler,
    CallbackQueryHandler,
    MessageHandler,
    filters,
    ContextTypes
)
from database import SessionLocal
from models import User, Button, ForcedJoinGate, SupportTicket, SupportMessage

logging.basicConfig(format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

# Helper to verify standard Forced Join subscriptions
async def has_user_joined_all_gates(update: Update, context: ContextTypes.DEFAULT_TYPE, telegram_id: str) -> bool:
    """Queries Telegram API to ensure user is active in all subscription gate channels"""
    db = SessionLocal()
    try:
        active_gates = db.query(ForcedJoinGate).filter(ForcedJoinGate.status == "active").all()
        if not active_gates:
            return True
            
        for gate in active_gates:
            try:
                member_info = await context.bot.get_chat_member(chat_id=gate.chat_id, user_id=int(telegram_id))
                if member_info.status not in ["member", "administrator", "creator"]:
                    return False
            except Exception as ex:
                logger.warning(f"Failed to query member status in {gate.chat_id}: {ex}")
                # Fallback to True or False based on strictness; here we default to False if missing permissions
                return False
        return True
    finally:
        db.close()

# Start Command
async def start_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    # ==========================================
    # MODULE: REFERRAL SYSTEM
    # PURPOSE: Process start links and invite credit awards
    # ==========================================
    """
    user_obj = update.effective_user
    telegram_id = str(user_obj.id)
    username = user_obj.username or ""
    first_name = user_obj.first_name

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.telegram_id == telegram_id).first()
        is_new = False
        
        if not user:
            is_new = True
            referrer_id = None
            
            # Check for arguments e.g. /start 987654321
            if context.args:
                arg_ref = context.args[0]
                # Ensure they didn't join via their own link
                if arg_ref != telegram_id:
                    referrer_id = arg_ref
            
            user = User(
                telegram_id=telegram_id,
                username=username,
                first_name=first_name,
                points=0,
                referred_by=referrer_id,
                status="active"
            )
            db.add(user)
            db.commit()
            
            # Award points to parent inviter
            if referrer_id:
                referrer_user = db.query(User).filter(User.telegram_id == referrer_id).first()
                if referrer_user and referrer_user.status == "active":
                    # Check maximum referral count threshold
                    db_refs_count = db.query(User).filter(User.referred_by == referrer_id).count()
                    if db_refs_count <= 100: # Max Referrals Config value
                        referrer_user.points += 3 # Points award Config value
                        db.commit()
                        try:
                            await context.bot.send_message(
                                chat_id=int(referrer_id),
                                text=f"🎁 Congratulations! {first_name} joined via your link. You earned +3 points!"
                            )
                        except Exception:
                            pass

        if user.status == "banned":
            await update.message.reply_text("❌ You have been banned by the administrator.")
            return

        # Verification checks
        gates_passed = await has_user_joined_all_gates(update, context, telegram_id)
        if not gates_passed:
            gates = db.query(ForcedJoinGate).filter(ForcedJoinGate.status == "active").all()
            kb = []
            for g in gates:
                kb.append([InlineKeyboardButton(text=f"Join: {g.title}", url=g.invite_link)])
            kb.append([InlineKeyboardButton(text="✅ Verify Joined status", callback_data="verify_forced_joins")])
            
            await update.message.reply_text(
                "📢 To use this bot and access accounts, you must subscribe to our partners channels first!",
                reply_markup=InlineKeyboardMarkup(kb)
            )
            return

        # Fetch Root buttons to map main menu keyboard
        root_buttons = db.query(Button).filter(Button.parent_id == None, Button.status == "enabled").order_index = (Button.order).all()
        kb_main = []
        for btn in root_buttons:
            # Inline Keyboard style representation
            kb_main.append([InlineKeyboardButton(text=f"{'🔒 ' if btn.required_points > 0 else ''}{btn.name}", callback_data=f"btn_{btn.id}")])
            
        # Display welcome statement with unique referral code link
        ref_link = f"https://t.me/{context.bot.username}?start={telegram_id}"
        welcome_prompt = (
            f"🎮 Welcome {first_name} to the COD Store CMS!\n\n"
            f"💰 Your Current Points: {user.points} pts\n"
            f"🔗 Share Your Referral Link to earn points:\n`{ref_link}`\n\n"
            "Use the menus below to lookup free drops!"
        )
        
        await update.message.reply_text(
            welcome_prompt,
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup(kb_main)
        )
    finally:
        db.close()

# Callback queries dispatcher (Dynamic Menus)
async def callback_query_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    # ==========================================
    # MODULE: DYNAMIC MENUS
    # PURPOSE: Dynamically list folders and support points checkings
    # ==========================================
    """
    query = update.callback_query
    await query.answer()
    
    telegram_id = str(query.from_user.id)
    callback_data = query.data
    
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.telegram_id == telegram_id).first()
        if not user or user.status == "banned":
            await query.edit_message_text("❌ Session blocked.")
            return

        # Verification gate trigger
        if callback_data == "verify_forced_joins":
            joined = await has_user_joined_all_gates(update, context, telegram_id)
            if joined:
                await query.edit_message_text("✅ Verification successful! Send `/start` command to open main dynamic menus.")
            else:
                await query.edit_message_text(
                    "⚠️ You did not join all required channels. Please verify again after joining partners.",
                    reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(text="♻️ Try Again", callback_data="verify_forced_joins")]])
                )
            return

        # Home trigger
        if callback_data == "nav_home":
            root_buttons = db.query(Button).filter(Button.parent_id == None, Button.status == "enabled").order_by(Button.order).all()
            kb = [[InlineKeyboardButton(text=f"{'🔒 ' if b.required_points > 0 else ''}{b.name}", callback_data=f"btn_{b.id}")] for b in root_buttons]
            ref_link = f"https://t.me/{context.bot.username}?start={telegram_id}"
            await query.edit_message_text(
                f"🏠 MAIN MENU\n💰 Your Points: {user.points} pts\nReferral: {ref_link}",
                reply_markup=InlineKeyboardMarkup(kb)
            )
            return

        if callback_data.startswith("btn_"):
            btn_id = int(callback_data.replace("btn_", ""))
            button = db.query(Button).filter(Button.id == btn_id).first()
            
            if not button or button.status == "disabled":
                await query.edit_message_text("⚠️ This menu button is currently deactivated by administrators.", 
                                              reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(text="🏠 Home", callback_data="nav_home")]]))
                return

            # Cost checks
            if button.required_points > 0 and user.points < button.required_points:
                await query.edit_message_text(
                    f"⚠️ You do not have enough points to access this drop!\n\n"
                    f"🔒 Required Balance: {button.required_points} points\n"
                    f"💰 Your Current Balance: {user.points} points\n\n"
                    "Share your invitation codes to farm more points!",
                    reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(text="⬅️ Back to Home", callback_data="nav_home")]])
                )
                return

            # Display submenus or content
            if button.button_type == "submenu":
                children = db.query(Button).filter(Button.parent_id == button.id, Button.status == "enabled").order_by(Button.order).all()
                kb = [[InlineKeyboardButton(text=f"{'🔒 ' if b.required_points > 0 else ''}{b.name}", callback_data=f"btn_{b.id}")] for b in children]
                kb.append([InlineKeyboardButton(text="⬅️ Back to Home", callback_data="nav_home")])
                
                await query.edit_message_text(
                    f"📂 {button.name}\n\n{button.content or 'Select specialized contents below:'}",
                    reply_markup=InlineKeyboardMarkup(kb)
                )
                return
                
            elif button.button_type == "content":
                # Static details render accompanied layout
                kb_back = [[InlineKeyboardButton(text="🏠 Back to main Menu", callback_data="nav_home")]]
                
                # Check for support triggers
                if button.id == 3 or "support" in button.name.lower():
                    # Set up ticket session
                    await query.edit_message_text(
                        "💬 Support Lobby Online!\n\nSend any text message now, and it will be delivered directly to our operators. The next agent will reply inside this thread.",
                        reply_markup=InlineKeyboardMarkup(kb_back)
                    )
                    return

                # Send standard content message
                if button.media_type != "text" and button.media_url:
                    if button.media_type == "photo":
                        await context.bot.send_photo(
                            chat_id=query.message.chat_id,
                            photo=button.media_url,
                            caption=f"🏆 {button.name}\n\n{button.content}",
                            reply_markup=InlineKeyboardMarkup(kb_back)
                        )
                    else:
                        await context.bot.send_message(
                            chat_id=query.message.chat_id,
                            text=f"🏆 {button.name}\n\n{button.content}\n\nAttachment: {button.media_url}",
                            reply_markup=InlineKeyboardMarkup(kb_back)
                        )
                else:
                    await query.edit_message_text(
                        f"🏆 {button.name}\n\n{button.content}",
                        reply_markup=InlineKeyboardMarkup(kb_back)
                    )
    finally:
        db.close()

# Message handler (Text and Support Ticket pipelines)
async def text_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    # ==========================================
    # MODULE: SUPPORT ROUTING
    # PURPOSE: Relay support inquiry text directly to admin database logs
    # ==========================================
    """
    telegram_id = str(update.effective_user.id)
    text_content = update.message.text
    
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.telegram_id == telegram_id).first()
        if not user or user.status == "banned":
            return
            
        # Create ticket or append message automatically in database
        ticket = db.query(SupportTicket).filter(SupportTicket.telegram_id == telegram_id, SupportTicket.status == "open").first()
        if not ticket:
            ticket = SupportTicket(
                telegram_id=telegram_id,
                username=user.username,
                first_name=user.first_name,
                status="open"
            )
            db.add(ticket)
            db.commit()
            
        new_msg = SupportMessage(
            ticket_id=ticket.id,
            sender="user",
            text=text_content
        )
        db.add(new_msg)
        db.commit()
        
        await update.message.reply_text(
            "📨 Your support ticket update has been forwarded to our operators. Please stand by.",
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton(text="🏠 Home Settings", callback_data="nav_home")]])
        )
    finally:
        db.close()

def main():
    """Initializes polling updates for python-telegram-bot"""
    # Load Bot Token dynamically from environment configs
    token = Config.TELEGRAM_BOT_TOKEN
    app = Application.builder().token(token).build()
    
    app.add_handler(CommandHandler("start", start_handler))
    app.add_handler(CallbackQueryHandler(callback_query_handler))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, text_handler))
    
    print("Telegram dynamic CMS bot dispatcher online.")
    app.run_polling()

if __name__ == "__main__":
    main()
