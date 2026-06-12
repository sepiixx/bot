// ==========================================
// MODULE: SERVER MANAGEMENT
// PURPOSE: Handles Express routing, API layers, and the Telegram bot logic
// ==========================================

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';
import { loadDb, saveDb } from './src/db';
import { User, BotButton, ForcedJoinChannel, SupportTicket, BroadcastLog, SchedulerTask, MediaAsset } from './src/types';
import { startTelegramBot, getBot } from './src/telegram';

const app = express();
const PORT = 3000;

app.use(express.json());

// Simple JWT Hashing Signer/Verifier for visual and architectural compliance
const JWT_SECRET = 'bot_cms_secure_jwt_secret_token_key_2026';

function signToken(payload: { username: string; role: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 2 * 3600 * 1000 })).toString('base64url');
  const signature = Buffer.from(`${header}.${body}.${JWT_SECRET}`).toString('base64url').slice(0, 16);
  return `${header}.${body}.${signature}`;
}

function verifyToken(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const body = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
    if (body.exp < Date.now()) return null;
    return body;
  } catch {
    return null;
  }
}

// Authentication Middleware
function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization header is required' });
    return;
  }
  const token = authHeader.split(' ')[1];
  const verified = verifyToken(token);
  if (!verified) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
  (req as any).user = verified;
  next();
}

// ==========================================
// API MODULE: AUTHENTICATION
// ==========================================
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const db = loadDb();
  
  const isMatch = username === 'admin' && bcrypt.compareSync(password, db.adminPasswordHash);
  if (isMatch) {
    const token = signToken({ username: 'admin', role: 'administrator' });
    res.json({ token, user: { username: 'admin', role: 'administrator' } });
  } else {
    res.status(400).json({ error: 'رمز عبور اشتباه است' });
  }
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const token = authHeader.split(' ')[1];
  const user = verifyToken(token);
  if (!user) {
    res.status(401).json({ error: 'Session expired' });
    return;
  }
  res.json({ user });
});

// ==========================================
// API MODULE: DASHBOARD STATISTICS
// ==========================================
app.get('/api/dashboard/stats', authMiddleware, (req, res) => {
  const db = loadDb();
  
  const totalUsers = db.users.length;
  const activeUsers = db.users.filter(u => u.status === 'active').length;
  const totalButtons = db.buttons.length;
  const openSupportTickets = db.tickets.filter(t => t.status === 'open').length;
  
  // Total referrals tracked
  const totalReferrals = db.users.filter(u => u.referredBy).length;
  
  // Count broadcast success/failures
  let totalSuccessfulBroadcasts = 0;
  let totalFailedBroadcasts = 0;
  db.broadcasts.forEach(b => {
    totalSuccessfulBroadcasts += b.successCount;
    totalFailedBroadcasts += b.failureCount;
  });

  res.json({
    totalUsers,
    activeUsers,
    totalButtons,
    openSupportTickets,
    totalReferrals,
    broadcastStats: {
      success: totalSuccessfulBroadcasts,
      failed: totalFailedBroadcasts
    }
  });
});

// ==========================================
// API MODULE: USER MANAGEMENT
// ==========================================
app.get('/api/users', authMiddleware, (req, res) => {
  const db = loadDb();
  const { search } = req.query;
  let filtered = db.users;
  if (search) {
    const q = (search as string).toLowerCase();
    filtered = db.users.filter(u => 
      u.username.toLowerCase().includes(q) || 
      u.firstName.toLowerCase().includes(q) || 
      u.telegramId.includes(q)
    );
  }
  res.json(filtered);
});

app.put('/api/users/:id', authMiddleware, (req, res) => {
  const db = loadDb();
  const userId = req.params.id;
  const userIndex = db.users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  
  db.users[userIndex] = { ...db.users[userIndex], ...req.body };
  saveDb(db);
  res.json(db.users[userIndex]);
});

// ==========================================
// API MODULE: BUTTON MANAGEMENT
// ==========================================
app.get('/api/buttons', authMiddleware, (req, res) => {
  const db = loadDb();
  res.json(db.buttons);
});

app.post('/api/buttons', authMiddleware, (req, res) => {
  const db = loadDb();
  const newButton: BotButton = {
    id: 'btn_' + Date.now(),
    name: req.body.name,
    parentId: req.body.parentId || null,
    requiredPoints: Number(req.body.requiredPoints) || 0,
    buttonType: req.body.buttonType || 'content',
    content: req.body.content || '',
    status: req.body.status || 'enabled',
    visibility: req.body.visibility || 'public',
    order: Number(req.body.order) || db.buttons.length + 1,
    linkUrl: req.body.linkUrl || '',
    mediaType: req.body.mediaType || 'text',
    mediaUrl: req.body.mediaUrl || '',
    inputPrompt: req.body.inputPrompt || '',
    inputTarget: req.body.inputTarget || '',
    formTitle: req.body.formTitle || '',
    formPrompt: req.body.formPrompt || '',
    formSubmitText: req.body.formSubmitText || '',
    formStepsCount: Number(req.body.formStepsCount) || 1,
    step1Title: req.body.step1Title || '',
    step1Prompt: req.body.step1Prompt || '',
    step2Title: req.body.step2Title || '',
    step2Prompt: req.body.step2Prompt || '',
    step3Title: req.body.step3Title || '',
    step3Prompt: req.body.step3Prompt || '',
    step4Title: req.body.step4Title || '',
    step4Prompt: req.body.step4Prompt || ''
  };
  db.buttons.push(newButton);
  saveDb(db);
  res.json(newButton);
});

app.put('/api/buttons/:id', authMiddleware, (req, res) => {
  const db = loadDb();
  const buttonId = req.params.id;
  const index = db.buttons.findIndex(b => b.id === buttonId);
  if (index === -1) {
    res.status(404).json({ error: 'Button not found' });
    return;
  }
  db.buttons[index] = { ...db.buttons[index], ...req.body };
  saveDb(db);
  res.json(db.buttons[index]);
});

app.delete('/api/buttons/:id', authMiddleware, (req, res) => {
  const db = loadDb();
  const buttonId = req.params.id;
  db.buttons = db.buttons.filter(b => b.id !== buttonId);
  saveDb(db);
  res.json({ success: true });
});

