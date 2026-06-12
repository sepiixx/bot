// ==========================================
// MODULE: REAL TELEGRAM BOT CONTROLLER
// PURPOSE: Live interaction layer via Telegraf framework
// ==========================================

import { Telegraf, Markup } from 'telegraf';
import { loadDb, saveDb } from './db';
import { User, BotButton, ForcedJoinChannel, SupportTicket, UserRequest, PointSpendLog, InputFormSubmission } from './types';

let botInstance: Telegraf | null = null;

// In-memory navigation state cache per Telegram ID
interface UserSession {
  currentMenuId: string | null;
  supportMode: boolean;
  pendingInputBotButtonId?: string | null;
  pendingInputText?: string | null;
  pendingInputFormButtonId?: string | null;
  pendingInputFormText?: string | null;
  formStepsCount?: number;
  currentStepIndex?: number;
  accumulatedAnswers?: string[];
  pendingConfirmationButtonId?: string | null;
}
const userSessions = new Map<string, UserSession>();

/**
 * Safely deducts points from the user and logs the transaction.
 */
function deductUserPoints(db: any, telegramId: string, button: BotButton, username: string): number {
  const reqPoints = button.requiredPoints || 0;
  if (reqPoints <= 0) return db.users.find((u: any) => u.telegramId === telegramId)?.points || 0;
  
  const user = db.users.find((u: any) => u.telegramId === telegramId);
  if (user) {
    user.points = Math.max(0, user.points - reqPoints);
  }
  
  if (!db.pointSpendLogs) {
    db.pointSpendLogs = [];
  }
  
  db.pointSpendLogs.push({
    id: 'pt_log_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    type: 'POINT_SPEND_SUCCESS',
    telegramId,
    username: username || `User_${telegramId.slice(-4)}`,
    pointsSpent: reqPoints,
    buttonId: button.id,
    buttonName: button.name,
    timestamp: new Date().toISOString()
  });
  
  console.log(`User ${telegramId} spent ${reqPoints} points on button ${button.name}`);
  
  return user?.points || 0;
}

/**
 * Helper to check real channel membership using Telegraf getChatMember
 */
async function checkForcedJoin(ctx: any, telegramId: string, activeRules: ForcedJoinChannel[]): Promise<{ joined: boolean; unjoined: ForcedJoinChannel[] }> {
  if (activeRules.length === 0) {
    return { joined: true, unjoined: [] };
  }

  const unjoined: ForcedJoinChannel[] = [];
  for (const rule of activeRules) {
    try {
      // Clean target chat handle or id
      let chatId = rule.chatId.trim();
      if (!chatId.startsWith('@') && !chatId.startsWith('-') && isNaN(Number(chatId))) {
        chatId = '@' + chatId;
      }
      
      // Call Telegram Chat Member API
      const member = await ctx.telegram.getChatMember(chatId, Number(telegramId));
      const status = member.status; // 'creator' | 'administrator' | 'member' | 'restricted' | 'left' | 'kicked'
      const isMember = ['creator', 'administrator', 'member', 'restricted'].includes(status);
      
      if (!isMember) {
        unjoined.push(rule);
      }
    } catch (err: any) {
      console.error(`[ForcedJoin] Failed checking membership for chatId ${rule.chatId}:`, err.message || err);
      // Fail open to avoid blocking users on misconfigurations or lack of admin permissions
    }
  }

  return {
    joined: unjoined.length === 0,
    unjoined
  };
}

/**
 * Normalizes button text for comparing (Arabic/Persian Yeh/Keheh and spaces)
 */
export function normalizeBtnName(str: string): string {
  if (!str) return '';
  return str
    .trim()
    .replace(/[\u200c\u200b\u200d\ufeff]/g, '') // remove zero-width non-joiners/joiners/invisible marks
    .replace(/ي/g, 'ی') // Arabic Yeh to Persian Yeh
    .replace(/ك/g, 'ک') // Arabic Keheh to Persian Keheh
    .replace(/\s+/g, ' '); // collapse multiple spaces into a single space
}

/**
 * Checks parentId equality safely handling null, undefined, '', 'null', 'undefined'
 */
export function isSameParent(p1: string | null | undefined, p2: string | null | undefined): boolean {
  const clean1 = (p1 === null || p1 === undefined || p1 === '' || p1 === 'null' || p1 === 'undefined') ? null : p1;
  const clean2 = (p2 === null || p2 === undefined || p2 === '' || p2 === 'null' || p2 === 'undefined') ? null : p2;
  return clean1 === clean2;
}

/**
 * Builds the dynamic Reply Keyboard matching current menu tier
 */
function buildKeyboardForMenu(db: any, currentMenuId: string | null): any {
  const visibleButtons = db.buttons.filter(
    (b: BotButton) => isSameParent(b.parentId, currentMenuId) && b.status === 'enabled'
  ).sort((a: BotButton, b: BotButton) => a.order - b.order);

  const keyboardRows: string[][] = [];
  
  // Arrange in rows of 2 for beautiful layout density
  for (let i = 0; i < visibleButtons.length; i += 2) {
    const row = [visibleButtons[i].name];
    if (visibleButtons[i + 1]) {
      row.push(visibleButtons[i + 1].name);
    }
    keyboardRows.push(row);
  }

  // Push back / home controls at the base
  if (currentMenuId !== null) {
    keyboardRows.push(['⬅️ بازگشت', '🏠 خانه']);
  } else {
    // Add custom buttons to main menu level
    const mainRow = ['👥 دعوت دوستان', '⭐ امتیاز من'];
    if (db.settings.dailyRewardEnabled) {
      mainRow.push('🎁 دریافت جایزه روزانه');
    }
    keyboardRows.push(mainRow);
  }

  return Markup.keyboard(keyboardRows).resize().reply_markup;
}

/**
 * Initializes and launches/updates the real Telegraf instance
 */
