// ==========================================
// MODULE: DATABASE MANAGEMENT
// PURPOSE: Handles local persistent storage using JSON structure
// ==========================================

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { 
  User, 
  BotButton, 
  ForcedJoinChannel, 
  SupportTicket, 
  BroadcastLog, 
  SchedulerTask, 
  MediaAsset, 
  SystemSettings,
  PrivateMessageLog,
  DailyClaim,
  UserRequest,
  PointSpendLog,
  InputFormSubmission
} from './types';

const DB_FILE = path.join(process.cwd(), 'db.json');

export interface DatabaseSchema {
  users: User[];
  buttons: BotButton[];
  forcedJoin: ForcedJoinChannel[];
  tickets: SupportTicket[];
  broadcasts: BroadcastLog[];
  tasks: SchedulerTask[];
  media: MediaAsset[];
  settings: SystemSettings;
  adminPasswordHash: string;
  privateMessages?: PrivateMessageLog[];
  dailyClaims?: DailyClaim[];
  userRequests?: UserRequest[];
  pointSpendLogs?: PointSpendLog[];
  inputFormSubmissions?: InputFormSubmission[];
}

const DEFAULT_SETTINGS: SystemSettings = {
  telegramToken: '123456789:ABCdefGhIJKlmNoPQRStUvWxYz',
  pointsPerReferral: 3,
  maxReferrals: 100,
  referralRewardThreshold: 10,
  welcomeMessage: '🎮 به ربات هوشمند کال آف دیوتی خوش آمدید! از دکمه‌های زیر برای دسترسی به اکانت‌های رایگان، راهنماها و بخش پشتیبانی استفاده کنید.',
  unauthorizedPointsMessage: '⚠️ شما امتیاز کافی برای باز کردن این منو ندارید! برای دریافت امتیاز رایگان، دوستان خود را با لینک اختصاصی‌تان دعوت کنید.',
  forcedJoinMessage: '📢 برای استفاده از این ربات، ابتدا باید عضو کانال‌های اجباری ما شوید! دکمه‌های عضویت زیر را لمس کرده و عضو شوید، سپس روی دکمه تایید عضویت کلیک کنید.'
};