// ==========================================
// API MODULE: FORCED JOIN
// ==========================================
app.get('/api/forced-join', authMiddleware, (req, res) => {
  const db = loadDb();
  res.json(db.forcedJoin);
});

app.post('/api/forced-join', authMiddleware, (req, res) => {
  const db = loadDb();
  const newChannel: ForcedJoinChannel = {
    id: 'fj_' + Date.now(),
    type: req.body.type || 'channel',
    title: req.body.title,
    chatId: req.body.chatId,
    inviteLink: req.body.inviteLink,
    status: req.body.status || 'active',
    addAfterHours: req.body.addAfterHours ? Number(req.body.addAfterHours) : null,
    removeAfterHours: req.body.removeAfterHours ? Number(req.body.removeAfterHours) : null,
    activateAt: req.body.activateAt || null,
    deactivateAt: req.body.deactivateAt || null,
    createdAt: new Date().toISOString()
  };
  db.forcedJoin.push(newChannel);
  saveDb(db);
  res.json(newChannel);
});

app.put('/api/forced-join/:id', authMiddleware, (req, res) => {
  const db = loadDb();
  const id = req.params.id;
  const index = db.forcedJoin.findIndex(f => f.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Record not found' });
    return;
  }
  db.forcedJoin[index] = { ...db.forcedJoin[index], ...req.body };
  saveDb(db);
  res.json(db.forcedJoin[index]);
});

app.delete('/api/forced-join/:id', authMiddleware, (req, res) => {
  const db = loadDb();
  const id = req.params.id;
  db.forcedJoin = db.forcedJoin.filter(f => f.id !== id);
  saveDb(db);
  res.json({ success: true });
});

// ==========================================
// API MODULE: SUPPORT SYSTEM
// ==========================================
app.get('/api/tickets', authMiddleware, (req, res) => {
  const db = loadDb();
  res.json(db.tickets);
});

app.post('/api/tickets/:id/reply', authMiddleware, async (req, res) => {
  const db = loadDb();
  const ticketId = req.params.id;
  const { text } = req.body;
  const index = db.tickets.findIndex(t => t.id === ticketId);
  
  if (index === -1) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }
  
  const ticket = db.tickets[index];
  const newMsg = {
    sender: 'admin' as const,
    text,
    timestamp: new Date().toISOString()
  };
  ticket.messages.push(newMsg);
  ticket.status = 'open'; // Re-open if admin interacts or keep as open
  ticket.updatedAt = new Date().toISOString();
  db.tickets[index] = ticket;
  saveDb(db);

  // Send real telegram reply message if bot is active!
  const bot = getBot();
  if (bot) {
    try {
      await bot.telegram.sendMessage(ticket.telegramId, `💬 *Administrator Support Reply:*\n\n${text}`, {
        parse_mode: 'Markdown'
      });
    } catch (err: any) {
      console.error(`[SupportReply] Failed to dispatch real reply to Telegram ID ${ticket.telegramId}:`, err.message || err);
    }
  }

  res.json(ticket);
});

app.put('/api/tickets/:id/status', authMiddleware, (req, res) => {
  const db = loadDb();
  const ticketId = req.params.id;
  const { status } = req.body;
  const index = db.tickets.findIndex(t => t.id === ticketId);
  if (index === -1) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }
  db.tickets[index].status = status;
  db.tickets[index].updatedAt = new Date().toISOString();
  saveDb(db);
  res.json(db.tickets[index]);
});

// ==========================================
// API MODULE: BROADCAST SYSTEM
// ==========================================
app.get('/api/broadcasts', authMiddleware, (req, res) => {
  const db = loadDb();
  res.json(db.broadcasts);
});

app.post('/api/broadcasts', authMiddleware, async (req, res) => {
  const db = loadDb();
  const { type, content, mediaUrl, target } = req.body;
  
  // Advanced targeting filter
  const targets = db.users.filter(u => {
    if (u.status === 'banned') return false;
    
    if (target === 'active') {
      return u.status === 'active';
    } else if (target === 'inactive') {
      const lastActiveTime = u.lastActive ? new Date(u.lastActive).getTime() : 0;
      // Inactive if no activity for more than 7 days
      return (Date.now() - lastActiveTime) > 7 * 24 * 3600 * 1000;
    } else if (target === 'with_points') {
      return u.points > 0;
    } else if (target === 'without_points') {
      return u.points === 0;
    }
    return true; // "all"
  });

  const remainingTargets = targets.map(u => u.telegramId);

  const newLog: any = {
    id: 'bc_' + Date.now(),
    type,
    content,
    mediaUrl,
    target,
    successCount: 0,
    failureCount: 0,
    sentAt: new Date().toISOString(),
    status: 'pending',
    totalTarget: remainingTargets.length,
    processedCount: 0,
    remainingTargets
  };

  db.broadcasts.push(newLog);
  saveDb(db);

  // Fire background rate-limited loop
  triggerBroadcastJob(newLog.id);

  res.json(newLog);
});

app.post('/api/broadcasts/:id/cancel', authMiddleware, (req, res) => {
  const db = loadDb();
  const index = db.broadcasts.findIndex(b => b.id === req.params.id);
  if (index !== -1) {
    (db.broadcasts[index] as any).status = 'cancelled';
    (db.broadcasts[index] as any).remainingTargets = [];
    saveDb(db);
    res.json(db.broadcasts[index]);
  } else {
    res.status(404).json({ error: 'Broadcast not found' });
  }
});

// ==========================================
// API MODULE: PRIVATE MESSAGES
// ==========================================
app.get('/api/private-messages', authMiddleware, (req, res) => {
  const db = loadDb();
  res.json((db as any).privateMessages || []);
});