export async function startTelegramBot(customToken?: string): Promise<{ success: boolean; botInfo?: any; error?: string }> {
  const db = loadDb();
  const token = customToken || process.env.BOT_TOKEN || db.settings.telegramToken;

  if (!token || token.trim() === '' || token.includes('123456789:ABCdefG')) {
    console.log('[Telegram Bot] No real token provided, bot not running yet.');
    return { success: false, error: 'Token is a placeholder' };
  }

  try {
    // Stop existing instance
    if (botInstance) {
      console.log('[Telegram Bot] Stopping old bot instance...');
      try {
        await botInstance.stop();
      } catch (e) {
        // Safe skip
      }
    }

    console.log('[Telegram Bot] Launching real bot instance...');
    const bot = new Telegraf(token);
    
    // Global Exception Handling to guard the bot process against crashes
    bot.catch((err: any, ctx) => {
      console.error('[Telegram Bot Global Error Catch]', err);
      try {
        ctx.reply('⚠️ خطایی در پردازش دستور رخ داد. لطفاً مجدداً تلاش کنید.').catch(() => {});
      } catch (e) {
        console.error('[Telegram Bot Global Error Catch] Failed to send fallback message', e);
      }
    });
    
    // Test token connection / fetch bot information
    const botInfo = await bot.telegram.getMe();
    console.log(`[Telegram Bot] Connected successfully! Bot username: @${botInfo.username}`);

    // Update database cached headers
    db.settings.telegramToken = token;
    (db.settings as any).botName = botInfo.first_name;
    (db.settings as any).botUsername = botInfo.username;
    saveDb(db);

    // ==========================================
    // MIDDLEWARE: Ensure user registry profile & referrals
    // ==========================================
    bot.use(async (ctx, next) => {
      // Skip non-message or non-callback triggers
      if (!ctx.from || ctx.from.is_bot) return next();

      const telegramId = String(ctx.from.id);
      const username = ctx.from.username || `User_${telegramId.slice(-4)}`;
      const firstName = ctx.from.first_name || 'Anonymous User';

      const localDb = loadDb();
      let user = localDb.users.find(u => u.telegramId === telegramId);
      const isNew = !user;

      if (!user) {
        user = {
          id: 'usr_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          telegramId,
          username,
          firstName,
          points: 0,
          referralsCount: 0,
          joinedAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          status: 'active'
        };

        // Referral processing
        const messageText = (ctx.message as any)?.text || '';
        if (messageText.startsWith('/start')) {
          const parts = messageText.split(/\s+/);
          if (parts.length > 1) {
            let referrerPayload = parts[1].replace('ref_', '').trim();
            if (referrerPayload && referrerPayload !== telegramId) {
              const referrer = localDb.users.find(u => u.telegramId === referrerPayload);
              if (referrer && referrer.status === 'active') {
                const existingRefs = localDb.users.filter(u => u.referredBy === referrer.telegramId).length;
                if (existingRefs < localDb.settings.maxReferrals) {
                  referrer.points += localDb.settings.pointsPerReferral;
                  referrer.referralsCount = (referrer.referralsCount ?? 0) + 1;
                  user.referredBy = referrer.telegramId;
                  
                  // Notify the referrer in Telegram live
                  try {
                    await ctx.telegram.sendMessage(
                      referrer.telegramId,
                      `🎉 *دعوت موفقیت‌آمیز!*\nکاربر @${username} با لینک دعوت شما عضو ربات شد. شما *+${localDb.settings.pointsPerReferral} امتیاز* هدیه گرفتید!`,
                      { parse_mode: 'Markdown' }
                    );
                  } catch (err) {
                    console.error('[Referrals] Failed to notify referrer:', err);
                  }
                }
              }
            }
          }
        }

        localDb.users.push(user);
        saveDb(localDb);
      } else {
        user.lastActive = new Date().toISOString();
        user.username = username;
        user.firstName = firstName;
        saveDb(localDb);
      }

      // Check Ban-status protection
      if (user.status === 'banned') {
        await ctx.reply('❌ دسترسی شما به این ربات توسط مدیریت موقتاً مسدود شده است.');
        return;
      }

      return next();
    });

    // ==========================================
    // COMMAND: Start command
    // ==========================================
    bot.start(async (ctx) => {
      const dbInstance = loadDb();
      const telegramId = String(ctx.from.id);
      
      // Build session
      userSessions.set(telegramId, { currentMenuId: null, supportMode: false });

      // Welcome prompt
      await ctx.reply(dbInstance.settings.welcomeMessage, {
        reply_markup: buildKeyboardForMenu(dbInstance, null)
      });

      // Verify Forced joins
      const activeRules = dbInstance.forcedJoin.filter(fj => fj.status === 'active');
      const { joined, unjoined } = await checkForcedJoin(ctx, telegramId, activeRules);

      if (!joined) {
        const joinButtons: any[] = unjoined.map(ch => Markup.button.url(ch.title, ch.inviteLink));
        joinButtons.push(Markup.button.callback('✅ بررسی و تایید عضویت', 'verify_join_action'));

        await ctx.reply(dbInstance.settings.forcedJoinMessage, {
          reply_markup: Markup.inlineKeyboard(joinButtons, { columns: 1 }).reply_markup
        });
      }
    });

    // ==========================================
    // INLINE QUERY ACTION: Join Membership Verification
    // ==========================================
    bot.action('verify_join_action', async (ctx) => {
      const dbInstance = loadDb();
      const telegramId = String(ctx.from?.id);
      const activeRules = dbInstance.forcedJoin.filter(fj => fj.status === 'active');
      
      const { joined, unjoined } = await checkForcedJoin(ctx, telegramId, activeRules);

      if (joined) {
        await ctx.answerCbQuery('✅ عضویت تایید و دسترسی شما فعال شد!');
        await ctx.reply('🎉 اتصال با موفقیت برقرار شد! به منوی کاربری خوش آمدید. گزینه‌ای را انتخاب کنید:', {
          reply_markup: buildKeyboardForMenu(dbInstance, null)
        });
      } else {
        await ctx.answerCbQuery('❌ شما هنوز در تمام کانال‌های اجباری عضو نشده‌اید!', { show_alert: true });
        
        const joinButtons: any[] = unjoined.map(ch => Markup.button.url(ch.title, ch.inviteLink));
        joinButtons.push(Markup.button.callback('✅ بررسی و تایید عضویت', 'verify_join_action'));

        await ctx.reply('⚠️ دسترسی مسدود است! ابتدا عضو کانال‌های بالا شده و سپس روی دکمه تایید عضویت بزنید:', {
          reply_markup: Markup.inlineKeyboard(joinButtons, { columns: 1 }).reply_markup
        });
      }
    });

    // ==========================================
    // HANDLER: General conversation text messages & menu hits
    // ==========================================
    bot.on('text', async (ctx) => {
      const text = ctx.message.text.trim();
      const telegramId = String(ctx.from.id);
      const dbInstance = loadDb();

      // Ensure session is set
      if (!userSessions.has(telegramId)) {
        userSessions.set(telegramId, { currentMenuId: null, supportMode: false });
      }
      const session = userSessions.get(telegramId)!;

      // Ensure Forced Join checks are resolved before granting normal inputs
      const activeRules = dbInstance.forcedJoin.filter(fj => fj.status === 'active');
      const { joined, unjoined } = await checkForcedJoin(ctx, telegramId, activeRules);
      if (!joined) {
        const joinButtons: any[] = unjoined.map(ch => Markup.button.url(ch.title, ch.inviteLink));
        joinButtons.push(Markup.button.callback('✅ بررسی و تایید عضویت', 'verify_join_action'));

        await ctx.reply(dbInstance.settings.forcedJoinMessage, {
          reply_markup: Markup.inlineKeyboard(joinButtons, { columns: 1 }).reply_markup
        });
        return;
      }

      // ==========================================
      // CONFIRMATION INTERCEPTOR FOR POINTS DEDUCTION
      // ==========================================
      if (session.pendingConfirmationButtonId) {
        const confirmBtnId = session.pendingConfirmationButtonId;
        const confirmBtn = dbInstance.buttons.find(b => b.id === confirmBtnId);

        if (text === '❌ انصراف' || text === 'انصراف' || text === 'cancel') {
          session.pendingConfirmationButtonId = null;
          await ctx.reply('❌ فرآیند لغو شد.', {
            reply_markup: buildKeyboardForMenu(dbInstance, session.currentMenuId)
          });
          return;
        } else if (text === '✅ تایید دریافت') {
          session.pendingConfirmationButtonId = null;
          if (!confirmBtn || confirmBtn.status !== 'enabled') {
            await ctx.reply('❌ این سرویس یا جایزه دیگر در دسترس نیست.', {
              reply_markup: buildKeyboardForMenu(dbInstance, session.currentMenuId)
            });
            return;
          }

          // Check points of user again!
          const userState = dbInstance.users.find(u => u.telegramId === telegramId);
          const userPoints = userState?.points || 0;
          const requiredPoints = confirmBtn.requiredPoints || 0;

          if (userPoints < requiredPoints) {
            await ctx.reply(`❌ امتیاز شما کافی نیست!\n\n💰 موجودی شما: ${userPoints} امتیاز\n🎁 امتیاز مورد نیاز: ${requiredPoints} امتیاز`, {
              reply_markup: buildKeyboardForMenu(dbInstance, session.currentMenuId)
            });
            return;
          }

          // Target execution based on type!
          if (confirmBtn.buttonType === 'submenu') {
            session.currentMenuId = confirmBtn.id;
            try {
              await ctx.reply(`📂 *${confirmBtn.name}*\n\n${confirmBtn.content || 'یکی از موارد زیر را انتخاب کنید:'}`, {
                parse_mode: 'Markdown',
                reply_markup: buildKeyboardForMenu(dbInstance, confirmBtn.id)
              });
              
              const freshDb = loadDb();
              const newPoints = deductUserPoints(freshDb, telegramId, confirmBtn, ctx.from.username || ctx.from.first_name);
              saveDb(freshDb);
              await ctx.reply(`➖ ${requiredPoints} امتیاز کسر شد. 💰 موجودی جدید: ${newPoints} امتیاز`);
            } catch (submenuErr: any) {
              console.error('[Submenu] Markdown failed, trying raw text:', submenuErr.message || submenuErr);
              await ctx.reply(`📂 ${confirmBtn.name}\n\n${confirmBtn.content || 'یکی از موارد زیر را انتخاب کنید:'}`, {
                reply_markup: buildKeyboardForMenu(dbInstance, confirmBtn.id)
              });
              
              const freshDb = loadDb();
              const newPoints = deductUserPoints(freshDb, telegramId, confirmBtn, ctx.from.username || ctx.from.first_name);
              saveDb(freshDb);
              await ctx.reply(`➖ ${requiredPoints} امتیاز کسر شد. 💰 موجودی جدید: ${newPoints} امتیاز`);
            }
          } else if (confirmBtn.buttonType === 'content') {
            let deliverySuccess = false;
            let deliveryError = '';

            try {
              if (confirmBtn.mediaUrl && confirmBtn.mediaUrl.trim() !== '') {
                const cap = `✨ *${confirmBtn.name}*\n\n${confirmBtn.content}`;
                if (cap.length > 1024) {
                  const shortCap = `✨ *${confirmBtn.name}*`;
                  if (confirmBtn.mediaType === 'photo') {
                    await ctx.replyWithPhoto(confirmBtn.mediaUrl, { caption: shortCap, parse_mode: 'Markdown' });
                  } else if (confirmBtn.mediaType === 'video') {
                    await ctx.replyWithVideo(confirmBtn.mediaUrl, { caption: shortCap, parse_mode: 'Markdown' });
                  } else if (confirmBtn.mediaType === 'document') {
                    await ctx.replyWithDocument(confirmBtn.mediaUrl, { caption: shortCap, parse_mode: 'Markdown' });
                  }
                  await ctx.reply(confirmBtn.content, { parse_mode: 'Markdown' });
                } else {
                  if (confirmBtn.mediaType === 'photo') {
                    await ctx.replyWithPhoto(confirmBtn.mediaUrl, { caption: cap, parse_mode: 'Markdown' });
                  } else if (confirmBtn.mediaType === 'video') {
                    await ctx.replyWithVideo(confirmBtn.mediaUrl, { caption: cap, parse_mode: 'Markdown' });
                  } else if (confirmBtn.mediaType === 'document') {
                    await ctx.replyWithDocument(confirmBtn.mediaUrl, { caption: cap, parse_mode: 'Markdown' });
                  } else {
                    await ctx.reply(`${cap}\n\nپیوست: ${confirmBtn.mediaUrl}`, { parse_mode: 'Markdown' });
                  }
                }
              } else {
                await ctx.reply(`✨ *${confirmBtn.name}*\n\n${confirmBtn.content}`, { parse_mode: 'Markdown' });
              }
              deliverySuccess = true;
            } catch (err: any) {
              console.error('[ConfirmationContent] Delivery error:', err.message || err);
              try {
                await ctx.reply(`✨ *${confirmBtn.name}*\n\n${confirmBtn.content}\n\n_(توجه: بارگیری فایل پیوست شده با خطا مواجه شد)_`, { parse_mode: 'Markdown' });
                deliverySuccess = true;
              } catch (fallbackErr: any) {
                console.error('[ConfirmationContent] Plain text fallback error:', fallbackErr.message || fallbackErr);
                try {
                  await ctx.reply(`✨ ${confirmBtn.name}\n\n${confirmBtn.content}`);
                  deliverySuccess = true;
                } catch (e: any) {
                  deliverySuccess = false;
                  deliveryError = e.message || String(e);
                }
              }
            }

            if (deliverySuccess) {
              const freshDb = loadDb();
              const newPoints = deductUserPoints(freshDb, telegramId, confirmBtn, ctx.from.username || ctx.from.first_name);
              saveDb(freshDb);
              await ctx.reply(`🎁 جایزه شما ارسال شد!\n➖ ${requiredPoints} امتیاز از حساب شما کسر شد. 💰 موجودی جدید: ${newPoints} امتیاز`, {
                reply_markup: buildKeyboardForMenu(dbInstance, session.currentMenuId)
              });
            } else {
              const freshDb = loadDb();
              if (!freshDb.pointSpendLogs) freshDb.pointSpendLogs = [];
              freshDb.pointSpendLogs.push({
                id: 'pt_log_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                type: 'POINT_SPEND_FAILED',
                telegramId,
                username: ctx.from.username || `User_${telegramId.slice(-4)}`,
                pointsSpent: requiredPoints,
                buttonId: confirmBtn.id,
                buttonName: confirmBtn.name,
                timestamp: new Date().toISOString(),
                error: deliveryError
              });
              saveDb(freshDb);
              await ctx.reply(`❌ ارسال جایزه با خطا مواجه شد. هیچ امتیازی از حساب شما کسر نشد.`, {
                reply_markup: buildKeyboardForMenu(dbInstance, session.currentMenuId)
              });
            }
          } else if (confirmBtn.buttonType === 'link') {
            try {
              await ctx.reply(`🔗 *${confirmBtn.name}*:\n\nجهت دریافت اطلاعات، بر روی دکمه لینک زیر کلیک کنید:`, {
                parse_mode: 'Markdown',
                reply_markup: Markup.inlineKeyboard([
                  Markup.button.url('👉 باز کردن لینک', confirmBtn.mediaUrl || confirmBtn.linkUrl || 'https://google.com')
                ]).reply_markup
              });

              const freshDb = loadDb();
              const newPoints = deductUserPoints(freshDb, telegramId, confirmBtn, ctx.from.username || ctx.from.first_name);
              saveDb(freshDb);
              await ctx.reply(`➖ ${requiredPoints} امتیاز کسر شد. موجودی جدید: ${newPoints} امتیاز`, {
                reply_markup: buildKeyboardForMenu(dbInstance, session.currentMenuId)
              });
            } catch (err: any) {
              console.error('[ConfirmationLink] failed:', err.message || err);
              const freshDb = loadDb();
              if (!freshDb.pointSpendLogs) freshDb.pointSpendLogs = [];
              freshDb.pointSpendLogs.push({
                id: 'pt_log_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                type: 'POINT_SPEND_FAILED',
                telegramId,
                username: ctx.from.username || `User_${telegramId.slice(-4)}`,
                pointsSpent: requiredPoints,
                buttonId: confirmBtn.id,
                buttonName: confirmBtn.name,
                timestamp: new Date().toISOString(),
                error: err.message || String(err)
              });
              saveDb(freshDb);
              await ctx.reply(`❌ بروز خطا در ارائه لینک. امتیازی کسر نشد.`, {
                reply_markup: buildKeyboardForMenu(dbInstance, session.currentMenuId)
              });
            }
          } else if (confirmBtn.buttonType === 'input_form') {
            const stepsCount = confirmBtn.formStepsCount || 1;
            session.pendingInputFormButtonId = confirmBtn.id;
            session.formStepsCount = stepsCount;
            session.currentStepIndex = 0;
            session.accumulatedAnswers = [];
            
            const stepTitle = confirmBtn.step1Title || confirmBtn.formTitle || 'مرحله اول';
            const stepPrompt = confirmBtn.step1Prompt || confirmBtn.formPrompt || 'لطفاً پاسخ مرحله اول را ارسال یا وارد نمایید.';

            await ctx.reply(`✍️ *[مرحله ۱ از ${stepsCount}] : ${stepTitle}*\n\n${stepPrompt}`, {
              parse_mode: 'Markdown',
              reply_markup: Markup.keyboard([
                ['❌ لغو درخواست']
              ]).resize().reply_markup
            });
          } else if (confirmBtn.buttonType === 'input') {
            session.pendingInputBotButtonId = confirmBtn.id;
            session.pendingInputText = null;

            await ctx.reply(confirmBtn.inputPrompt || 'لطفاً اطلاعات درخواستی را ارسال کنید و سپس برای تایید نهایی روی دکمه تایید بزنید:', {
              reply_markup: Markup.keyboard([
                ['❌ لغو']
              ]).resize().reply_markup
            });
          }
          return;
        } else {
          await ctx.reply('⚠️ لطفا ابتدا درخواست قبلی خود را با دکمه‌های زیر تعیین تکلیف کنید:', {
            reply_markup: Markup.keyboard([
              ['✅ تایید دریافت'],
              ['❌ انصراف']
            ]).resize().reply_markup
          });
          return;
        }
      }

      // ==========================================
      // INPUT FORM WIZARD INTERCEPTOR
      // ==========================================
      if (session.pendingInputFormButtonId) {
        const otherBtnClicked = dbInstance.buttons.find(
          (b: BotButton) => normalizeBtnName(b.name) === normalizeBtnName(text) && b.status === 'enabled'
        );
        const isStandardCmd = text === '🏠 Home' || text === '🏠 خانه' || text === '⬅️ Back' || text === '⬅️ بازگشت' || text === '👥 دعوت دوستان' || text === '⭐ امتیاز من' || text === '🎁 دریافت جایزه روزانه';

        const btnId = session.pendingInputFormButtonId;
        const targetBtn = dbInstance.buttons.find(b => b.id === btnId);
        const submitText = targetBtn?.formSubmitText || '✅ تایید نهایی';

        if ((otherBtnClicked && normalizeBtnName(text) !== normalizeBtnName(submitText) && text !== '✏️ ویرایش اطلاعات' && text !== '❌ لغو درخواست') || isStandardCmd) {
          session.pendingInputFormButtonId = null;
          session.formStepsCount = undefined;
          session.currentStepIndex = undefined;
          session.accumulatedAnswers = undefined;
          // Flow aborted silently, let it parse the other options below as normal
        } else if (text === '❌ لغو' || text === 'لغو' || text === 'cancel' || text === '❌ لغو درخواست') {
          session.pendingInputFormButtonId = null;
          session.formStepsCount = undefined;
          session.currentStepIndex = undefined;
          session.accumulatedAnswers = undefined;
          await ctx.reply('❌ فرآیند ثبت فرم لغو شد.', {
            reply_markup: buildKeyboardForMenu(dbInstance, session.currentMenuId)
          });
          return;
        } else if (text === '✏️ ویرایش اطلاعات') {
          // Restart form wizard
          session.currentStepIndex = 0;
          session.accumulatedAnswers = [];
          
          const stepPrompt = targetBtn?.step1Prompt || targetBtn?.formPrompt || 'لطفاً ایمیل اکانت خود را بفرستید.';
          const stepTitle = targetBtn?.step1Title || targetBtn?.formTitle || 'مرحله اول';
          
          await ctx.reply(`✍️ *مرحله اول مجدداً:* ${stepTitle}\n\n${stepPrompt}`, {
            parse_mode: 'Markdown',
            reply_markup: Markup.keyboard([['❌ لغو درخواست']]).resize().reply_markup
          });
          return;
        } else if (normalizeBtnName(text) === normalizeBtnName(submitText)) {
          // Confirm final submission!
          if (targetBtn && session.accumulatedAnswers && session.accumulatedAnswers.length > 0) {
            const userState = dbInstance.users.find(u => u.telegramId === telegramId);
            const reqPoints = targetBtn.requiredPoints || 0;

            if (reqPoints > 0 && (!userState || userState.points < reqPoints)) {
              await ctx.reply(`❌ شما امتیاز کافی برای ثبت این فرم را ندارید! امتیاز مورد نیاز: ${reqPoints}، امتیاز فعلی شما: ${userState?.points || 0}`, {
                reply_markup: buildKeyboardForMenu(dbInstance, session.currentMenuId)
              });
              session.pendingInputFormButtonId = null;
              session.formStepsCount = undefined;
              session.currentStepIndex = undefined;
              session.accumulatedAnswers = undefined;
              return;
            }

            // Prepare step values
            const answers = session.accumulatedAnswers;
            const s1 = answers[0] || '';
            const s2 = answers[1] || '';
            const s3 = answers[2] || '';
            const s4 = answers[3] || '';

            // Format fullText summary
            let fullTextStr = '';
            const totalSteps = targetBtn.formStepsCount || 1;
            if (totalSteps <= 1) {
              fullTextStr = s1;
            } else {
              fullTextStr = `مرحله ۱ (${targetBtn.step1Title || 'مرحله اول'}): ${s1}`;
              if (totalSteps >= 2) fullTextStr += `\nمرحله ۲ (${targetBtn.step2Title || 'مرحله دوم'}): ${s2}`;
              if (totalSteps >= 3) fullTextStr += `\nمرحله ۳ (${targetBtn.step3Title || 'مرحله سوم'}): ${s3}`;
              if (totalSteps >= 4) fullTextStr += `\nمرحله ۴ (${targetBtn.step4Title || 'مرحله چهارم'}): ${s4}`;
            }

            const newSubmission: InputFormSubmission = {
              id: 'sub_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
              userId: telegramId,
              username: ctx.from.username || ctx.from.first_name || `User_${telegramId.slice(-4)}`,
              buttonId: targetBtn.id,
              buttonName: targetBtn.name,
              formTitle: targetBtn.formTitle || targetBtn.name,
              submittedText: s1, // fallback
              step1Value: s1,
              step2Value: s2,
              step3Value: s3,
              step4Value: s4,
              fullText: fullTextStr,
              createdAt: new Date().toISOString(),
              status: 'pending'
            };

            if (!dbInstance.inputFormSubmissions) {
              dbInstance.inputFormSubmissions = [];
            }
            dbInstance.inputFormSubmissions.push(newSubmission);

            // Deduct points
            let deductionMessage = '';
            if (reqPoints > 0) {
              const freshDb = loadDb();
              const newPoints = deductUserPoints(freshDb, telegramId, targetBtn, ctx.from.username || ctx.from.first_name);
              // merge back inside our current dbInstance so they stay synced
              const userInDbInstance = dbInstance.users.find(u => u.telegramId === telegramId);
              if (userInDbInstance) {
                userInDbInstance.points = newPoints;
              }
              if (!dbInstance.pointSpendLogs) dbInstance.pointSpendLogs = [];
              dbInstance.pointSpendLogs.push(...(freshDb.pointSpendLogs.filter(log => !dbInstance.pointSpendLogs.some(existing => existing.id === log.id))));
              deductionMessage = `\n➖ ${reqPoints} امتیاز از حساب شما کسر گردید. موجودی جدید: ${newPoints} امتیاز`;
            }

            saveDb(dbInstance);

            console.log(`[SYSTEM LOG - FORM SUBMITTED] User ${newSubmission.username} (${telegramId}) submitted form "${newSubmission.formTitle}"`);

            await ctx.reply(`درخواست شما با موفقیت ثبت شد.\n\nوضعیت فعلی:\nدر انتظار بررسی${deductionMessage}`, {
              reply_markup: buildKeyboardForMenu(dbInstance, session.currentMenuId)
            });
          } else {
            await ctx.reply('❌ فرآیند با خطا مواجه شد. لطفاً دوباره تلاش نمایید.', {
              reply_markup: buildKeyboardForMenu(dbInstance, session.currentMenuId)
            });
          }

          session.pendingInputFormButtonId = null;
          session.formStepsCount = undefined;
          session.currentStepIndex = undefined;
          session.accumulatedAnswers = undefined;
          return;
        } else {
          // User sent an answer to the current step!
          const stepsCount = session.formStepsCount || 1;
          const currentStep = session.currentStepIndex || 0;
          
          if (!session.accumulatedAnswers) {
            session.accumulatedAnswers = [];
          }
          
          // Store the answer
          session.accumulatedAnswers[currentStep] = text;
          const nextStep = currentStep + 1;
          
          if (nextStep < stepsCount) {
            // Move to next step
            session.currentStepIndex = nextStep;
            
            let nextStepTitle = 'مرحله بعدی';
            let nextStepPrompt = 'لطفاً پاسخ این مرحله را بنویسید.';
            
            if (nextStep === 1) {
              nextStepTitle = targetBtn?.step2Title || 'مرحله دوم';
              nextStepPrompt = targetBtn?.step2Prompt || 'لطفاً اطلاعات را بفرستید.';
            } else if (nextStep === 2) {
              nextStepTitle = targetBtn?.step3Title || 'مرحله سوم';
              nextStepPrompt = targetBtn?.step3Prompt || 'لطفاً اطلاعات را بفرستید.';
            } else if (nextStep === 3) {
              nextStepTitle = targetBtn?.step4Title || 'مرحله چهارم';
              nextStepPrompt = targetBtn?.step4Prompt || 'لطفاً اطلاعات را بفرستید.';
            }
            
            await ctx.reply(`✍ *[مرحله ${nextStep + 1} از ${stepsCount}] : ${nextStepTitle}*\n\n${nextStepPrompt}`, {
              parse_mode: 'Markdown',
              reply_markup: Markup.keyboard([['❌ لغو درخواست']]).resize().reply_markup
            });
            return;
          } else {
            // All steps are completed! Show confirmation summary.
            const s1 = session.accumulatedAnswers[0] || '';
            const s2 = session.accumulatedAnswers[1] || '';
            const s3 = session.accumulatedAnswers[2] || '';
            const s4 = session.accumulatedAnswers[3] || '';
            
            let summaryStr = `📋 *اطلاعات وارد شده شما به شرح زیر است:*\n\n`;
            summaryStr += `🔹 *${targetBtn?.step1Title || 'مرحله اول'}:* \`${s1}\`\n`;
            if (stepsCount >= 2) summaryStr += `🔹 *${targetBtn?.step2Title || 'مرحله دوم'}:* \`${s2}\`\n`;
            if (stepsCount >= 3) summaryStr += `🔹 *${targetBtn?.step3Title || 'مرحله سوم'}:* \`${s3}\`\n`;
            if (stepsCount >= 4) summaryStr += `🔹 *${targetBtn?.step4Title || 'مرحله چهارم'}:* \`${s4}\`\n`;
            
            const reqPoints = targetBtn?.requiredPoints || 0;
            if (reqPoints > 0) {
              summaryStr += `\n⚠️ *کارمزد ثبت این فرم:* \`${reqPoints} امتیاز\` کسر خواهد شد.`;
            }
            
            summaryStr += `\n\nلطفاً صحت اطلاعات بالا را تایید کنید:`;
            
            session.currentStepIndex = stepsCount; // mark as at confirmation
            
            await ctx.reply(summaryStr, {
              parse_mode: 'Markdown',
              reply_markup: Markup.keyboard([
                [submitText],
                ['✏️ ویرایش اطلاعات'],
                ['❌ لغو درخواست']
              ]).resize().reply_markup
            });
            return;
          }
        }
      }

      // ==========================================
      // INPUT FLOW WIZARD INTERCEPTOR
      // ==========================================
      if (session.pendingInputBotButtonId) {
        const otherBtnClicked = dbInstance.buttons.find(
          (b: BotButton) => normalizeBtnName(b.name) === normalizeBtnName(text) && b.status === 'enabled'
        );
        const isStandardCmd = text === '🏠 Home' || text === '🏠 خانه' || text === '⬅️ Back' || text === '⬅️ بازگشت' || text === '👥 دعوت دوستان' || text === '⭐ امتیاز من' || text === '🎁 دریافت جایزه روزانه';

        if ((otherBtnClicked && text !== '✅ تایید ارسال') || isStandardCmd) {
          session.pendingInputBotButtonId = null;
          session.pendingInputText = null;
          // Flow aborted silently, let it parse the other options below as normal
        } else if (text === '❌ لغو' || text === 'لغو' || text === 'cancel') {
          session.pendingInputBotButtonId = null;
          session.pendingInputText = null;
          await ctx.reply('❌ فرآیند لغو شد.', {
            reply_markup: buildKeyboardForMenu(dbInstance, session.currentMenuId)
          });
          return;
        } else if (text === '✅ تایید ارسال') {
          const btnId = session.pendingInputBotButtonId;
          const targetBtn = dbInstance.buttons.find(b => b.id === btnId);
          
          if (targetBtn && session.pendingInputText) {
            const reqPoints = targetBtn.requiredPoints || 0;
            const userState = dbInstance.users.find(u => u.telegramId === telegramId);
            const userPoints = userState?.points || 0;

            if (reqPoints > 0 && userPoints < reqPoints) {
              await ctx.reply(`❌ شما امتیاز کافی برای ثبت این درخواست را ندارید! امتیاز مورد نیاز: ${reqPoints}، امتیاز فعلی شما: ${userPoints}`, {
                reply_markup: buildKeyboardForMenu(dbInstance, session.currentMenuId)
              });
              session.pendingInputBotButtonId = null;
              session.pendingInputText = null;
              return;
            }

            const newRequest: UserRequest = {
              id: 'req_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
              telegramId,
              username: ctx.from.username || `User_${telegramId.slice(-4)}`,
              buttonId: targetBtn.id,
              buttonName: targetBtn.name,
              content: session.pendingInputText,
              status: 'new',
              createdAt: new Date().toISOString()
            };
            
            if (!dbInstance.userRequests) {
              dbInstance.userRequests = [];
            }
            dbInstance.userRequests.push(newRequest);

            let deductionMessage = '';
            if (reqPoints > 0) {
              const freshDb = loadDb();
              const newPoints = deductUserPoints(freshDb, telegramId, targetBtn, ctx.from.username || ctx.from.first_name);
              if (userState) {
                userState.points = newPoints;
              }
              if (!dbInstance.pointSpendLogs) dbInstance.pointSpendLogs = [];
              dbInstance.pointSpendLogs.push(...(freshDb.pointSpendLogs.filter(log => !dbInstance.pointSpendLogs.some(existing => existing.id === log.id))));
              deductionMessage = `\n➖ ${reqPoints} امتیاز از حساب شما کسر گردید. موجودی جدید: ${newPoints} امتیاز`;
            }

            saveDb(dbInstance);

            await ctx.reply(`✅ درخواست شما با موفقیت ثبت شد.${deductionMessage}`, {
              reply_markup: buildKeyboardForMenu(dbInstance, session.currentMenuId)
            });
          } else {
            await ctx.reply('❌ فرآیند با خطا مواجه شد. لطفاً دوباره تلاش نمایید.', {
              reply_markup: buildKeyboardForMenu(dbInstance, session.currentMenuId)
            });
          }
          
          session.pendingInputBotButtonId = null;
          session.pendingInputText = null;
          return;
        } else {
          session.pendingInputText = text;
          await ctx.reply(`📝 *اطلاعات وارد شده شما:*\n\n\`${text}\`\n\nلطفاً درستی اطلاعات ارسال شده را بررسی کنید. برای ارسال نهایی روی دکمه «✅ تایید ارسال» و برای انصراف بر روی دکمه «❌ لغو» بزنید:`, {
            parse_mode: 'Markdown',
            reply_markup: Markup.keyboard([
              ['✅ تایید ارسال'],
              ['❌ لغو']
            ]).resize().reply_markup
          });
          return;
        }
      }

      // 1. Navigation shortcuts
      if (text === '🏠 Home' || text === '🏠 خانه') {
        session.currentMenuId = null;
        session.supportMode = false;
        await ctx.reply('🔹 منوی اصلی ربات باز شد:', {
          reply_markup: buildKeyboardForMenu(dbInstance, null)
        });
        return;
      }

      if (text === '⬅️ Back' || text === '⬅️ بازگشت') {
        if (session.currentMenuId) {
          const curBtn = dbInstance.buttons.find(b => b.id === session.currentMenuId);
          session.currentMenuId = curBtn ? (curBtn.parentId || null) : null;
        } else {
          session.currentMenuId = null;
        }
        await ctx.reply('👈 به منوی قبلی بازگشتید:', {
          reply_markup: buildKeyboardForMenu(dbInstance, session.currentMenuId)
        });
        return;
      }

      if (text === '👥 دعوت دوستان') {
        const botUsername = ctx.botInfo?.username || (dbInstance.settings as any).botUsername || 'MyCalofBot';
        const referralLink = `https://t.me/${botUsername}?start=ref_${telegramId}`;
        await ctx.reply(`👥 *لینک دعوت اختصاصی شما:* \n\n\`${referralLink}\`\n\nبا اشتراک‌گذاری این لینک با دوستان خود، پس از عضویت هر کاربر *+${dbInstance.settings.pointsPerReferral} عدد امتیاز* هدیه بگیرید!`, {
          parse_mode: 'Markdown'
        });
        return;
      }

      if (text === '⭐ امتیاز من') {
        const userState = dbInstance.users.find(u => u.telegramId === telegramId);
        const currentPoints = userState ? userState.points : 0;
        const totalReferrals = userState ? (userState.referralsCount ?? 0) : 0;
        
        // Find next milestone button
        const lockedButtons = dbInstance.buttons
          .filter((b: BotButton) => b.status === 'enabled' && b.requiredPoints > currentPoints)
          .sort((a: BotButton, b: BotButton) => a.requiredPoints - b.requiredPoints);
        
        let rewardText = '';
        if (lockedButtons.length > 0) {
          const nextBtn = lockedButtons[0];
          const pointsNeeded = nextBtn.requiredPoints - currentPoints;
          rewardText = `🔑 امتیاز موردنیاز برای جایزه بعدی (*${nextBtn.name}*): *${pointsNeeded}* امتیاز`;
        } else {
          rewardText = `🏆 تبریک! شما در حال حاضر امتیاز لازم برای تمامی جوایز موجود را کسب کرده‌اید.`;
        }

        await ctx.reply(`⭐ *مشخصات و میزان امتیاز شما:* \n\n💰 *امتیاز فعلی شما:* ${currentPoints} امتیاز\n👥 *تعداد دعوت‌های موفق:* ${totalReferrals} نفر\n\n${rewardText}`, {
          parse_mode: 'Markdown'
        });
        return;
      }

      if (text === '🎁 دریافت جایزه روزانه') {
        if (!dbInstance.settings.dailyRewardEnabled) {
          await ctx.reply('⚠️ سیستم جایزه روزانه در حال حاضر غیرفعال است.');
          return;
        }

        const userState = dbInstance.users.find(u => u.telegramId === telegramId);
        if (!userState) return;

        const now = Date.now();
        const lastClaimTime = (userState as any).lastDailyRewardClaim ? new Date((userState as any).lastDailyRewardClaim).getTime() : 0;
        const rewardPoints = dbInstance.settings.dailyRewardPoints || 1;

        if (now - lastClaimTime < 24 * 3600 * 1000) {
          const remainingMs = 24 * 3600 * 1000 - (now - lastClaimTime);
          const hours = Math.floor(remainingMs / (3600 * 1000));
          const minutes = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000));
          await ctx.reply(`⏳ *شما قبلاً جایزه روزانه خود را دریافت کرده‌اید!*\n\nزمان باقی‌مانده تا دریافت بعدی: *${hours} ساعت و ${minutes} دقیقه*`, { parse_mode: 'Markdown' });
        } else {
          userState.points = (userState.points || 0) + rewardPoints;
          (userState as any).lastDailyRewardClaim = new Date().toISOString();
          
          if (!(dbInstance as any).dailyClaims) {
            (dbInstance as any).dailyClaims = [];
          }
          (dbInstance as any).dailyClaims.push({
            id: 'clm_' + Date.now(),
            telegramId,
            username: userState.username || '',
            pointsClaimed: rewardPoints,
            claimedAt: new Date().toISOString()
          });
          
          saveDb(dbInstance);

          await ctx.reply(`🎉 *جایزه روزانه دریافت شد!*\n\nمقدار *+${rewardPoints} امتیاز* به حساب شما اضافه شد.\n💰 امتیاز فعلی شما: *${userState.points} امتیاز*`, { parse_mode: 'Markdown' });
        }
        return;
      }

      // Support submission trigger
      if (session.supportMode) {
        if (text.toLowerCase() === 'exit' || text.toLowerCase() === 'cancel' || text === 'خروج' || text === 'لغو') {
          session.supportMode = false;
          await ctx.reply('💬 گفتگوی پشتیبانی پایان یافت. منوی کاربر فعال گردید:', {
            reply_markup: buildKeyboardForMenu(dbInstance, session.currentMenuId)
          });
          return;
        }

        // Live Ticket injection
        let ticket = dbInstance.tickets.find(t => t.telegramId === telegramId && t.status === 'open');
        if (!ticket) {
          ticket = {
            id: 'tkt_' + Date.now() + '_' + Math.floor(Math.random() * 100),
            telegramId,
            username: ctx.from.username || `User_${telegramId.slice(-4)}`,
            firstName: ctx.from.first_name || 'کاربر ناشناس',
            status: 'open',
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          dbInstance.tickets.push(ticket);
        }

        ticket.messages.push({
          sender: 'user',
          text,
          timestamp: new Date().toISOString()
        });
        ticket.updatedAt = new Date().toISOString();
        saveDb(dbInstance);

        await ctx.reply('📨 پیام شما توسط پشتیبانی دریافت شد! بخش مدیریت در اسرع وقت پاسخ شما را همینجا ارسال خواهد کرد.\n\nبرای ارسال پیام‌های دیگر تایپ کنید یا کلمه "exit" یا "خروج" را جهت بستن گفتگو بفرستید.');
        return;
      }

      // Check if button name was clicked
      const userState = dbInstance.users.find(u => u.telegramId === telegramId);
      
      // Dynamic Debug Log requested by user
      console.log('[BUTTON CLICK]', {
        text,
        normalizedText: normalizeBtnName(text),
        currentMenuId: session.currentMenuId,
        availableButtons: dbInstance.buttons.map((b: BotButton) => ({
          id: b.id,
          name: b.name,
          normalizedName: normalizeBtnName(b.name),
          parentId: b.parentId,
          status: b.status
        }))
      });

      // Look for button that matches current level grouping first (using safe parent comparison and string normalizations)
      let clickedBtn = dbInstance.buttons.find(
        (b: BotButton) => {
          const isParentMatch = isSameParent(b.parentId, session.currentMenuId);
          const isButtonNameMatch = normalizeBtnName(b.name) === normalizeBtnName(text);
          return isParentMatch && isButtonNameMatch && b.status === 'enabled';
        }
      );

      // Best-effort fallback: Find any enabled button with this exact name across any hierarchy
      if (!clickedBtn) {
        clickedBtn = dbInstance.buttons.find(
          (b: BotButton) => normalizeBtnName(b.name) === normalizeBtnName(text) && b.status === 'enabled'
        );
        // Sync user's navigation session so they can navigate back/forward normally
        if (clickedBtn) {
          if (clickedBtn.buttonType === 'submenu') {
            session.currentMenuId = clickedBtn.id;
          } else {
            const cleanParent = (clickedBtn.parentId === 'null' || clickedBtn.parentId === 'undefined' || clickedBtn.parentId === '') ? null : clickedBtn.parentId;
            session.currentMenuId = cleanParent || null;
          }
        }
      }

      if (clickedBtn) {
        // Point Verification & Balance Projection Block
        const userPoints = userState?.points || 0;
        const requiredPoints = clickedBtn.requiredPoints || 0;

        if (requiredPoints > 0) {
          if (userPoints < requiredPoints) {
            await ctx.reply(`❌ *امتیاز شما کافی نیست.*\n\n💰 *موجودی شما:* ${userPoints} امتیاز\n🎁 *امتیاز مورد نیاز:* ${requiredPoints} امتیاز`, {
              parse_mode: 'Markdown'
            });
            return;
          } else {
            session.pendingConfirmationButtonId = clickedBtn.id;
            await ctx.reply(`🎁 *${clickedBtn.name}*\n\n💰 *امتیاز مورد نیاز:*\n${requiredPoints}\n\n👤 *امتیاز فعلی شما:*\n${userPoints}\n\nآیا مایل به ادامه هستید؟`, {
              parse_mode: 'Markdown',
              reply_markup: Markup.keyboard([
                ['✅ تایید دریافت'],
                ['❌ انصراف']
              ]).resize().reply_markup
            });
            return;
          }
        }

        // Execute menu logic
        if (clickedBtn.buttonType === 'submenu') {
          session.currentMenuId = clickedBtn.id;
          
          if (clickedBtn.requiredPoints > 0) {
            const freshDb = loadDb();
            const newPoints = deductUserPoints(freshDb, telegramId, clickedBtn, ctx.from.username || ctx.from.first_name);
            saveDb(freshDb);
            await ctx.reply(`➖ ${clickedBtn.requiredPoints} امتیاز کسر شد. 💰 موجودی جدید: ${newPoints} امتیاز`);
          }

          try {
            await ctx.reply(`📂 *${clickedBtn.name}*\n\n${clickedBtn.content || 'یکی از موارد زیر را انتخاب کنید:'}`, {
              parse_mode: 'Markdown',
              reply_markup: buildKeyboardForMenu(dbInstance, clickedBtn.id)
            });
          } catch (submenuErr: any) {
            console.error('[Submenu] Markdown failed, trying raw text:', submenuErr.message || submenuErr);
            await ctx.reply(`📂 ${clickedBtn.name}\n\n${clickedBtn.content || 'یکی از موارد زیر را انتخاب کنید:'}`, {
              reply_markup: buildKeyboardForMenu(dbInstance, clickedBtn.id)
            });
          }
        } else if (clickedBtn.buttonType === 'content') {
          let deliverySuccess = false;
          let deliveryError = '';

          if (clickedBtn.mediaUrl && clickedBtn.mediaUrl.trim() !== '') {
            try {
              const cap = `✨ *${clickedBtn.name}*\n\n${clickedBtn.content}`;
              
              if (cap.length > 1024) {
                // If caption is too long, send media with title only, then send content separately to avoid 400 Bad Request
                const shortCap = `✨ *${clickedBtn.name}*`;
                if (clickedBtn.mediaType === 'photo') {
                  await ctx.replyWithPhoto(clickedBtn.mediaUrl, { caption: shortCap, parse_mode: 'Markdown' }).catch(async () => {
                    await ctx.replyWithPhoto(clickedBtn.mediaUrl, { caption: clickedBtn.name });
                  });
                } else if (clickedBtn.mediaType === 'video') {
                  await ctx.replyWithVideo(clickedBtn.mediaUrl, { caption: shortCap, parse_mode: 'Markdown' }).catch(async () => {
                    await ctx.replyWithVideo(clickedBtn.mediaUrl, { caption: clickedBtn.name });
                  });
                } else if (clickedBtn.mediaType === 'document') {
                  await ctx.replyWithDocument(clickedBtn.mediaUrl, { caption: shortCap, parse_mode: 'Markdown' }).catch(async () => {
                    await ctx.replyWithDocument(clickedBtn.mediaUrl, { caption: clickedBtn.name });
                  });
                }
                
                try {
                  await ctx.reply(clickedBtn.content, { parse_mode: 'Markdown' });
                } catch (txtErr) {
                  await ctx.reply(clickedBtn.content);
                }
              } else {
                // Normal length
                if (clickedBtn.mediaType === 'photo') {
                  await ctx.replyWithPhoto(clickedBtn.mediaUrl, { caption: cap, parse_mode: 'Markdown' });
                } else if (clickedBtn.mediaType === 'video') {
                  await ctx.replyWithVideo(clickedBtn.mediaUrl, { caption: cap, parse_mode: 'Markdown' });
                } else if (clickedBtn.mediaType === 'document') {
                  await ctx.replyWithDocument(clickedBtn.mediaUrl, { caption: cap, parse_mode: 'Markdown' });
                } else {
                  await ctx.reply(`${cap}\n\nپیوست: ${clickedBtn.mediaUrl}`, { parse_mode: 'Markdown' });
                }
              }
              deliverySuccess = true;
            } catch (mediaErr: any) {
              console.error('[BotMedia] Failed sending media, falling back to text:', mediaErr.message || mediaErr);
              try {
                await ctx.reply(`✨ *${clickedBtn.name}*\n\n${clickedBtn.content}\n\n_(توجه: بارگیری فایل پیوست شده با خطا مواجه شد)_`, { parse_mode: 'Markdown' });
                deliverySuccess = true;
              } catch (fallbackTextErr: any) {
                console.error('[BotMedia] Fallback reply failed, sending raw:', fallbackTextErr.message || fallbackTextErr);
                try {
                  await ctx.reply(`✨ ${clickedBtn.name}\n\n${clickedBtn.content}`);
                  deliverySuccess = true;
                } catch (e: any) {
                  deliverySuccess = false;
                  deliveryError = e.message || String(e);
                }
              }
            }
          } else {
            try {
              await ctx.reply(`✨ *${clickedBtn.name}*\n\n${clickedBtn.content}`, { parse_mode: 'Markdown' });
              deliverySuccess = true;
            } catch (textErr: any) {
              console.error('[BotText] Markdown parsing failed, trying raw text fallback:', textErr.message || textErr);
              try {
                await ctx.reply(`✨ ${clickedBtn.name}\n\n${clickedBtn.content}`);
                deliverySuccess = true;
              } catch (e: any) {
                deliverySuccess = false;
                deliveryError = e.message || String(e);
              }
            }
          }

          // Point spend transaction ONLY for buttons with requiredPoints > 0
          if (clickedBtn.requiredPoints > 0) {
            const freshDb = loadDb();
            
            if (deliverySuccess) {
              const newPoints = deductUserPoints(freshDb, telegramId, clickedBtn, ctx.from.username || ctx.from.first_name);
              saveDb(freshDb);
              await ctx.reply(`🎁 جایزه شما ارسال شد!\n➖ ${clickedBtn.requiredPoints} امتیاز از حساب شما کسر شد. 💰 موجودی جدید: ${newPoints} امتیاز`);
            } else {
              if (!freshDb.pointSpendLogs) freshDb.pointSpendLogs = [];
              freshDb.pointSpendLogs.push({
                id: 'pt_log_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                type: 'POINT_SPEND_FAILED',
                telegramId,
                username: ctx.from.username || `User_${telegramId.slice(-4)}`,
                pointsSpent: clickedBtn.requiredPoints,
                buttonId: clickedBtn.id,
                buttonName: clickedBtn.name,
                timestamp: new Date().toISOString(),
                error: deliveryError
              });
              saveDb(freshDb);
              await ctx.reply(`❌ ارسال جایزه با خطا مواجه شد. هیچ امتیازی از حساب شما کسر نشد.`);
            }
          }

          // Contact Support trigger
          if (clickedBtn.id === 'btn_3' || clickedBtn.name.toLowerCase().includes('support') || clickedBtn.name.includes('پشتیبانی') || clickedBtn.content.toLowerCase().includes('support')) {
            session.supportMode = true;
            try {
              await ctx.reply('💬 *بخش گفتگو با پشتیبانی فعال شد!*\nهر مطلبی از این پس بنویسید مستقیماً برای پاسخگویی به تیم پشتیبان ارسال می‌شود. اولین پیام خود را بفرستید، یا با ارسال کلمه "خروج" گفتگو را به اتمام برسانید.', {
                parse_mode: 'Markdown'
              });
            } catch (suppErr) {
              await ctx.reply('💬 بخش گفتگو با پشتیبانی فعال شد!\nهر مطلبی از این پس بنویسید مستقیماً برای پاسخگویی به تیم پشتیبان ارسال می‌شود. اولین پیام خود را بفرستید، یا با ارسال کلمه "خروج" گفتگو را به اتمام برسانید.');
            }
          }
        } else if (clickedBtn.buttonType === 'input_form') {
          const stepsCount = clickedBtn.formStepsCount || 1;
          session.pendingInputFormButtonId = clickedBtn.id;
          session.formStepsCount = stepsCount;
          session.currentStepIndex = 0;
          session.accumulatedAnswers = [];
          
          const stepTitle = clickedBtn.step1Title || clickedBtn.formTitle || 'مرحله اول';
          const stepPrompt = clickedBtn.step1Prompt || clickedBtn.formPrompt || 'لطفاً پاسخ مرحله اول را ارسال یا وارد نمایید.';

          if (clickedBtn.requiredPoints > 0) {
            await ctx.reply(`⚠️ *توجه:* ثبت نهایی این فرم نیاز به *${clickedBtn.requiredPoints} امتیاز* دارد که پس از تایید نهایی کسر می‌شود.`, {
              parse_mode: 'Markdown'
            });
          }

          await ctx.reply(`✍️ *[مرحله ۱ از ${stepsCount}] : ${stepTitle}*\n\n${stepPrompt}`, {
            parse_mode: 'Markdown',
            reply_markup: Markup.keyboard([
              ['❌ لغو درخواست']
            ]).resize().reply_markup
          });
        } else if (clickedBtn.buttonType === 'input') {
          session.pendingInputBotButtonId = clickedBtn.id;
          session.pendingInputText = null;

          if (clickedBtn.requiredPoints > 0) {
            await ctx.reply(`⚠️ *توجه:* ثبت نهایی اطلاعات این بخش نیاز به *${clickedBtn.requiredPoints} امتیاز* دارد که پس از تایید ارسال کسر می‌شود.`, {
              parse_mode: 'Markdown'
            });
          }

          await ctx.reply(clickedBtn.inputPrompt || 'لطفاً اطلاعات درخواستی را ارسال کنید و سپس برای تایید نهایی روی دکمه تایید بزنید:', {
            reply_markup: Markup.keyboard([
              ['❌ لغو']
            ]).resize().reply_markup
          });
        } else if (clickedBtn.buttonType === 'link') {
          if (clickedBtn.requiredPoints > 0) {
            const freshDb = loadDb();
            const newPoints = deductUserPoints(freshDb, telegramId, clickedBtn, ctx.from.username || ctx.from.first_name);
            saveDb(freshDb);
            await ctx.reply(`➖ ${clickedBtn.requiredPoints} امتیاز کسر شد. موجودی جدید: ${newPoints} امتیاز`);
          }

          try {
            await ctx.reply(`🔗 *${clickedBtn.name}*:\n\nجهت دریافت اطلاعات، بر روی دکمه لینک زیر کلیک کنید:`, {
              parse_mode: 'Markdown',
              reply_markup: Markup.inlineKeyboard([
                Markup.button.url('👉 باز کردن لینک', clickedBtn.linkUrl || 'https://google.com')
              ]).reply_markup
            });
          } catch (linkErr) {
            await ctx.reply(`🔗 ${clickedBtn.name}:\n\nجهت دریافت اطلاعات، بر روی دکمه لینک زیر کلیک کنید:`, {
              reply_markup: Markup.inlineKeyboard([
                Markup.button.url('👉 باز کردن لینک', clickedBtn.linkUrl || 'https://google.com')
              ]).reply_markup
            });
          }
        }
        return;
      }

      // Default prompt
      try {
        await ctx.reply('❓ دستور تشخیص داده نشد. لطفاً از دکمه‌های زیر جهت ناوبری و جابجایی استفاده کنید:', {
          reply_markup: buildKeyboardForMenu(dbInstance, session.currentMenuId)
        });
      } catch (defErr) {
        console.error('[DefaultPrompt] failed:', defErr);
      }
    });

    // Handle webhooks vs polling
    const appUrl = process.env.APP_URL;
    if (appUrl && appUrl.includes('.run.app')) {
      const webhookPath = '/telegram-webhook';
      await bot.telegram.setWebhook(`${appUrl}${webhookPath}`);
      console.log(`[Telegram Bot] Webhook bound happily at ${appUrl}${webhookPath}`);
    } else {
      // Direct polling fallback
      bot.launch().catch(err => {
        console.error('[Telegram Bot] Bot launch failure:', err);
      });
      console.log('[Telegram Bot] Running successfully in direct long-polling fallback mode.');
    }

    botInstance = bot;
    return { success: true, botInfo };
  } catch (err: any) {
    console.error('[Telegram Bot] Connection or activation issue:', err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Accessor for the active bot controller
 */
export function getBot(): Telegraf | null {
  return botInstance;
}