const INITIAL_DB: DatabaseSchema = {
  users: [
    {
      id: 'usr_1',
      telegramId: '987654321',
      username: 'gamer_pro',
      firstName: 'الکس پرو',
      points: 8,
      referralsCount: 1,
      referredBy: undefined,
      joinedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
      lastActive: new Date().toISOString(),
      status: 'active'
    },
    {
      id: 'usr_2',
      telegramId: '223344556',
      username: 'cod_ninja',
      firstName: 'مارکوس نینجا',
      points: 1,
      referralsCount: 1,
      referredBy: '987654321',
      joinedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      lastActive: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      status: 'active'
    },
    {
      id: 'usr_3',
      telegramId: '556677889',
      username: 'toxic_camper',
      firstName: 'سارا کمپ',
      points: 15,
      referralsCount: 0,
      referredBy: undefined,
      joinedAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
      lastActive: new Date().toISOString(),
      status: 'active'
    },
    {
      id: 'usr_4',
      telegramId: '111222333',
      username: 'spammer_boy',
      firstName: 'جان اسپمر',
      points: 0,
      referralsCount: 0,
      referredBy: '223344556',
      joinedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      lastActive: new Date().toISOString(),
      status: 'banned'
    }
  ],
  buttons: [
    // Main Menus
    {
      id: 'btn_1',
      name: 'اکانت‌های رایگان کال آف دیوتی',
      parentId: null,
      requiredPoints: 0,
      buttonType: 'submenu',
      content: 'مشاهده لیست اکانت‌های پرمیوم و الیت کال آف دیوتی موجود.',
      status: 'enabled',
      visibility: 'public',
      order: 1
    },
    {
      id: 'btn_2',
      name: 'آموزش‌ها و راهنماها',
      parentId: null,
      requiredPoints: 0,
      buttonType: 'submenu',
      content: 'نکات، ترفندها و روش‌های کسب امتیاز و حفظ امنیت اکانت‌ها را بیاموزید.',
      status: 'enabled',
      visibility: 'public',
      order: 2
    },
    {
      id: 'btn_3',
      name: 'تماس با پشتیبانی',
      parentId: null,
      requiredPoints: 0,
      buttonType: 'content',
      content: 'اینجا به ما پیام دهید. سوال خود را تایپ کرده و ارسال کنید، تیم پشتیبانی ما سریعاً به شما پاسخ خواهد داد!',
      status: 'enabled',
      visibility: 'public',
      order: 3
    },
    // Sub-buttons for Free COD Accounts
    {
      id: 'btn_cod_1',
      name: 'اکانت پرمیوم ایکس باکس',
      parentId: 'btn_1',
      requiredPoints: 5,
      buttonType: 'content',
      content: '🎮 مشخصات اکانت پرمیوم ایکس باکس:\n📧 ایمیل: cod_xbox_premium_01@outlook.com\n🔑 رمز عبور: PremiumGamer2026\n⭐ وضعیت: لول ۱۵۰ + اسکین‌های ابسیدین کامو فعال',
      status: 'enabled',
      visibility: 'restricted',
      order: 1
    },
    {
      id: 'btn_cod_2',
      name: 'اکانت الیت پلی استیشن',
      parentId: 'btn_1',
      requiredPoints: 8,
      buttonType: 'content',
      content: '🎮 مشخصات اکانت الیت پلی استیشن (PSN):\n📧 ایمیل: cod_psn_elite_99@gmail.com\n🔑 رمز عبور: EliteSniper998\n⭐ وضعیت: بتل پس فصل ۵ فعال + دمشق آنلاک شده',
      status: 'enabled',
      visibility: 'restricted',
      order: 2
    },
    {
      id: 'btn_cod_3',
      name: 'اکانت اکتویژن پی‌سی',
      parentId: 'btn_1',
      requiredPoints: 12,
      buttonType: 'content',
      content: '🎮 مشخصات اکانت اکتویژن مخصوص کامپیوتر:\n📧 ایمیل: cod_pc_activision_master@proton.me\n🔑 رمز عبور: MasterPCGod99!!\n⭐ وضعیت: دارک متر الترا فعال + لول ۲۵۰ پرستیژ کامل',
      status: 'enabled',
      visibility: 'restricted',
      order: 3
    },
    // Sub-buttons for Tutorials
    {
      id: 'btn_tut_1',
      name: 'راهنمای کسب امتیاز',
      parentId: 'btn_2',
      requiredPoints: 0,
      buttonType: 'content',
      content: '📈 روش جمع‌آوری سریع امتیاز:\n۱. لینک دعوت اختصاصی خود را کپی کنید.\n۲. آن را در گروه‌های تلگرامی یا شبکه‌های اجتماعی بفرستید.\n۳. هر کاربری که با لینک شما وارد ربات شود، ۳ امتیاز به شما اضافه می‌شود!\n۴. از امتیازها برای باز کردن رایگان اکانت‌های بالا استفاده کنید.',
      status: 'enabled',
      visibility: 'public',
      order: 1
    },
    {
      id: 'btn_tut_2',
      name: 'امنیت تغییر ایمیل',
      parentId: 'btn_2',
      requiredPoints: 3,
      buttonType: 'content',
      content: '🔒 آموزش امنیت اکانت:\nبه محض دریافت مشخصات اکانت، حتما رمز عبور را تغییر دهید و تایید دو مرحله‌ای یا شماره موبایل جدید متصل کنید تا مانع بازیابی اکانت شوید.',
      status: 'enabled',
      visibility: 'restricted',
      order: 2
    }
  ],
  forcedJoin: [
    {
      id: 'fj_1',
      type: 'channel',
      title: 'کانال بزرگ کال آف دیوتی رایگان',
      chatId: '@cod_free_drops',
      inviteLink: 'https://t.me/cod_free_drops',
      status: 'active',
      createdAt: new Date().toISOString()
    },
    {
      id: 'fj_2',
      type: 'group',
      title: 'گپ گفتگوی کاربران دایان بوت',
      chatId: '@cod_community_chat',
      inviteLink: 'https://t.me/cod_community_chat',
      status: 'active',
      createdAt: new Date().toISOString()
    }
  ],
  tickets: [
    {
      id: 'tkt_1',
      telegramId: '987654321',
      username: 'gamer_pro',
      firstName: 'الکس پرو',
      status: 'open',
      messages: [
        { sender: 'user', text: 'سلام، رمز عبور اکانت الیت پلی‌استیشن نامعتبره. میشه لطفا راهنمایی کنید؟', timestamp: new Date(Date.now() - 1 * 3600 * 1000).toISOString() }
      ],
      createdAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString()
    },
    {
      id: 'tkt_2',
      telegramId: '223344556',
      username: 'cod_ninja',
      firstName: 'مارکوس نینجا',
      status: 'resolved',
      messages: [
        { sender: 'user', text: 'سلام چطوری میتونم دوستام رو دعوت کنم؟', timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString() },
        { sender: 'admin', text: 'سلام! روی دکمه /start بزنید، لینک اختصاصی دعوتتان را کپی کرده و به دوستانتان بفرستید.', timestamp: new Date(Date.now() - 23 * 3600 * 1000).toISOString() },
        { sender: 'user', text: 'خیلی ممنون، درست شد!', timestamp: new Date(Date.now() - 22 * 3600 * 1000).toISOString() }
      ],
      createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 22 * 3600 * 1000).toISOString()
    }
  ],
  broadcasts: [
    {
      id: 'bc_1',
      type: 'text',
      content: '🚨 اکانت‌های جدید پلی‌استیشن امروز ساعت ۱۸:۰۰ به وقت ایران اضافه میشن! امتیازات خودتون رو افزایش بدین!',
      target: 'all',
      successCount: 4,
      failureCount: 0,
      sentAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
    }
  ],
  tasks: [
    {
      id: 'tsk_1',
      name: 'بررسی تبلیغات زمان‌بندی شده کانال',
      triggerAt: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
      action: 'add_channel',
      payload: { title: 'کانال ترفندهای ویژه کال‌آف‌دیوتی', chatId: '@cod_premium_hacks', inviteLink: 'https://t.me/cod_premium_hacks' },
      status: 'pending'
    }
  ],
  media: [
    {
      id: 'med_1',
      fileName: 'cod_banner.jpg',
      fileType: 'image/jpeg',
      fileSize: '245 KB',
      url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop',
      createdAt: new Date().toISOString()
    }
  ],
  settings: DEFAULT_SETTINGS,
  adminPasswordHash: '$2a$10$7R89bS8Y6jO7X5f.8Xy2EeK6g8N3X7Y2f2Grt9H0vXny2Z4bCNeN.', // default for admin123
  privateMessages: [],
  dailyClaims: [],
  userRequests: [],
  pointSpendLogs: [],
  inputFormSubmissions: []
};