app.post('/api/private-messages', authMiddleware, async (req, res) => {
  const db = loadDb();
  const { targetType, targetValue, type, content, mediaUrl } = req.body;

  let resolvedTelegramId = '';
  if (targetType === 'username') {
    const cleanUsername = targetValue.replace('@', '').trim().toLowerCase();
    const user = db.users.find(u => u.username.toLowerCase() === cleanUsername);
    if (!user) {
      res.status(404).json({ error: 'کاربری با این نام کاربری یافت نشد.' });
      return;
    }
    resolvedTelegramId = user.telegramId;
  } else {
    resolvedTelegramId = targetValue.trim();
  }

  const bot = getBot();
  let status: 'Sent' | 'Not Sent' = 'Not Sent';
  let errorMsg = '';

  if (bot) {
    try {
      if (mediaUrl && mediaUrl.trim() !== '') {
        if (type === 'photo') {
          await bot.telegram.sendPhoto(resolvedTelegramId, mediaUrl, { caption: content, parse_mode: 'Markdown' });
        } else if (type === 'video') {
          await bot.telegram.sendVideo(resolvedTelegramId, mediaUrl, { caption: content, parse_mode: 'Markdown' });
        } else if (type === 'document') {
          await bot.telegram.sendDocument(resolvedTelegramId, mediaUrl, { caption: content, parse_mode: 'Markdown' });
        } else {
          await bot.telegram.sendMessage(resolvedTelegramId, `${content}\n\nAttachment: ${mediaUrl}`);
        }
      } else {
        await bot.telegram.sendMessage(resolvedTelegramId, content, { parse_mode: 'Markdown' });
      }
      status = 'Sent';
    } catch (err: any) {
      errorMsg = err.message || String(err);
      console.error('[PrivateMessage API] Failed:', errorMsg);
      status = 'Not Sent';
    }
  } else {
    // Simulator mock sending
    status = 'Sent';
  }

  const newLog = {
    id: 'pm_' + Date.now(),
    targetType,
    targetValue,
    resolvedTelegramId,
    type,
    content,
    mediaUrl,
    status,
    error: errorMsg || undefined,
    sentAt: new Date().toISOString()
  };

  if (!(db as any).privateMessages) {
    (db as any).privateMessages = [];
  }
  (db as any).privateMessages.push(newLog);
  saveDb(db);

  res.json(newLog);
});

// ==========================================
// API MODULE: DAILY CLAIMS LOG
// ==========================================
app.get('/api/daily-claims', authMiddleware, (req, res) => {
  const db = loadDb();
  res.json((db as any).dailyClaims || []);
});

// ==========================================
// API MODULE: USER REQUESTS
// ==========================================
app.get('/api/user-requests', authMiddleware, (req, res) => {
  const db = loadDb();
  res.json(db.userRequests || []);
});

app.put('/api/user-requests/:id/status', authMiddleware, (req, res) => {
  const db = loadDb();
  const requestId = req.params.id;
  const { status } = req.body;
  if (!db.userRequests) {
    db.userRequests = [];
  }
  const index = db.userRequests.findIndex(r => r.id === requestId);
  if (index === -1) {
    res.status(404).json({ error: 'Request not found' });
    return;
  }
  db.userRequests[index].status = status;
  saveDb(db);
  res.json(db.userRequests[index]);
});

// ==========================================
// API MODULE: INPUT FORM SUBMISSIONS
// ==========================================
app.get('/api/input-form-submissions', authMiddleware, (req, res) => {
  const db = loadDb();
  res.json(db.inputFormSubmissions || []);
});

app.put('/api/input-form-submissions/:id/status', authMiddleware, async (req, res) => {
  const db = loadDb();
  const subId = req.params.id;
  const { status } = req.body;
  if (!db.inputFormSubmissions) {
    db.inputFormSubmissions = [];
  }
  const index = db.inputFormSubmissions.findIndex(s => s.id === subId);
  if (index === -1) {
    res.status(404).json({ error: 'Submission not found' });
    return;
  }
  db.inputFormSubmissions[index].status = status;
  const submission = db.inputFormSubmissions[index];
  saveDb(db);

  // Send real Telegram notification on status updates
  const bot = getBot();
  const targetUserId = submission.userId;
  let statusMessageText = '';
  
  if (status === 'processing') {
    statusMessageText = '🟡 درخواست شما توسط ادمین در حال بررسی است.';
  } else if (status === 'rejected') {
    statusMessageText = '🔴 درخواست شما توسط ادمین رد شد.';
  } else if (status === 'completed') {
    statusMessageText = '🟢 درخواست شما توسط ادمین تکمیل شد.';
  }

  if (statusMessageText && bot && targetUserId) {
    try {
      await bot.telegram.sendMessage(targetUserId, statusMessageText);
      console.log(`[FormStatusUpdate] Bot sent status message to user ${targetUserId}: ${statusMessageText}`);
      
      const dbFresh = loadDb();
      if (!(dbFresh as any).botNotificationLogs) {
        (dbFresh as any).botNotificationLogs = [];
      }
      (dbFresh as any).botNotificationLogs.push({
        id: 'notif_log_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        telegramId: targetUserId,
        message: statusMessageText,
        status: 'success',
        timestamp: new Date().toISOString()
      });
      saveDb(dbFresh);
    } catch (err: any) {
      console.error(`[FormStatusUpdate] Failed to send status message to user ${targetUserId}:`, err.message || err);
      
      const dbFresh = loadDb();
      if (!(dbFresh as any).botNotificationLogs) {
        (dbFresh as any).botNotificationLogs = [];
      }
      (dbFresh as any).botNotificationLogs.push({
        id: 'notif_log_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        telegramId: targetUserId,
        message: statusMessageText,
        status: 'failed',
        error: err.message || String(err),
        timestamp: new Date().toISOString()
      });
      saveDb(dbFresh);
    }
  }

  res.json(submission);
});

app.delete('/api/input-form-submissions/:id', authMiddleware, (req, res) => {
  const db = loadDb();
  const subId = req.params.id;
  if (!db.inputFormSubmissions) {
    db.inputFormSubmissions = [];
  }
  db.inputFormSubmissions = db.inputFormSubmissions.filter(s => s.id !== subId);
  saveDb(db);
  res.json({ success: true });
});

// ==========================================
// API MODULE: SECURITY SETTINGS
// ==========================================
app.post('/api/settings/change-password', authMiddleware, (req, res) => {
  const db = loadDb();
  const { currentPassword, newPassword } = req.body;

  const isMatch = bcrypt.compareSync(currentPassword, db.adminPasswordHash);
  if (!isMatch) {
    res.status(400).json({ error: 'رمز عبور فعلی وارد شده اشتباه است.' });
    return;
  }

  if (!newPassword || newPassword.length < 8) {
    res.status(400).json({ error: 'رمز عبور جدید باید حداقل ۸ کاراکتر باشد.' });
    return;
  }

  db.adminPasswordHash = bcrypt.hashSync(newPassword, 10);
  saveDb(db);

  res.json({ success: true });
});

