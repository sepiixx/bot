// ==========================================
// MODULE: INTERACTIVE TELEGRAM BOT SIMULATOR
// PURPOSE: Immersive client sandbox testing for buttons, joins, keys, and tickets
// ==========================================

import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Key, RefreshCw, UserCheck, AlertCircle, Sparkles, AlertTriangle } from 'lucide-react';

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  buttons?: any[];
  mediaUrl?: string;
  mediaType?: 'text' | 'photo' | 'video' | 'document';
}

interface BotSimulatorProps {
  onRefreshStats: () => void;
}

export default function BotSimulator({ onRefreshStats }: BotSimulatorProps) {
  // Simulator User State properties
  const [telegramId, setTelegramId] = useState('987654321'); // Default: gamer_pro
  const [username, setUsername] = useState('gamer_pro');
  const [userPoints, setUserPoints] = useState(8);
  const [referrerId, setReferrerId] = useState('');

  // Dialog records state
  const [chatLog, setChatLog] = useState<ChatMessage[]>([
    {
      sender: 'bot',
      text: '🤖 به شبیه‌ساز هوشمند ربات تلگرام خوش آمدید! بر روی دکمه "/start" زیر بزنید یا پیامی بفرستید تا پاسخ‌های خودکار و منوهای ربات را تست کنید.'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const endScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  const dispatchBotAction = async (commandToBtn?: string, rawStringText?: string) => {
    setLoading(true);
    try {
      // Append user's action to logs
      if (rawStringText) {
        setChatLog(prev => [...prev, { sender: 'user', text: rawStringText }]);
      } else if (commandToBtn) {
        setChatLog(prev => [...prev, { sender: 'user', text: `Clicked: ${commandToBtn}` }]);
      }

      // Send payload
      const response = await fetch('/api/bot/simulate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId,
          username,
          command: commandToBtn,
          text: rawStringText,
          referrerId: referrerId || undefined
        })
      });

      const data = await response.json();
      if (data.error) {
        setChatLog(prev => [...prev, { sender: 'bot', text: `❌ Error: ${data.error}` }]);
      } else {
        if (data.userPoints !== undefined) {
          setUserPoints(data.userPoints);
        }
        
        // Append all returning messages
        if (data.messages && data.messages.length > 0) {
          data.messages.forEach((msg: any) => {
            setChatLog(prev => [...prev, {
              sender: 'bot',
              text: msg.text,
              buttons: msg.buttons,
              mediaUrl: msg.mediaUrl,
              mediaType: msg.mediaType
            }]);
          });
        }
      }
    } catch (err) {
      console.error(err);
      setChatLog(prev => [...prev, { sender: 'bot', text: '🛑 Connection failed to backend Bot Simulator hook.' }]);
    } finally {
      setLoading(false);
      setInputText('');
      onRefreshStats(); // Trigger analytical updates!
    }
  };

  const handleStart = () => {
    dispatchBotAction('start', '/start');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    dispatchBotAction(undefined, inputText);
  };

  return (
    <div className="flex-1 p-8 bg-slate-50/50 flex flex-col h-screen overflow-hidden text-right" dir="rtl">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-6 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-row-reverse">
        <div className="text-right">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">شبیه‌ساز و تست منوهای ربات</h2>
          <p className="text-sm text-slate-500 mt-1">
            درگاه‌های امتیاز، زیرمنوهای تودرتو، سیستم ارجاع و تیکت‌های پشتیبانی را به صورت زنده به عنوان کاربر نهایی تست کنید.
          </p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-0 overflow-hidden">
        {/* User Persona config (Left column) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm h-full flex flex-col justify-between overflow-y-auto shrink-0 text-right">
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider block border-b border-slate-50 pb-3 flex items-center gap-2 flex-row-reverse text-right">
              <UserCheck className="h-5 w-5 text-blue-500" />
              <span>پروفایل کاربر فرضی تلگرام</span>
            </h3>

            {/* Quick selectors prefilled */}
            <div className="space-y-3">
              <label className="text-xxs font-bold text-slate-400 uppercase tracking-widest block text-right">انتخاب سریع الگوی کاربر فرضی:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="btn-persona-gamer"
                  onClick={() => {
                    setTelegramId('987654321');
                    setUsername('gamer_pro');
                    setUserPoints(8);
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-semibold hover:bg-slate-50 transition text-slate-700 ${
                    telegramId === '987654321' ? 'bg-blue-50/40 border-blue-200 text-blue-700 font-bold' : 'border-slate-150'
                  }`}
                >
                  الکس (۸ امتیاز)
                </button>
                <button
                  id="btn-persona-ninja"
                  onClick={() => {
                    setTelegramId('223344556');
                    setUsername('cod_ninja');
                    setUserPoints(1);
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-semibold hover:bg-slate-50 transition text-slate-700 ${
                    telegramId === '223344556' ? 'bg-blue-50/40 border-blue-200 text-blue-700 font-bold' : 'border-slate-150'
                  }`}
                >
                  مارکوس (۱ امتیاز)
                </button>
              </div>
            </div>

            {/* Specific values customizer */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-bold text-slate-600 block uppercase tracking-wider">شناسه عددی تلگرام کاربر فرضی</label>
                <input
                  id="form-sim-id"
                  type="text"
                  value={telegramId}
                  onChange={e => setTelegramId(e.target.value)}
                  className="w-full text-slate-800 text-xs border border-slate-200 focus:outline-none px-3.5 py-2 rounded-lg font-mono transition text-right"
                />
              </div>

              <div className="space-y-1.5 text-right">
                <label className="text-xs font-bold text-slate-600 block uppercase tracking-wider">(یوزرنیم) نام کاربری فرضی</label>
                <input
                  id="form-sim-username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full text-slate-800 text-xs border border-slate-200 focus:outline-none px-3.5 py-2 rounded-lg font-mono transition text-right"
                />
              </div>

              {/* Referral Simulated inviter */}
              <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-right">
                <label className="text-xs font-bold font-serif text-slate-700 block uppercase tracking-wider flex items-center gap-1 flex-row-reverse text-right">
                  <Sparkles className="h-3.5 w-3.5 text-blue-500 animate-spin" />
                  <span>تست سیستم دعوت و ارجاع</span>
                </label>
                <input
                  id="form-sim-referrer"
                  type="text"
                  value={referrerId}
                  onChange={e => setReferrerId(e.target.value)}
                  placeholder="شناسه معرف (مثال: 556677889)"
                  className="w-full text-slate-800 text-xs border border-slate-200 focus:outline-none px-3.5 py-2 rounded-lg font-mono transition bg-white text-right"
                />
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed text-right">
                  با وارد کردن شناسه کاربر بالا و زدن دکمه /start، برای آن کاربر امتیاز هدیه دعوت ثبت خواهد شد.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50/40 rounded-2xl border border-blue-100 mt-4 text-right">
            <h4 className="text-xs font-bold text-blue-800 uppercase tracking-widest flex items-center gap-1 mb-1 flex-row-reverse">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <span>موجودی و آمار کاربر فرضی</span>
            </h4>
            <div className="flex justify-between text-xs text-slate-600 mt-2 flex-row-reverse">
              <span>موجودی امتیاز:</span>
              <span className="font-bold font-mono text-blue-700">💰 {userPoints} امتیاز</span>
            </div>
          </div>
        </div>

        {/* Smartphone mockup layout (Middle & Right columns) */}
        <div className="lg:col-span-2 bg-slate-900 border-4 border-slate-750 rounded-[35px] h-full shadow-2xl flex flex-col overflow-hidden relative max-w-[500px] lg:max-w-full mx-auto w-full font-sans ring-10 ring-slate-800">
          
          {/* Top Notch Dynamic Ear speaker layout */}
          <div className="h-7 bg-slate-955 flex items-center justify-center select-none relative shrink-0">
            <div className="h-4.5 w-24 bg-slate-900 rounded-full flex items-center justify-center border border-slate-800">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-750 mr-2.5"></span>
              <span className="h-1 w-8 bg-slate-800 rounded"></span>
            </div>
            <div className="absolute right-5 text-[10px] text-slate-400 font-semibold uppercase font-mono">
              LTE 100%
            </div>
          </div>

          {/* Telegram Header */}
          <div className="bg-slate-800 p-4 border-b border-slate-850 flex items-center justify-between shrink-0 select-none flex-row-reverse text-right" dir="rtl">
            <div className="flex items-center gap-3 flex-row-reverse">
              <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                <Bot className="h-5 w-5" />
              </div>
              <div className="text-right">
                <h3 className="font-bold text-white text-sm">ربات پویای تلگرام</h3>
                <p className="text-[10px] text-emerald-400">شبیه‌ساز زنده ربات</p>
              </div>
            </div>

            <button
              id="btn-sim-reset-log"
              onClick={() => {
                setChatLog([{ sender: 'bot', text: '🤖 شبیه‌ساز پاکسازی شد. دستور /start مجدداً فرستاده شد.' }]);
                setUserPoints(0);
              }}
              className="p-1 px-2.5 text-[10px] font-bold border border-slate-750 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition flex items-center gap-1 flex-row-reverse"
              title="پاکسازی تاریخچه گفتگو"
            >
              <RefreshCw className="h-3 w-3" />
              <span>پاکسازی گفتگو</span>
            </button>
          </div>

          {/* Messages area list */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop')] bg-cover relative bg-blend-soft-light bg-slate-850">
            {chatLog.map((chat, idx) => (
              <div key={idx} className={`flex flex-col ${chat.sender === 'user' ? 'items-end' : 'items-start'}`}>
                {/* Chat bubble body */}
                <div className={`max-w-[85%] sm:max-w-[70%] p-3.5 rounded-2xl shadow-md text-sm border font-sans text-right ${
                  chat.sender === 'user'
                    ? 'bg-emerald-650 text-white border-emerald-700 rounded-tr-none'
                    : 'bg-slate-800 text-slate-100 border-slate-750 rounded-tl-none'
                }`}>
                  {/* Render simulated media attach */}
                  {chat.mediaUrl && (
                    <div className="space-y-2 mb-2 select-none">
                      {chat.mediaType === 'photo' && (
                        <div className="rounded-lg overflow-hidden border border-slate-700 bg-slate-900 pointer-events-none">
                          <img referrerPolicy="no-referrer" src={chat.mediaUrl} alt="Attached Visual Logo Content" className="w-full h-32 object-cover" />
                        </div>
                      )}
                      {chat.mediaType === 'video' && (
                        <div className="rounded-lg p-2.5 bg-slate-850 border border-slate-750 text-xs text-sky-450 flex items-center gap-1.5 flex-row-reverse justify-end">
                          📹 ویدیو پیوست شده
                        </div>
                      )}
                      {chat.mediaType === 'document' && (
                        <div className="rounded p-2 bg-slate-850 border border-slate-700 text-xs flex items-center justify-between text-blue-300 flex-row-reverse">
                          <span>📦 دانلود فایل پیوست</span>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="whitespace-pre-line text-xs leading-relaxed text-right">{chat.text}</p>

                  {/* Render keyboard buttons inside bubble rows */}
                  {chat.buttons && chat.buttons.length > 0 && (
                    <div className="grid grid-cols-2 gap-1.5 mt-3 pt-3 border-t border-slate-700/60 select-none">
                      {chat.buttons.map((btn: any, bIdx: number) => {
                        if (btn.url) {
                          return (
                            <a
                              id={`sim-key-url-${bIdx}`}
                              key={bIdx}
                              href={btn.url}
                              target="_blank"
                              rel="noreferrer"
                              className="col-span-2 text-center bg-slate-700 hover:bg-blue-600 text-white text-xxs font-bold py-2 px-1.5 rounded-lg border border-slate-600 transition flex items-center justify-center gap-1 flex-row-reverse"
                            >
                              <span>👉 {btn.label}</span>
                            </a>
                          );
                        } else {
                          return (
                            <button
                              id={`sim-key-cmd-${bIdx}`}
                              key={bIdx}
                              onClick={() => dispatchBotAction(btn.cmd, undefined)}
                              disabled={loading}
                              className="bg-slate-755 hover:bg-slate-700 hover:text-blue-300 text-slate-100 text-[10px] font-bold py-2.5 px-2 rounded-lg border border-slate-700 transition text-center"
                            >
                              {btn.label}
                            </button>
                          );
                        }
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex items-start gap-1 justify-end">
                <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce"></span>
                <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]"></span>
                <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]"></span>
              </div>
            )}
            <div ref={endScrollRef} />
          </div>

          {/* Chat Quick Actions Row */}
          <div className="px-4 py-2 border-t border-slate-850 bg-slate-800 flex items-center gap-2 select-none shrink-0 flex-row-reverse text-right">
            <button
              id="btn-sim-quick-start"
              onClick={handleStart}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xxs px-3 py-1.5 rounded-full shadow-sm cursor-pointer transition border border-blue-700"
            >
              /start
            </button>
            <span className="text-slate-500 font-mono text-[9px] text-right">ارسال /start جهت دریافت اولین ردیف منوهای هوشمند</span>
          </div>

          {/* Typing field */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-850 bg-slate-800 flex items-center gap-2 shrink-0 flex-row-reverse">
            <input
              id="form-chat-type-text"
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="پیامی بنویسید یا سوال یا درخواست تیکت پشتیبانی وارد کنید..."
              className="flex-1 bg-slate-850 border border-slate-700 focus:outline-none focus:border-blue-600 text-xs px-3.5 py-2.5 rounded-xl text-white placeholder-slate-500 text-right"
            />
            <button
              id="btn-chat-type-submit"
              type="submit"
              disabled={!inputText.trim()}
              className="bg-blue-600 hover:bg-blue-500 h-9 w-9 text-white rounded-xl shadow-md flex items-center justify-center disabled:opacity-40 cursor-pointer transition transform rotate-180"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
