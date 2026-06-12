// ==========================================
// MODULE: ADMIN MAIN WORKSPACE APPFRAME
// PURPOSE: Main React orchestrator, routing tabs, and handling API synch
// ==========================================

import React, { useEffect, useState } from 'react';
import { Bot, Key, LogIn, Sliders, Shield, AlertCircle } from 'lucide-react';
import { 
  User, 
  BotButton, 
  ForcedJoinChannel, 
  SupportTicket, 
  BroadcastLog, 
  SchedulerTask, 
  MediaAsset, 
  SystemSettings 
} from './types';
import Sidebar, { ActiveTab } from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ButtonManagement from './components/ButtonManagement';
import UserManagement from './components/UserManagement';
import ForcedJoin from './components/ForcedJoin';
import SupportSystem from './components/SupportSystem';
import BroadcastSystem from './components/BroadcastSystem';
import SchedulerSystem from './components/SchedulerSystem';
import MediaLibrary from './components/MediaLibrary';
import Settings from './components/Settings';
import BotSimulator from './components/BotSimulator';
import PrivateMessage from './components/PrivateMessage';
import FormSubmissions from './components/FormSubmissions';

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

export default function App() {
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('jwt_token'));
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const saved = localStorage.getItem('admin_active_tab');
    return (saved as ActiveTab) || 'dashboard';
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('admin_active_tab', activeTab);
  }, [activeTab]);

  // System States
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [buttons, setButtons] = useState<BotButton[]>([]);
  const [channels, setChannels] = useState<ForcedJoinChannel[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastLog[]>([]);
  const [tasks, setTasks] = useState<SchedulerTask[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // Authentication Fields
  const [username, setLoginUsername] = useState('');
  const [password, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Fetch helper
  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const token = authToken || localStorage.getItem('jwt_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };
    return fetch(url, { ...options, headers });
  };

  const loadAllSystemData = async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const [
        resStats,
        resUsers,
        resButtons,
        resForcedJoin,
        resTickets,
        resBroadcasts,
        resTasks,
        resMedia,
        resSettings
      ] = await Promise.all([
        authenticatedFetch('/api/dashboard/stats'),
        authenticatedFetch('/api/users'),
        authenticatedFetch('/api/buttons'),
        authenticatedFetch('/api/forced-join'),
        authenticatedFetch('/api/tickets'),
        authenticatedFetch('/api/broadcasts'),
        authenticatedFetch('/api/tasks'),
        authenticatedFetch('/api/media'),
        authenticatedFetch('/api/settings')
      ]);

      if (resStats.status === 401) {
        handleLogout();
        return;
      }

      const [
        dataStats,
        dataUsers,
        dataButtons,
        dataForced,
        dataTickets,
        dataBroadcasts,
        dataTasks,
        dataMedia,
        dataSettings
      ] = await Promise.all([
        resStats.json(),
        resUsers.json(),
        resButtons.json(),
        resForcedJoin.json(),
        resTickets.json(),
        resBroadcasts.json(),
        resTasks.json(),
        resMedia.json(),
        resSettings.json()
      ]);

      setStats(dataStats);
      setUsers(dataUsers);
      setButtons(dataButtons);
      setChannels(dataForced);
      setTickets(dataTickets);
      setBroadcasts(dataBroadcasts);
      setTasks(dataTasks);
      setMedia(dataMedia);
      setSettings(dataSettings);
    } catch (err) {
      console.error('Failure retrieving system payloads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      loadAllSystemData();
    }
  }, [authToken]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Login failure');
      } else {
        localStorage.setItem('jwt_token', data.token);
        setAuthToken(data.token);
        setLoginUsername('');
        setLoginPassword('');
      }
    } catch {
      setLoginError('Server connectivity issue');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    setAuthToken(null);
  };

  // Stats refresh
  const triggerStatsRefresh = async () => {
    try {
      const resStats = await authenticatedFetch('/api/dashboard/stats');
      const dataStats = await resStats.json();
      setStats(dataStats);
      
      const resTickets = await authenticatedFetch('/api/tickets');
      const dataTickets = await resTickets.json();
      setTickets(dataTickets);

      const resUsers = await authenticatedFetch('/api/users');
      const dataUsers = await resUsers.json();
      setUsers(dataUsers);
    } catch (err) {
      console.error('Stats reload error:', err);
    }
  };

  // Button Action Triggers
  const handleCreateBtn = async (btn: Partial<BotButton>) => {
    try {
      const res = await authenticatedFetch('/api/buttons', {
        method: 'POST',
        body: JSON.stringify(btn)
      });
      if (res.ok) loadAllSystemData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateBtn = async (id: string, btn: Partial<BotButton>) => {
    try {
      const res = await authenticatedFetch(`/api/buttons/${id}`, {
        method: 'PUT',
        body: JSON.stringify(btn)
      });
      if (res.ok) loadAllSystemData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBtn = async (id: string) => {
    try {
      const res = await authenticatedFetch(`/api/buttons/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) loadAllSystemData();
    } catch (err) {
      console.error(err);
    }
  };

  // User Actions
  const handleUpdateUser = async (id: string, user: Partial<User>) => {
    try {
      const res = await authenticatedFetch(`/api/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(user)
      });
      if (res.ok) loadAllSystemData();
    } catch (err) {
      console.error(err);
    }
  };

  // Forced Join Action gates
  const handleCreateChannel = async (gate: Partial<ForcedJoinChannel>) => {
    try {
      const res = await authenticatedFetch('/api/forced-join', {
        method: 'POST',
        body: JSON.stringify(gate)
      });
      if (res.ok) loadAllSystemData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateChannel = async (id: string, gate: Partial<ForcedJoinChannel>) => {
    try {
      const res = await authenticatedFetch(`/api/forced-join/${id}`, {
        method: 'PUT',
        body: JSON.stringify(gate)
      });
      if (res.ok) loadAllSystemData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteChannel = async (id: string) => {
    try {
      const res = await authenticatedFetch(`/api/forced-join/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) loadAllSystemData();
    } catch (err) {
      console.error(err);
    }
  };

  // Ticket actions
  const handleReplyTicket = async (id: string, text: string) => {
    try {
      const res = await authenticatedFetch(`/api/tickets/${id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ text })
      });
      if (res.ok) loadAllSystemData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTicketStatus = async (id: string, status: 'open' | 'resolved' | 'archived') => {
    try {
      const res = await authenticatedFetch(`/api/tickets/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      if (res.ok) loadAllSystemData();
    } catch (err) {
      console.error(err);
    }
  };

  // Broadcast System trigger
  const handleTriggerBroadcast = async (bc: Partial<BroadcastLog>) => {
    try {
      const res = await authenticatedFetch('/api/broadcasts', {
        method: 'POST',
        body: JSON.stringify(bc)
      });
      if (res.ok) loadAllSystemData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelBroadcast = async (id: string) => {
    try {
      const res = await authenticatedFetch(`/api/broadcasts/${id}/cancel`, {
        method: 'POST'
      });
      if (res.ok) loadAllSystemData();
    } catch (err) {
      console.error(err);
    }
  };

  // Scheduler execution trigger
  const handleTriggerTask = async (id: string) => {
    try {
      const res = await authenticatedFetch(`/api/tasks/${id}/execute`, {
        method: 'POST'
      });
      if (res.ok) loadAllSystemData();
    } catch (err) {
      console.error(err);
    }
  };

  // Media Registry Action triggers
  const handleCreateMedia = async (med: Partial<MediaAsset>) => {
    try {
      const res = await authenticatedFetch('/api/media', {
        method: 'POST',
        body: JSON.stringify(med)
      });
      if (res.ok) loadAllSystemData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMedia = async (id: string) => {
    try {
      const res = await authenticatedFetch(`/api/media/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) loadAllSystemData();
    } catch (err) {
      console.error(err);
    }
  };

  // Settings
  const handleUpdateSettings = async (sets: Partial<SystemSettings>) => {
    try {
      const res = await authenticatedFetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify(sets)
      });
      if (res.ok) {
        setSettings({ ...settings!, ...sets });
        loadAllSystemData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetDatabase = async () => {
    try {
      await authenticatedFetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify({ reset: true }) // Simulates rebuilding default seeds on server
      });
      localStorage.removeItem('jwt_token');
      setAuthToken(null);
    } catch (err) {
      console.error(err);
    }
  };

  // LOGIN SCREEN
  if (!authToken) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-slate-100 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="bg-gradient-to-tr from-blue-500 to-blue-600 p-4 rounded-2xl shadow-lg border border-blue-200">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-4 tracking-tight">مرکز مدیریت و کنترل دسترسی ربات</h2>
              <p className="text-xs text-slate-400 mt-1 uppercase font-semibold font-mono">کنسول مدیریت هوشمند محتوا</p>
            </div>

            {/* Simulated creds banner */}
            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex gap-2.5 items-start mt-2">
              <Shield className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-right text-[11px] leading-normal text-blue-700">
                <strong className="font-bold">مشخصات ورود تستی (دمو سنباکس):</strong>
                <p className="font-mono mt-0.5">نام کاربری: <span className="font-bold font-sans">admin</span></p>
                <p className="font-mono">رمز عبور: <span className="font-bold font-sans">admin123</span></p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block text-right">نام کاربری مدیریت</label>
                <input
                  id="login-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-4 py-3 rounded-xl transition text-right"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block text-right">رمز عبور امنیتی</label>
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-4 py-3 rounded-xl transition text-right"
                />
              </div>

              {loginError && (
                <div className="flex gap-2 p-2.5 bg-rose-50 text-rose-700 text-xs border border-rose-100 rounded-xl justify-start items-center">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{loginError === 'Login failure' ? 'ورود با خطا مواجه شد' : loginError === 'Server connectivity issue' ? 'خطا در برقراری ارتباط با سرور' : loginError}</span>
                </div>
              )}

              <button
                id="btn-login-submit"
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition shadow-md shadow-blue-600/15 flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="h-4.5 w-4.5 transform rotate-180" />
                <span>بررسی مشخصات و ورود به پنل</span>
              </button>
            </form>
          </div>
          
          <div className="text-center text-[10px] text-slate-400 mt-8 pt-4 border-t border-slate-50">
            طراحی شده با Node.js, Express & React. سیستم با گواهی JWT قفل شده است.
          </div>
        </div>
      </div>
    );
  }

  const openTicketsCount = tickets.filter(t => t.status === 'open').length;

  return (
    <div id="full-workspace" className="flex bg-slate-50 h-screen w-screen overflow-hidden" dir="rtl">
      {/* Sidebar navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout}
        openTicketsCount={openTicketsCount}
      />

      {/* Pages Workspace routing */}
      <div id="pages-arena" className="flex-1 flex flex-col h-full min-w-0">
        {activeTab === 'dashboard' && (
          <Dashboard 
            stats={stats} 
            loading={loading} 
            onNavigate={(tab) => setActiveTab(tab)}
            users={users}
            tickets={tickets}
          />
        )}
        
        {activeTab === 'simulator' && (
          <BotSimulator onRefreshStats={triggerStatsRefresh} />
        )}

        {activeTab === 'form-submissions' && (
          <FormSubmissions authenticatedFetch={authenticatedFetch} />
        )}

        {activeTab === 'buttons' && (
          <ButtonManagement 
            buttons={buttons} 
            onCreate={handleCreateBtn} 
            onUpdate={handleUpdateBtn} 
            onDelete={handleDeleteBtn}
          />
        )}

        {activeTab === 'users' && (
          <UserManagement 
            users={users} 
            onUpdateUser={handleUpdateUser} 
          />
        )}

        {activeTab === 'forced-join' && (
          <ForcedJoin 
            channels={channels} 
            onCreateChannel={handleCreateChannel} 
            onUpdateChannel={handleUpdateChannel} 
            onDeleteChannel={handleDeleteChannel}
          />
        )}

        {activeTab === 'support' && (
          <SupportSystem 
            tickets={tickets} 
            onReplyTicket={handleReplyTicket} 
            onUpdateStatus={handleUpdateTicketStatus}
          />
        )}

        {activeTab === 'broadcast' && (
          <BroadcastSystem 
            logs={broadcasts} 
            onTriggerBroadcast={handleTriggerBroadcast}
            onCancelBroadcast={handleCancelBroadcast}
          />
        )}

        {activeTab === 'private-message' && (
          <PrivateMessage 
            authenticatedFetch={authenticatedFetch}
          />
        )}

        {activeTab === 'scheduler' && (
          <SchedulerSystem 
            tasks={tasks} 
            onTriggerTask={handleTriggerTask}
          />
        )}

        {activeTab === 'media' && (
          <MediaLibrary 
            media={media} 
            onUpload={handleCreateMedia} 
            onDelete={handleDeleteMedia}
          />
        )}

        {activeTab === 'settings' && settings && (
          <Settings 
            settings={settings} 
            onUpdate={handleUpdateSettings} 
            onResetDatabase={handleResetDatabase}
            authenticatedFetch={authenticatedFetch}
          />
        )}
      </div>
    </div>
  );
}