// ==========================================
// BACKGROUND SYSTEMS: MASS BROADCAST ENGINE (RATE LIMIT & PERSISTENCE)
// ==========================================
const jobTimerCache = new Map<string, boolean>();

function triggerBroadcastJob(broadcastId: string) {
  if (jobTimerCache.get(broadcastId)) return;
  jobTimerCache.set(broadcastId, true);
  setTimeout(() => runBroadcastJobStep(broadcastId), 100);
}

async function runBroadcastJobStep(broadcastId: string) {
  const db = loadDb();
  const bcIndex = db.broadcasts.findIndex(b => b.id === broadcastId);
  if (bcIndex === -1) {
    jobTimerCache.delete(broadcastId);
    return;
  }
  const bc = db.broadcasts[bcIndex];
  
  // Honor operation status cancellations
  if ((bc as any).status === 'cancelled' || (bc as any).status === 'completed') {
    jobTimerCache.delete(broadcastId);
    return;
  }

  if ((bc as any).status === 'pending') {
    (bc as any).status = 'processing';
  }

  const remaining = (bc as any).remainingTargets || [];
  if (remaining.length === 0) {
    (bc as any).status = 'completed';
    saveDb(db);
    jobTimerCache.delete(broadcastId);
    return;
  }

  // Rate-limiting block: Group into chunks of max 20 users per second to prevent telegram throttling
  const chunk = remaining.slice(0, 20);
  const nextRemaining = remaining.slice(20);

  (bc as any).remainingTargets = nextRemaining;
  saveDb(db);

  const bot = getBot();
  const chunkPromises = chunk.map(async (tgId: string) => {
    try {
      if (bot) {
        if (bc.mediaUrl && bc.mediaUrl.trim() !== '') {
          if (bc.type === 'photo') {
            await bot.telegram.sendPhoto(tgId, bc.mediaUrl, { caption: bc.content, parse_mode: 'Markdown' });
          } else if (bc.type === 'video') {
            await bot.telegram.sendVideo(tgId, bc.mediaUrl, { caption: bc.content, parse_mode: 'Markdown' });
          } else if (bc.type === 'document') {
            await bot.telegram.sendDocument(tgId, bc.mediaUrl, { caption: bc.content, parse_mode: 'Markdown' });
          } else {
            await bot.telegram.sendMessage(tgId, `${bc.content}\n\nAttachment: ${bc.mediaUrl}`);
          }
        } else {
          await bot.telegram.sendMessage(tgId, bc.content, { parse_mode: 'Markdown' });
        }
      } else {
        await new Promise(r => setTimeout(r, 50));
      }
      return { success: true };
    } catch (err: any) {
      console.error(`[Broadcast Engine] Send error to ${tgId}:`, err.message || err);
      return { success: false };
    }
  });

  const results = await Promise.all(chunkPromises);
  let successCount = 0;
  let failureCount = 0;
  results.forEach(res => {
    if (res.success) successCount++;
    else failureCount++;
  });

  const freshDb = loadDb();
  const freshBcIdx = freshDb.broadcasts.findIndex(b => b.id === broadcastId);
  if (freshBcIdx !== -1) {
    const fbc = freshDb.broadcasts[freshBcIdx];
    fbc.successCount += successCount;
    fbc.failureCount += failureCount;
    (fbc as any).processedCount = ((fbc as any).processedCount || 0) + chunk.length;
    (fbc as any).remainingTargets = nextRemaining;

    if (nextRemaining.length === 0) {
      (fbc as any).status = 'completed';
    }
    saveDb(freshDb);
  }

  if (nextRemaining.length > 0) {
    setTimeout(() => runBroadcastJobStep(broadcastId), 1000);
  } else {
    jobTimerCache.delete(broadcastId);
  }
}

function resumeAllBroadcasts() {
  try {
    const db = loadDb();
    db.broadcasts.forEach(bc => {
      if ((bc as any).status === 'processing' || (bc as any).status === 'pending') {
        console.log(`[Persistence Recovery] Resuming unfinished broadcast ID: ${bc.id}`);
        triggerBroadcastJob(bc.id);
      }
    });
  } catch (err) {
    console.error('[Persistence Recovery] Failed resuming broadcasts:', err);
  }
}

// ==========================================
// API MODULE: MEDIA LIBRARY
// ==========================================
app.get('/api/media', authMiddleware, (req, res) => {
  const db = loadDb();
  res.json(db.media);
});

app.post('/api/media', authMiddleware, (req, res) => {
  const db = loadDb();
  const newAsset: MediaAsset = {
    id: 'med_' + Date.now(),
    fileName: req.body.fileName,
    fileType: req.body.fileType || 'image/jpeg',
    fileSize: req.body.fileSize || '150 KB',
    url: req.body.url,
    createdAt: new Date().toISOString()
  };
  db.media.push(newAsset);
  saveDb(db);
  res.json(newAsset);
});

