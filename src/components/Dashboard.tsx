// ==========================================
// MODULE: DASHBOARD SYSTEM
// PURPOSE: Renders analytical overview cards and status widgets
// ==========================================

import React, { useEffect, useState } from 'react';
import { 
  Users, 
  ShieldCheck, 
  Sliders, 
  MessageSquare, 
  Share2, 
  CheckCircle,
  HelpCircle,
  ArrowUpRight,
  TrendingUp,
  MessageCircle
} from 'lucide-react';
import { BotButton, User, SupportTicket } from '../types';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalButtons: number;
  openSupportTickets: number;
  totalReferrals: number;
  broadcastStats: {
    success: number;
    failed: number;
  };
}

interface DashboardProps {
  stats: Stats | null;
  loading: boolean;
  onNavigate: (tab: any) => void;
  users: User[];
  tickets: SupportTicket[];
}

export default function Dashboard({ stats, loading, onNavigate, users, tickets }: DashboardProps) {
  if (loading || !stats) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-64" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          <span className="text-sm text-slate-500 font-medium">در حال بارگذاری اطلاعات داشبورد...</span>
        </div>
      </div>
    );
  }

  // Calculate quick metrics
  const activeTickets = tickets.filter(t => t.status === 'open');
  const recentUsers = [...users]
    .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())
    .slice(0, 5);

  const cardList = [
    {
      label: 'کل کاربران ربات',
      value: stats.totalUsers,
      sub: `${stats.activeUsers} کاربر اخیراً فعال`,
      icon: Users,
      color: 'bg-blue-50 text-blue-600 border-blue-100',
      tab: 'users'
    },
    {
      label: 'دکمه‌های منو',
      value: stats.totalButtons,
      sub: 'گزینه‌های فعال در منوی پویا',
      icon: Sliders,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      tab: 'buttons'
    },
    {
      label: 'تیکت‌های پشتیبانی',
      value: stats.openSupportTickets,
      sub: `${activeTickets.length} تیکت در انتظار پاسخ`,
      icon: MessageSquare,
      color: 'bg-rose-50 text-rose-600 border-rose-100',
      tab: 'support'
    },
    {
      label: 'سیستم زیرمجموعه‌گیری',
      value: stats.totalReferrals,
      sub: 'دعوت موفق کاربران با لینک اختصاصی',
      icon: Share2,
      color: 'bg-purple-50 text-purple-600 border-purple-100',
      tab: 'users'
    }
  ];

  return (
    <div className="flex-1 p-8 space-y-8 bg-slate-50/50 overflow-y-auto text-right" dir="rtl">
      {/* Welcome Banner */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex-row-reverse">
        <div className="bg-blue-50 text-blue-700 text-xs px-3 py-1.5 rounded-full font-semibold flex items-center gap-1.5 border border-blue-100">
          <TrendingUp className="h-4.5 w-4.5" />
          <span>ارتباط فعال: متصل به تلگرام</span>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">وضعیت و نمای کلی سیستم</h2>
          <p className="text-sm text-slate-500 mt-1">
            داشبورد مدیریت بلادرنگ دایان بات. بدون نیاز به کدنویسی دکمه‌ها و عملکردهای ربات را تغییر دهید.
          </p>
        </div>
      </div>

      {/* Grid STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cardList.map((card, i) => {
          const Icon = card.icon;
          return (
            <div 
              key={i}
              onClick={() => onNavigate(card.tab)}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex justify-between items-start mb-4 flex-row-reverse">
                <div className={`p-3 rounded-xl border ${card.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <button className="text-slate-400 group-hover:text-blue-600 p-1 hover:bg-slate-50 rounded-lg transition-colors">
                  <ArrowUpRight className="h-5 w-5 transform rotate-90" />
                </button>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{card.label}</span>
                <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1 mb-2">
                  {card.value}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {card.sub}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Broadcast Delivery Statistics */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-right">
        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">آمار ارسال پیام‌های همگانی</h4>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-100 flex flex-col justify-center text-right">
            <span className="text-xs font-medium text-slate-500">مجموع پیام‌های ارسال شده</span>
            <span className="text-2xl font-extrabold text-slate-900 my-1">
              {stats.broadcastStats.success + stats.broadcastStats.failed}
            </span>
            <p className="text-slate-400 text-xs">تعداد کل پیام‌های ارسال شده به کاربران</p>
          </div>
          
          <div className="bg-emerald-50/30 p-5 rounded-xl border border-emerald-100 flex flex-col justify-center text-right">
            <span className="text-xs font-medium text-emerald-700">ارسال موفق</span>
            <span className="text-2xl font-extrabold text-emerald-800 my-1">
              {stats.broadcastStats.success}
            </span>
            <p className="text-emerald-600 text-xs flex items-center gap-1 justify-start">
              <CheckCircle className="h-3.5 w-3.5 inline" />
              <span>ارتباط بی‌نقص و دریافت نهایی امن</span>
            </p>
          </div>

          <div className="bg-rose-50/30 p-5 rounded-xl border border-rose-100 flex flex-col justify-center text-right">
            <span className="text-xs font-medium text-rose-700">ارسال ناموفق / بلاک شده</span>
            <span className="text-2xl font-extrabold text-rose-800 my-1">
              {stats.broadcastStats.failed}
            </span>
            <p className="text-rose-600 text-xs">کاربرانی که ربات را متوقف یا مسدود کرده‌اند</p>
          </div>
        </div>
      </div>

      {/* Split layout: Recent Users & Ongoing Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent users list */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col text-right">
          <div className="flex justify-between items-center mb-5 flex-row-reverse">
            <button 
              onClick={() => onNavigate('users')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-500 transition-colors"
            >
              بانک اعضا
            </button>
            <div className="text-right">
              <h3 className="text-base font-bold text-slate-900">آخرین اعضای عضو شده</h3>
              <p className="text-xs text-slate-500">عضویت‌های زنده و ثبت شده از تلگرام</p>
            </div>
          </div>
          
          <div className="divide-y divide-slate-100 flex-1">
            {recentUsers.map((user) => (
              <div key={user.id} className="py-3.5 flex items-center justify-between flex-row-reverse">
                <div className="flex items-center gap-3 flex-row-reverse">
                  <div className="h-9 w-9 bg-blue-50 text-blue-600 rounded-full font-bold text-xs flex items-center justify-center">
                    {user.firstName.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-right">
                    <h5 className="text-sm font-semibold text-slate-800">{user.firstName}</h5>
                    <p className="text-xs text-slate-400 font-mono">@{user.username || 'unknown_handle'} ({user.telegramId})</p>
                  </div>
                </div>
                <div className="text-left">
                  <span className="inline-block bg-slate-50 border border-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded font-semibold" dir="ltr">
                    💰 {user.points} امتیاز
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">عضویت در {new Date(user.joinedAt).toLocaleDateString('fa-IR')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Support Tickets overview */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col text-right">
          <div className="flex justify-between items-center mb-5 flex-row-reverse">
            <button 
              onClick={() => onNavigate('support')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-500 transition-colors"
            >
              کنسول پشتیبانی
            </button>
            <div className="text-right">
              <h3 className="text-base font-bold text-slate-900">تیکت‌های پشتیبانی معلق</h3>
              <p className="text-xs text-slate-500">پاسخگویی مستقیم به پیام‌های کاربران تلگرام</p>
            </div>
          </div>

          <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[340px] text-right">
            {activeTickets.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-10">
                <div className="bg-slate-50 p-4 rounded-full text-slate-400 mb-2">
                  <CheckCircle className="h-7 w-7" />
                </div>
                <p className="text-sm text-slate-500 font-medium">تمامی تیکت‌ها بررسی و بسته شده‌اند.</p>
              </div>
            ) : (
              activeTickets.map((t) => (
                <div 
                  key={t.id} 
                  onClick={() => onNavigate('support')}
                  className="p-4 rounded-xl border border-slate-100 hover:border-rose-100 hover:bg-rose-50/10 transition-all cursor-pointer flex justify-between items-start flex-row-reverse text-right"
                >
                  <div className="space-y-1 text-right">
                    <div className="flex items-center gap-2 flex-row-reverse">
                      <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
                      <h5 className="text-sm font-bold text-slate-800">{t.firstName}</h5>
                      <span className="text-[10px] text-slate-400 font-mono">@{t.username}</span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-1 italic text-right">
                      "{t.messages[t.messages.length - 1]?.text}"
                    </p>
                  </div>
                  <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-100 font-bold px-2 py-0.5 rounded">
                    نیازمند پاسخ
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