// Ensure JSON file exists and load it
export function loadDb(): DatabaseSchema {
  try {
    const bcryptRegex = /^\$2[ayb]\$[0-9]{2}\$[./A-Za-z0-9]{53}$/;
    if (!fs.existsSync(DB_FILE)) {
      const dbCopy = { ...INITIAL_DB };
      dbCopy.adminPasswordHash = bcrypt.hashSync('admin123', 10);
      fs.writeFileSync(DB_FILE, JSON.stringify(dbCopy, null, 2), 'utf-8');
      return dbCopy;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const db: DatabaseSchema = JSON.parse(raw);
    let updated = false;

    // Validate adminPasswordHash
    if (!db.adminPasswordHash || !bcryptRegex.test(db.adminPasswordHash)) {
      db.adminPasswordHash = bcrypt.hashSync('admin123', 10);
      updated = true;
    }

    if (!db.privateMessages) {
      db.privateMessages = [];
      updated = true;
    }

    if (!db.dailyClaims) {
      db.dailyClaims = [];
      updated = true;
    }

    if (!db.userRequests) {
      db.userRequests = [];
      updated = true;
    }

    if (!db.pointSpendLogs) {
      db.pointSpendLogs = [];
      updated = true;
    }

    if (!db.inputFormSubmissions) {
      db.inputFormSubmissions = [];
      updated = true;
    }

    if (db.users) {
      db.users = db.users.map((u) => {
        if (typeof u.referralsCount !== 'number') {
          // Count actual database referrals where referredBy matches this user's telegramId
          const referCount = db.users.filter(other => other.referredBy === u.telegramId).length;
          u.referralsCount = referCount;
          updated = true;
        }
        return u;
      });
    }
    if (updated) {
      saveDb(db);
    }
    return db;
  } catch (err) {
    console.error('Error loading database, returning defaults:', err);
    const dbCopy = { ...INITIAL_DB };
    dbCopy.adminPasswordHash = bcrypt.hashSync('admin123', 10);
    return dbCopy;
  }
}

export function saveDb(data: DatabaseSchema): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database:', err);
  }
}
