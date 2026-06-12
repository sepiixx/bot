// ==========================================
// MODULE: ADMIN SIDEBAR NAVIGATION
// PURPOSE: Handles navigation drawers and branding indicators
// ==========================================

import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Sliders, 
  FileText, 
  Network, 
  MessageSquare, 
  Radio, 
  Clock, 
  Image, 
  Settings as SettingsIcon,
  Bot,
  LogOut,
  Send,
  Inbox
} from 'lucide-react';

export type ActiveTab = 
  | 'dashboard' 
  | 'users' 
  | 'buttons' 
  | 'forced-join' 
  | 'support' 
  | 'broadcast' 
  | 'private-message'
  | 'scheduler' 
  | 'media' 
  | 'settings' 
  | 'simulator'
  | 'form-submissions';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onLogout: () => void;
  openTicketsCount: number;
}

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<any>;
  highlight?: boolean;
  badge?: number;
}

export default function Sidebar({ activeTab, setActiveTab, onLogout, openTicketsCount }: SidebarProps) {
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
    { id: 'simulator', label: 'شبیه‌ساز ربات', icon: Bot, highlight: true },
    { id: 'buttons', label: 'دکمه‌ها و منوها', icon: Sliders },
    { id: 'form-submissions', label: '📥 درخواست‌های فرم', icon: Inbox },
    { id: 'users', label: 'بانک کاربران', icon: Users },
    { id: 'forced-join', label: 'عضویت اجباری', icon: Network },
    { id: 'support', label: 'بخش پشتیبانی', icon: MessageSquare, badge: openTicketsCount },
    { id: 'broadcast', label: 'پیام همگانی', icon: Radio },
    { id: 'private-message', label: 'پیام خصوصی', icon: Send },
    { id: 'scheduler', label: 'برنامه‌ریز اقدامات', icon: Clock },
    { id: 'media', label: 'کتابخانه رسانه', icon: Image },
    { id: 'settings', label: 'تنظیمات سیستم', icon: SettingsIcon },
  ];

  return (
    <aside id="admin-sidebar" className="w-68 bg-slate-900 text-slate-100 flex flex-col h-screen border-l border-slate-800 shrink-0">
      {/* Branding Header */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="bg-gradient-to-tr from-blue-500 to-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/10 flex items-center justify-center">
          <Bot className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-md font-bold tracking-tight text-white">مدیر دایان</h1>
          <p className="text-xs text-slate-400 font-mono">پنل مدیریت محتوای ربات</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              id={`nav-btn-${item.id}`}
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 text-right group ${
                isActive 
                  ? 'bg-blue-600 text-white font-medium shadow-md shadow-blue-600/10' 
                  : item.highlight
                    ? 'text-blue-400 hover:bg-slate-800 hover:text-blue-300 border border-blue-900/40 bg-blue-950/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : item.highlight ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-300'}`} />
                <span className="text-sm">{item.label}</span>
              </div>
              
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-rose-500 text-white font-bold text-xxs px-2 py-0.5 rounded-full shadow-sm">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info & Logout */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="h-8 w-8 bg-slate-800 rounded-full flex items-center justify-center text-xs font-bold text-slate-300 ring-2 ring-blue-500/20 font-sans">
            AD
          </div>
          <div className="truncate text-right">
            <p className="text-xs font-semibold text-slate-200">مدیر سیستم</p>
            <p className="text-[10px] text-slate-500 truncate font-mono">admin@botcms.local</p>
          </div>
        </div>
        
        <button
          id="btn-sidebar-logout"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/10 rounded-lg transition-colors text-right"
        >
          <LogOut className="h-4 w-4" />
          <span>خروج از سیستم</span>
        </button>
      </div>
    </aside>
  );
}