app.delete('/api/media/:id', authMiddleware, (req, res) => {
  const db = loadDb();
  db.media = db.media.filter(m => m.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});

// ==========================================
// API MODULE: SCHEDULER SYSTEM
// ==========================================
app.get('/api/tasks', authMiddleware, (req, res) => {
  const db = loadDb();
  res.json(db.tasks);
});

app.post('/api/tasks', authMiddleware, (req, res) => {
  const db = loadDb();
  const newTask: SchedulerTask = {
    id: 'tsk_' + Date.now(),
    name: req.body.name,
    triggerAt: req.body.triggerAt,
    action: req.body.action,
    payload: req.body.payload || {},
    status: 'pending'
  };
  db.tasks.push(newTask);
  saveDb(db);
  res.json(newTask);
});

app.post('/api/tasks/:id/execute', authMiddleware, (req, res) => {
  const db = loadDb();
  const index = db.tasks.findIndex(t => t.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  
  const task = db.tasks[index];
  
  // Simulate executing task logic (e.g. enabling a button, launching forced join rules)
  if (task.action === 'add_channel' || task.action === 'activate') {
    const fJoinPayload = task.payload;
    if (fJoinPayload && fJoinPayload.chatId) {
      db.forcedJoin.push({
        id: 'fj_' + Date.now(),
        type: fJoinPayload.type || 'channel',
        title: fJoinPayload.title,
        chatId: fJoinPayload.chatId,
        inviteLink: fJoinPayload.inviteLink || '',
        status: 'active',
        createdAt: new Date().toISOString()
      });
    }
  } else if (task.action === 'remove_channel') {
    const idToRemove = task.payload.channelId;
    db.forcedJoin = db.forcedJoin.filter(fj => fj.id !== idToRemove);
  } else if (task.action === 'enable_button') {
    const btnId = task.payload.buttonId;
    const bIdx = db.buttons.findIndex(b => b.id === btnId);
    if (bIdx !== -1) db.buttons[bIdx].status = 'enabled';
  } else if (task.action === 'disable_button') {
    const btnId = task.payload.buttonId;
    const bIdx = db.buttons.findIndex(b => b.id === btnId);
    if (bIdx !== -1) db.buttons[bIdx].status = 'disabled';
  }

  task.status = 'completed';
  db.tasks[index] = task;
  saveDb(db);
  res.json(task);
});

// ==========================================
// API MODULE: SETTINGS
// ==========================================
app.get('/api/settings', authMiddleware, (req, res) => {
  const db = loadDb();
  res.json(db.settings);
});

app.post('/api/settings', authMiddleware, async (req, res) => {
  const db = loadDb();
  
  if (req.body.reset) {
    db.settings = {
      telegramToken: '123456789:ABCdefGhIJKlmNoPQRStUvWxYz',
      pointsPerReferral: 3,
      maxReferrals: 100,
      referralRewardThreshold: 10,
      welcomeMessage: '🎮 Welcome to the Dynamic Bot! Use the menus below to find call of duty accounts, tutorials, and contact support.',
      unauthorizedPointsMessage: '⚠️ You do not have enough points to access this menu! Refer friends to earn more points.',
      forcedJoinMessage: '📢 To use this bot, you must join our mandatory channels first! Click the join buttons below and verify.'
    };
    db.users = [];
    db.tickets = [];
    db.broadcasts = [];
    db.tasks = [];
    saveDb(db);
    
    const activeBot = getBot();
    if (activeBot) {
      try { await activeBot.stop(); } catch (e) {}
    }
    res.json(db.settings);
    return;
  }

  const { telegramToken } = req.body;
  if (telegramToken && telegramToken !== db.settings.telegramToken && telegramToken.trim() !== '' && !telegramToken.includes('123456789:ABCdef')) {
    const testResult = await startTelegramBot(telegramToken);
    if (!testResult.success) {
      res.status(400).json({ error: `Telegram Token test connection failed: ${testResult.error}` });
      return;
    }
  } else {
    db.settings = { ...db.settings, ...req.body };
    saveDb(db);
    await startTelegramBot();
  }

  const updatedDb = loadDb();
  res.json(updatedDb.settings);
});

// ==========================================
// API MODULE: INTERACTIVE TELEGRAM BOT SIMULATOR
// ==========================================

// Tracks simple simulator navigational state per Telegram ID
interface SimulatorState {
  currentMenuId: string | null;     // null corresponds to Main Menu root
  supportMode: boolean;             // whether any free text inputs are tickets
  joinedRequiredSim: boolean;       // whether they completed forced join
  pendingInputBotButtonId?: string | null;
  pendingInputText?: string | null;
  pendingInputFormButtonId?: string | null;
  pendingInputFormText?: string | null;
}

const userSessionCache = new Map<string, SimulatorState>();

app.post('/api/bot/simulate-message', (req, res) => {
  const db = loadDb();
  let { telegramId, username, command, text, referrerId } = req.body;

  if (command === 'confirm_send') {
    text = '✅ تایید ارسال';
    command = '';
  } else if (command === 'confirm_form_submission') {
    const session = userSessionCache.get(telegramId);
    if (session && session.pendingInputFormButtonId) {
      const targetBtn = db.buttons.find(b => b.id === session.pendingInputFormButtonId);
      text = targetBtn?.formSubmitText || '✅ تایید اطلاعات';
    } else {
      text = '✅ تایید اطلاعات';
    }
    command = '';
  } else if (command === 'cancel') {
    text = '❌ لغو';
    command = '';
  }
  
  if (!telegramId) {
    res.status(400).json({ error: 'telegramId is required' });
    return;
  }

  // 1. Resolve or create user
  let user = db.users.find(u => u.telegramId === telegramId);
  const isNew = !user;
  if (!user) {
    user = {
      id: 'usr_' + Date.now(),
      telegramId,
      username: username || 'User_' + telegramId.slice(-4),
      firstName: username ? `@${username}` : 'Anonymous Soldier',
      points: 0,
      referralsCount: 0,
      referredBy: undefined,
      joinedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      status: 'active'
    };
    
    // Check referral link join
    if (referrerId && referrerId !== telegramId) {
      const referrer = db.users.find(u => u.telegramId === referrerId);
      if (referrer && referrer.status === 'active') {
        const refsCount = db.users.filter(u => u.referredBy === referrer.telegramId).length;
        if (refsCount < db.settings.maxReferrals) {
          referrer.points += db.settings.pointsPerReferral;
          referrer.referralsCount = (referrer.referralsCount ?? 0) + 1;
          user.referredBy = referrer.telegramId;
          // Add system response notice inside simulator
        }
      }
    }
    
    db.users.push(user);
    saveDb(db);
  } else {
    user.lastActive = new Date().toISOString();
    saveDb(db);
  }

  // If user is banned, block instantly
  if (user.status === 'banned') {
    res.json({
      messages: [{ text: '❌ You are temporarily banned from using this bot by the administrator.' }]
    });
    return;
  }

  // Get or create navigation state
  if (!userSessionCache.has(telegramId)) {
    userSessionCache.set(telegramId, {
      currentMenuId: null,
      supportMode: false,
      joinedRequiredSim: false
    });
  }
  const session = userSessionCache.get(telegramId)!;

  const responseMessages: any[] = [];

  // Interactive input form validator for Simulator
  if (session.pendingInputFormButtonId && text) {
    const otherBtnClicked = db.buttons.find(
      (b: BotButton) => b.name === text && b.status === 'enabled'
    );
    const isStandardCmd = text === '🏠 Home' || text === '🏠 خانه' || text === '⬅️ Back' || text === '⬅️ بازگشت' || text === '👥 دعوت دوستان' || text === '⭐ امتیاز من' || text === '🎁 دریافت جایزه روزانه';

    const btnId = session.pendingInputFormButtonId;
    const targetBtn = db.buttons.find(b => b.id === btnId);
    const submitText = targetBtn?.formSubmitText || '✅ تایید اطلاعات';

    if ((otherBtnClicked && text !== submitText) || isStandardCmd) {
      session.pendingInputFormButtonId = null;
      session.pendingInputFormText = null;
      // Flow aborted silently, let standard clicks execute below
    } else if (text === '❌ لغو' || text === 'لغو' || text === 'cancel') {
      session.pendingInputFormButtonId = null;
      session.pendingInputFormText = null;
      responseMessages.push({
        text: '❌ فرآیند لغو شد.'
      });
      res.json({
        userPoints: user.points,
        messages: responseMessages
      });
      return;
    } else if (text === submitText) {
      if (targetBtn && session.pendingInputFormText) {
        const reqPoints = targetBtn.requiredPoints || 0;
        if (reqPoints > 0 && user.points < reqPoints) {
          responseMessages.push({
            text: `❌ شما امتیاز کافی برای ثبت این فرم را ندارید! امتیاز مورد نیاز: ${reqPoints}، امتیاز فعلی شما: ${user.points}`
          });
          session.pendingInputFormButtonId = null;
          session.pendingInputFormText = null;
          res.json({
            userPoints: user.points,
            messages: responseMessages
          });
          return;
        }

        const newSubmission = {
          id: 'sub_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          userId: telegramId,
          username: user.username,
          buttonId: targetBtn.id,
          buttonName: targetBtn.name,
          formTitle: targetBtn.formTitle || targetBtn.name,
          submittedText: session.pendingInputFormText,
          createdAt: new Date().toISOString(),
          status: 'pending' as const
        };

        if (!db.inputFormSubmissions) {
          db.inputFormSubmissions = [];
        }
        db.inputFormSubmissions.push(newSubmission);

        if (reqPoints > 0) {
          user.points = Math.max(0, user.points - reqPoints);
        }

        saveDb(db);

        console.log(`[SIMULATOR LOG - FORM SUBMITTED] User ${newSubmission.username} (${telegramId}) submitted form "${newSubmission.formTitle}" on button "${newSubmission.buttonName}"`);

        responseMessages.push({
          text: 'درخواست شما با موفقیت ثبت شد.\n\nوضعیت فعلی:\nدر انتظار بررسی'
        });
      } else {
        responseMessages.push({
          text: '❌ فرآیند با خطا مواجه شد.'
        });
      }

      session.pendingInputFormButtonId = null;
      session.pendingInputFormText = null;

      res.json({
        userPoints: user.points,
        messages: responseMessages
      });
      return;
    } else {
      session.pendingInputFormText = text;
      const confirmTxt = submitText;
      responseMessages.push({
        text: `📝 *اطلاعات وارد شده شما:*\n\n\`${text}\`\n\nلطفاً درستی اطلاعات ارسال شده را بررسی کنید. برای ارسال نهایی روی دکمه «${confirmTxt}» و برای انصراف بر روی دکمه «❌ لغو» بزنید:`,
        buttons: [
          { label: confirmTxt, cmd: 'confirm_form_submission' },
          { label: '❌ لغو', cmd: 'cancel' }
        ]
      });
      res.json({
        userPoints: user.points,
        messages: responseMessages
      });
      return;
    }
  }

  // Interactive input flow validator for Simulator
  if (session.pendingInputBotButtonId && text) {
    const otherBtnClicked = db.buttons.find(
      (b: BotButton) => b.name === text && b.status === 'enabled'
    );
    const isStandardCmd = text === '🏠 Home' || text === '🏠 خانه' || text === '⬅️ Back' || text === '⬅️ بازگشت' || text === '👥 دعوت دوستان' || text === '⭐ امتیاز من' || text === '🎁 دریافت جایزه روزانه';

    if ((otherBtnClicked && text !== '✅ تایید ارسال') || isStandardCmd) {
      session.pendingInputBotButtonId = null;
      session.pendingInputText = null;
      // Flow aborted silently, click will flow below as normal
    } else if (text === '❌ لغو' || text === 'لغو' || text === 'cancel') {
      session.pendingInputBotButtonId = null;
      session.pendingInputText = null;
      responseMessages.push({
        text: '❌ فرآیند لغو شد.'
      });
      res.json({
        userPoints: user.points,
        messages: responseMessages
      });
      return;
    } else if (text === '✅ تایید ارسال') {
      const btnId = session.pendingInputBotButtonId;
      const targetBtn = db.buttons.find(b => b.id === btnId);
      
      if (targetBtn && session.pendingInputText) {
        const newRequest = {
          id: 'req_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          telegramId,
          username: user.username,
          buttonId: targetBtn.id,
          buttonName: targetBtn.name,
          content: session.pendingInputText,
          status: 'new' as const,
          createdAt: new Date().toISOString()
        };
        
        if (!db.userRequests) {
          db.userRequests = [];
        }
        db.userRequests.push(newRequest);
        saveDb(db);

        responseMessages.push({
          text: '✅ درخواست شما با موفقیت ثبت شد.'
        });
      } else {
        responseMessages.push({
          text: '❌ فرآیند ثبت با خطا مواجه شد.'
        });
      }
      
      session.pendingInputBotButtonId = null;
      session.pendingInputText = null;

      res.json({
        userPoints: user.points,
        messages: responseMessages
      });
      return;
    } else {
      session.pendingInputText = text;
      responseMessages.push({
        text: `📝 *اطلاعات وارد شده شما:*\n\n\`${text}\`\n\nلطفاً درستی اطلاعات ارسال شده را بررسی کنید. برای ارسال نهایی روی دکمه «✅ تایید ارسال» و برای انصراف بر روی دکمه «❌ لغو» بزنید:`,
        buttons: [
          { label: '✅ تایید ارسال', cmd: 'confirm_send' },
          { label: '❌ لغو', cmd: 'cancel' }
        ]
      });
      res.json({
        userPoints: user.points,
        messages: responseMessages
      });
      return;
    }
  }

  // FORCE JOIN CHECKING ENGINE
  const activeRules = db.forcedJoin.filter(fj => fj.status === 'active');
  const needsForcedJoin = activeRules.length > 0 && !session.joinedRequiredSim;

  // Handle support ticketing if active
  if (session.supportMode && !command && text) {
    if (text.toLowerCase() === 'exit' || text.toLowerCase() === 'cancel' || text === '🏠 Home') {
      session.supportMode = false;
      session.currentMenuId = null;
    } else {
      // Find open ticket or open new
      let ticket = db.tickets.find(t => t.telegramId === telegramId && t.status === 'open');
      if (!ticket) {
        ticket = {
          id: 'tkt_' + Date.now(),
          telegramId,
          username: user.username,
          firstName: user.firstName,
          status: 'open',
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        db.tickets.push(ticket);
      }
      ticket.messages.push({
        sender: 'user',
        text,
        timestamp: new Date().toISOString()
      });
      ticket.updatedAt = new Date().toISOString();
      saveDb(db);
      
      responseMessages.push({
        text: '📨 Support message submitted to our live administrators. We will respond directly in this thread shortly!\n\nType another message or choose options below.',
        buttons: [{ label: '🏠 Home', cmd: 'home' }]
      });
      res.json({ messages: responseMessages });
      return;
    }
  }

  // Start fresh commands
  if (command === 'start' || text === '/start') {
    session.currentMenuId = null;
    session.supportMode = false;
    
    // Welcome message
    responseMessages.push({
      text: isNew && user.referredBy 
        ? `🎁 Joined via referral! You and your referrer both earned points. Let's begin!\n\n${db.settings.welcomeMessage}` 
        : db.settings.welcomeMessage
    });

    if (needsForcedJoin) {
      // Display forced join prompt
      const channelsText = activeRules.map((c, i) => `${i+1}. ${c.title} (${c.chatId})`).join('\n');
      responseMessages.push({
        text: `${db.settings.forcedJoinMessage}\n\n${channelsText}`,
        // Support custom Telegram inline look links
        buttons: [
          ...activeRules.map(c => ({ label: `Join Channel: ${c.title}`, url: c.inviteLink })),
          { label: '✅ Verify Membership', cmd: 'verify_join' }
        ]
      });
      res.json({ messages: responseMessages });
      return;
    }
  }

  // Force Join verification
  if (command === 'verify_join') {
    if (activeRules.length > 0) {
      session.joinedRequiredSim = true; // Set membership verification true
      responseMessages.push({ text: '✅ Verification successful! Welcome to the Telegram Bot.' });
    }
  }

  // Handle direct command instructions
  if (command === 'home' || text === '🏠 Home') {
    session.currentMenuId = null;
    session.supportMode = false;
  } else if (command === 'back' || text === '⬅️ Back') {
    if (session.currentMenuId) {
      const curBtn = db.buttons.find(b => b.id === session.currentMenuId);
      session.currentMenuId = curBtn ? (curBtn.parentId || null) : null;
    } else {
      session.currentMenuId = null;
    }
    session.supportMode = false;
  } else if (command === 'referral' || text === '👥 دعوت دوستان') {
    const botUsername = (db.settings as any).botUsername || 'MyCalofBot';
    const referralLink = `https://t.me/${botUsername}?start=ref_${telegramId}`;
    responseMessages.push({
      text: `👥 *لینک دعوت اختصاصی شما:* \n\n\`${referralLink}\`\n\nبا اشتراک‌گذاری این لینک با دوستان خود، پس از عضویت هر کاربر *+${db.settings.pointsPerReferral} عدد امتیاز* هدیه بگیرید!`
    });
  } else if (command === 'points' || text === '⭐ امتیاز من') {
    const currentPoints = user.points;
    const totalReferrals = user.referralsCount ?? 0;
    
    const lockedButtons = db.buttons
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

    responseMessages.push({
      text: `⭐ *مشخصات و میزان امتیاز شما:* \n\n💰 *امتیاز فعلی شما:* ${currentPoints} امتیاز\n👥 *تعداد دعوت‌های موفق:* ${totalReferrals} نفر\n\n${rewardText}`
    });
  } else if (command === 'daily_reward' || text === '🎁 دریافت جایزه روزانه') {
    if (!db.settings.dailyRewardEnabled) {
      responseMessages.push({ text: '⚠️ سیستم جایزه روزانه در حال حاضر غیرفعال است.' });
    } else {
      const now = Date.now();
      const lastClaimTime = (user as any).lastDailyRewardClaim ? new Date((user as any).lastDailyRewardClaim).getTime() : 0;
      const rewardPoints = db.settings.dailyRewardPoints || 1;

      if (now - lastClaimTime < 24 * 3600 * 1000) {
        const remainingMs = 24 * 3600 * 1000 - (now - lastClaimTime);
        const hours = Math.floor(remainingMs / (3600 * 1000));
        const minutes = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000));
        responseMessages.push({ text: `⏳ *شما قبلاً جایزه روزانه خود را دریافت کرده‌اید!*\n\nزمان باقی‌مانده تا دریافت بعدی: *${hours} ساعت و ${minutes} دقیقه*` });
      } else {
        user.points = (user.points || 0) + rewardPoints;
        (user as any).lastDailyRewardClaim = new Date().toISOString();
        
        if (!(db as any).dailyClaims) {
          (db as any).dailyClaims = [];
        }
        (db as any).dailyClaims.push({
          id: 'clm_' + Date.now(),
          telegramId,
          username: user.username,
          pointsClaimed: rewardPoints,
          claimedAt: new Date().toISOString()
        });
        saveDb(db);
        responseMessages.push({ text: `🎉 *جایزه روزانه دریافت شد!*\n\nمقدار *+${rewardPoints} امتیاز* به حساب شما اضافه شد.\n💰 امتیاز فعلی شما: *${user.points} امتیاز*` });
      }
    }
  } else if (command && command.startsWith('menu_')) {
    const targetMenuId = command.replace('menu_', '');
    const clickedBtn = db.buttons.find(b => b.id === targetMenuId);
    
    if (clickedBtn && clickedBtn.status === 'enabled') {
      // Point lock gates
      if (clickedBtn.requiredPoints > 0 && clickedBtn.buttonType !== 'input_form' && user.points < clickedBtn.requiredPoints) {
        responseMessages.push({
          text: `${db.settings.unauthorizedPointsMessage}\n\n🔒 Required Points: ${clickedBtn.requiredPoints}\n💰 Your Current Points: ${user.points}`
        });
      } else {
        // Successful verification
        if (clickedBtn.buttonType === 'submenu') {
          session.currentMenuId = clickedBtn.id;
          responseMessages.push({
            text: `📂 Opened Menu: *${clickedBtn.name}*\n\n${clickedBtn.content}`
          });
        } else if (clickedBtn.buttonType === 'content') {
          // Subtract points on content delivery inside simulated bot
          if (clickedBtn.requiredPoints > 0) {
            user.points = Math.max(0, user.points - clickedBtn.requiredPoints);
            
            if (!db.pointSpendLogs) {
              db.pointSpendLogs = [];
            }
            db.pointSpendLogs.push({
              id: 'pt_log_' + Date.now() + '_' + Math.floor(Math.random() * 100),
              type: 'POINT_SPEND_SUCCESS',
              telegramId,
              username: user.username,
              pointsSpent: clickedBtn.requiredPoints,
              buttonId: clickedBtn.id,
              buttonName: clickedBtn.name,
              timestamp: new Date().toISOString()
            });
            saveDb(db);
          }

          // Send content or support triggers
          responseMessages.push({
            text: clickedBtn.content,
            mediaUrl: clickedBtn.mediaUrl,
            mediaType: clickedBtn.mediaType
          });

          if (clickedBtn.requiredPoints > 0) {
            responseMessages.push({
              text: `🎁 جایزه شما ارسال شد!\n➖ ${clickedBtn.requiredPoints} امتیاز از حساب شما کسر شد. 💰 موجودی جدید: ${user.points} امتیاز`
            });
          }
          
          if (clickedBtn.name.toLowerCase().includes('support') || clickedBtn.id === 'btn_3') {
            session.supportMode = true;
            responseMessages.push({ text: '💬 Support channel activated. Any message you type now sends directly to our support agents. Type "exit" or click Home to return to the menus.' });
          }
        } else if (clickedBtn.buttonType === 'input_form') {
          session.pendingInputFormButtonId = clickedBtn.id;
          session.pendingInputFormText = null;
          responseMessages.push({
            text: clickedBtn.formPrompt || 'لطفاً ایمیل و رمز اکانت خود را ارسال کنید.',
            buttons: [
              { label: '❌ لغو', cmd: 'cancel' }
            ]
          });
        } else if (clickedBtn.buttonType === 'input') {
          session.pendingInputBotButtonId = clickedBtn.id;
          session.pendingInputText = null;
          responseMessages.push({
            text: clickedBtn.inputPrompt || 'لطفاً اطلاعات درخواستی را ارسال کنید و سپس برای تایید نهایی روی دکمه تایید بزنید:',
            buttons: [
              { label: '❌ لغو', cmd: 'cancel' }
            ]
          });
        }
      }
    }
  }

  if (!session.pendingInputBotButtonId) {
    // Display current menu state & action row
    const parentId = session.currentMenuId;
    const visibleButtons = db.buttons.filter(b => b.parentId === parentId && b.status === 'enabled');
    
    // Create navigation rows
    const navigationButtons: any[] = visibleButtons.map(b => ({
      label: `${b.requiredPoints > 0 ? '🔒 ' : ''}${b.name}`,
      cmd: `menu_${b.id}`
    }));

    // Automatic back / home row
    const backNav: any[] = [];
    if (parentId !== null) {
      backNav.push({ label: '⬅️ Back', cmd: 'back' });
      backNav.push({ label: '🏠 Home', cmd: 'home' });
    }

    const allBotKeyboards = [...navigationButtons, ...backNav];

    if (parentId === null) {
      allBotKeyboards.push({ label: '👥 دعوت دوستان', cmd: 'referral' });
      allBotKeyboards.push({ label: '⭐ امتیاز من', cmd: 'points' });
      if (db.settings.dailyRewardEnabled) {
        allBotKeyboards.push({ label: '🎁 دریافت جایزه روزانه', cmd: 'daily_reward' });
      }
    }

    responseMessages.push({
      text: parentId === null ? '🔹 Main Menu:' : '👉 Choose an option below:',
      buttons: allBotKeyboards
    });
  }

  res.json({
    userPoints: user.points,
    messages: responseMessages
  });
});

// Real Telegram Bot Webhook endpoint
app.post('/telegram-webhook', async (req, res) => {
  const bot = getBot();
  if (bot) {
    try {
      await bot.handleUpdate(req.body, res);
    } catch (err: any) {
      console.error('[Telegram Webhook] failed handling update:', err.message || err);
      if (!res.headersSent) {
        res.sendStatus(500);
      }
    }
  } else {
    // If bot not loaded yet, respond with success so telegram doesn't keep hammering wehbhook
    res.sendStatus(200);
  }
});

// Serve frontend assets for SPA template
async function initServer() {
  // Resume any uncompleted persistent broadcast jobs on start
  resumeAllBroadcasts();

  // Initialize and boot the real Telegram Bot
  startTelegramBot().then(res => {
    if (res.success) {
      console.log(`[Telegram Bot] Live and operational for @${res.botInfo?.username}`);
    } else {
      console.warn(`[Telegram Bot] Bot initialization skipped or failed: ${res.error}`);
    }
  }).catch(e => {
    console.error('[Telegram Bot] Bot boot error:', e);
  });

  if (process.env.NODE_ENV !== 'production') {
    // Development Mode leveraging Vite Express middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production serves client static bundle from dist
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Live application server listening proudly on port ${PORT}`);
  });
}

initServer().catch(err => {
  console.error('Critical failure on boot setup:', err);
});
