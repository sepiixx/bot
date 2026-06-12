// ==========================================
// MODULE: GLOBAL APPLICATION SETTINGS
// PURPOSE: Handles server properties, tokens, custom warnings, welcome texts, daily rewards, and change password
// ==========================================

import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  RefreshCw, 
  Key, 
  MessageCircle, 
  AlertTriangle,
  Gift,
  ShieldCheck,
  Eye,
  EyeOff,
  UserCheck,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { SystemSettings } from '../types';

interface ClaimLog {
  id: string;
  telegramId: string;
  username: string;
  pointsClaimed: number;
  claimedAt: string;
}

interface SettingsProps {
  settings: SystemSettings;
  onUpdate: (settings: Partial<SystemSettings>) => void;
  onResetDatabase: () => void;
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

export default function Settings({ settings, onUpdate, onResetDatabase, authenticatedFetch }: SettingsProps) {
  // General System State
  const [telegramToken, setTelegramToken] = useState(settings.telegramToken);
  const [pointsPerReferral, setPointsPerReferral] = useState(settings.pointsPerReferral);
  const [maxReferrals, setMaxReferrals] = useState(settings.maxReferrals);
  const [referralRewardThreshold, setReferralRewardThreshold] = useState(settings.referralRewardThreshold);
  const [welcomeMessage, setWelcomeMessage] = useState(settings.welcomeMessage);
  const [unauthorizedPointsMessage, setUnauthorizedPointsMessage] = useState(settings.unauthorizedPointsMessage);
  const [forcedJoinMessage, setForcedJoinMessage] = useState(settings.forcedJoinMessage);

  // Daily Reward Configuration State
  const [dailyRewardEnabled, setDailyRewardEnabled] = useState(settings.dailyRewardEnabled ?? false);
  const [dailyRewardPoints, setDailyRewardPoints] = useState(settings.dailyRewardPoints ?? 10);
  const [claimsList, setClaimsList] = useState<ClaimLog[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(false);

  // Security State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passFeedback, setPassFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [passLoading, setPassLoading] = useState(false);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const [saving, setSaving] = useState(false);

  // Load claims on mount
  const fetchClaimsList = async () => {
    setLoadingClaims(true);
    try {
      const res = await authenticatedFetch('/api/daily-claims');
      if (res.ok) {
        const data = await res.json();
        setClaimsList(data.reverse()); // Latest first
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingClaims(false);
    }
  };

  useEffect(() => {
    fetchClaimsList();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    onUpdate({
      telegramToken,
      pointsPerReferral: Number(pointsPerReferral),
      maxReferrals: Number(maxReferrals),
      referralRewardThreshold: Number(referralRewardThreshold),
      welcomeMessage,
      unauthorizedPointsMessage,
      forcedJoinMessage,
      dailyRewardEnabled,
      dailyRewardPoints: Number(dailyRewardPoints)
    });
    setTimeout(() => setSaving(false), 850);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassFeedback(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPassFeedback({ type: 'error', message: 'لطفاً تمامی فیلدهای تعیین رمز عبور را پر کنید.' });
      return;
    }

    if (newPassword.length < 8) {
      setPassFeedback({ type: 'error', message: 'رمز عبور جدید باید حداقل ۸ کاراکتر باشد.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassFeedback({ type: 'error', message: 'رمز عبور جدید با تکرار آن مطابقت ندارد.' });
      return;
    }

    setPassLoading(true);
    try {
      const res = await authenticatedFetch('/api/settings/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();

      if (res.ok) {
        setPassFeedback({ type: 'success', message: 'رمز عبور مدیریت با موفقیت تغییر یافت.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPassFeedback({ type: 'error', message: data.error || 'خطایی در تغییر رمز عبور رخ داد.' });
      }
    } catch (err) {
      setPassFeedback({ type: 'error', message: 'مشکل ارتباطی با سرور در حین تغییر رمز.' });
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="flex-1 p-8 space-y-8 bg-slate-50/50 overflow-y-auto text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex-row-reverse text-right">
        <div className="text-right">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">تنظیمات کل سیستم و امنیت پنل هب</h2>
          <p className="text-sm text-slate-500 mt-1">
            پیکربندی هویت ربات، امتیازدهی جوایز روزانه، پاداش‌های دعوت مستقیم و تغییر اطلاعات عبور حساس.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start text-right">
        {/* Core Settings forms */}
        <form onSubmit={handleSave} className="lg:col-span-2 space-y-8 text-right">
          {/* Card: Auth Token */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 text-right">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-50 flex-row-reverse text-right">
              <Key className="h-4.5 w-4.5 text-blue-500 font-sans" />
              <span>اعتبارنامه و تنظیمات اتصال به تلگرام</span>
            </h3>

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block text-right">توکن رسمی ربات تلگرام (Bot API Token)</label>
              <input
                id="settings-tg-token"
                type="text"
                required
                value={telegramToken}
                onChange={e => setTelegramToken(e.target.value)}
                placeholder="123456789:ABCdefGhIJKlmNoPQRStUvWxYz"
                className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-3 rounded-xl font-mono transition text-left"
                dir="ltr"
              />
              <p className="text-[11px] text-slate-400 mt-1 text-right">دریافت شده از ربات رسمی تلگرام <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">@BotFather</a>.</p>
            </div>
          </div>

          {/* Card: Referral config */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 text-right">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-50 flex-row-reverse text-right">
              <span>قوانین کسب امتیاز دعوت دوستان (Referral System)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-right">
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-semibold text-slate-600 block uppercase tracking-wider text-right">امتیاز به ازای دعوت هر کاربر</label>
                <input
                  id="settings-pts-per-ref"
                  type="number"
                  required
                  min="0"
                  value={pointsPerReferral}
                  onChange={e => setPointsPerReferral(Number(e.target.value))}
                  className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl transition text-right"
                />
              </div>

              <div className="space-y-1.5 text-right">
                <label className="text-xs font-semibold text-slate-600 block uppercase tracking-wider text-right">حداکثر سقف دعوت مجاز</label>
                <input
                  id="settings-max-ref"
                  type="number"
                  required
                  min="1"
                  value={maxReferrals}
                  onChange={e => setMaxReferrals(Number(e.target.value))}
                  className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl transition text-right"
                />
              </div>

              <div className="space-y-1.5 text-right">
                <label className="text-xs font-semibold text-slate-600 block uppercase tracking-wider text-right">حد آستانه پاداش‌دهی</label>
                <input
                  id="settings-ref-threshold"
                  type="number"
                  required
                  min="1"
                  value={referralRewardThreshold}
                  onChange={e => setReferralRewardThreshold(Number(e.target.value))}
                  className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl transition text-right"
                />
              </div>
            </div>
          </div>

          {/* Card: Daily Reward Configuration */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 text-right">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-50 flex-row-reverse text-right">
              <Gift className="h-4.5 w-4.5 text-rose-500" />
              <span>تنظیمات سیستم جایزه روزانه (🎁 Daily Reward)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
              <div className="space-y-2 text-right">
                <label className="text-xs font-semibold text-slate-650 block text-right">وضعیت سیستم جایزه روزانه</label>
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 flex-row-reverse justify-end">
                  <input
                    id="daily-reward-toggle"
                    type="checkbox"
                    checked={dailyRewardEnabled}
                    onChange={e => setDailyRewardEnabled(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded-sm focus:ring-blue-500"
                  />
                  <span className="text-sm font-bold text-slate-700">سیستم هدیه ۲۴ ساعته فعال باشد</span>
                </div>
              </div>

              <div className="space-y-1.5 text-right">
                <label className="text-xs font-semibold text-slate-600 block text-right">میزان امتیاز پاداش روزانه</label>
                <input
                  id="daily-reward-points"
                  type="number"
                  required
                  min="1"
                  value={dailyRewardPoints}
                  onChange={e => setDailyRewardPoints(Number(e.target.value))}
                  placeholder="مثال: 5"
                  className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl transition text-right"
                />
              </div>
            </div>
            <p className="text-[10px] text-gray-400">تغییرات میزان پاداش روزانه بلافاصله بر روی کارکرد زنده ربات تلگرام اعمال شده و نیازی به راه اندازی مجدد سرور ندارد.</p>
          </div>

          {/* Card: Automatic Automated Messages */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 text-right">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-50 flex-row-reverse text-right">
              <MessageCircle className="h-4.5 w-4.5 text-blue-500" />
              <span>متن پیام‌های خودکار و پیش‌فرض ربات</span>
            </h3>

            {/* Welcome msg */}
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-slate-600 block uppercase tracking-wider text-right">پیام خوش‌آمدگویی آغاز کار ربات (/start)</label>
              <textarea
                id="settings-welcome-msg"
                rows={3}
                required
                value={welcomeMessage}
                onChange={e => setWelcomeMessage(e.target.value)}
                className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl transition text-right font-sans resize-none"
              ></textarea>
            </div>

            {/* Points gate barrier check */}
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-slate-600 block uppercase tracking-wider text-right font-bold">پیام هشدار عدم دسترسی به علت کمبود امتیاز</label>
              <textarea
                id="settings-unauthorized-msg"
                rows={3}
                required
                value={unauthorizedPointsMessage}
                onChange={e => setUnauthorizedPointsMessage(e.target.value)}
                className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl transition text-right font-sans resize-none"
              ></textarea>
            </div>

            {/* Forced Join warnings */}
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-slate-600 block uppercase tracking-wider text-right font-bold">متن پیام لزوم عضویت اجباری در کانال‌ها</label>
              <textarea
                id="settings-forcedjoin-msg"
                rows={3}
                required
                value={forcedJoinMessage}
                onChange={e => setForcedJoinMessage(e.target.value)}
                className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl transition text-right font-sans resize-none"
              ></textarea>
            </div>
          </div>

          {/* Unified Form Save Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 flex justify-end">
            <button
              id="btn-settings-save"
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition shadow-md shadow-blue-600/10 flex items-center justify-center gap-2 cursor-pointer flex-row-reverse"
            >
              <Save className="h-4.5 w-4.5" />
              <span>{saving ? 'در حال ذخیره‌سازی...' : 'ذخیره تمام تنظیمات فوق'}</span>
            </button>
          </div>
        </form>

        {/* Side Panel: Security & Reset */}
        <div className="space-y-8 text-right">
          {/* Card: Security Password Change */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 text-right">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-50 flex-row-reverse text-right">
              <ShieldCheck className="h-4.5 w-4.5 text-indigo-500" />
              <span>تنظیمات امنیت (تغییر رمز عبور پنل)</span>
            </h3>

            {passFeedback && (
              <div className={`p-3 rounded-lg flex items-center gap-2 border text-xs font-semibold line-height-normal text-right ${
                passFeedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                {passFeedback.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{passFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">رمز عبور فعلی</label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-slate-800 font-mono text-xs border border-slate-200 focus:outline-none focus:border-indigo-500 p-2 rounded-xl text-left"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">رمز عبور جدید (حداقل ۸ کاراکتر)</label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-slate-800 font-mono text-xs border border-slate-200 focus:outline-none focus:border-indigo-500 p-2 rounded-xl text-left"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">تکرار رمز عبور جدید</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-slate-800 font-mono text-xs border border-slate-200 focus:outline-none focus:border-indigo-500 p-2 rounded-xl text-left"
                  dir="ltr"
                />
              </div>

              <button
                type="submit"
                disabled={passLoading}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                {passLoading ? 'در حال اعمال رمز جدید...' : 'به‌روزرسانی رمز عبور'}
              </button>
            </form>
          </div>

          {/* Card: Last Claims list */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 text-right">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <button 
                onClick={fetchClaimsList} 
                className="text-indigo-600 p-1 hover:bg-slate-50 rounded-md text-[10px] font-bold flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loadingClaims ? 'animate-spin' : ''}`} />
                <span>بروزرسانی</span>
              </button>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 flex-row-reverse text-right">
                <Gift className="h-4.5 w-4.5 text-rose-500" />
                <span>آخرین جوایز دریافت شده</span>
              </h3>
            </div>

            {loadingClaims ? (
              <p className="text-center text-xs text-gray-400 py-4">در حال بارگیری فعالیت‌ها...</p>
            ) : claimsList.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-6">پیوند جایزه‌ای ثبت نشده است.</p>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {claimsList.map((clm) => (
                  <div key={clm.id} className="text-right text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(clm.claimedAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="font-bold text-slate-800">
                        @{clm.username || clm.telegramId}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-gray-500 pt-0.5">
                      <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-bold">
                        +{clm.pointsClaimed} امتیاز
                      </span>
                      <span className="font-mono text-gray-400 select-all">{clm.telegramId}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card: Reset Database */}
          <div className="p-6 bg-rose-50 border border-rose-150 rounded-2xl shadow-sm space-y-4 text-right">
            <h4 className="text-xs font-bold text-rose-800 uppercase tracking-widest flex items-center gap-1.5 flex-row-reverse text-right">
              <AlertTriangle className="h-4.5 w-4.5 text-rose-600" />
              <span>عملیات بازنشانی زنده دیتابیس</span>
            </h4>
            <p className="text-xs text-rose-700 leading-relaxed font-semibold text-right">
              با بازنشانی پایگاه داده تمامی پاداش‌ها، دکمه‌های تودرتو و کاربران مسدودشده حذف خواهند شد.
            </p>
            <button
              id="btn-settings-reset-db"
              type="button"
              onClick={() => {
                if (confirm('آیا از بازنشانی کل سیستم و تخلیه دیتابیس‌ها به حالت اولیه پیش‌فرض کارخانه اطمینان دارید؟ این عمل تمام داده‌های فعلی را حذف می‌کند.')) {
                  onResetDatabase();
                }
              }}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 border border-rose-650 transition cursor-pointer flex-row-reverse"
            >
              <RefreshCw className="h-4 w-4" />
              <span>پاکسازی کل بانک اطلاعاتی</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
