// ==========================================
// MODULE: SUPPORT SYSTEM
// PURPOSE: Handles viewing, searching, and replying to user support tickets
// ==========================================

import React, { useState } from 'react';
import { MessageSquare, Search, Send, CheckCircle, Archive, ArchiveRestore, User } from 'lucide-react';
import { SupportTicket } from '../types';

interface SupportSystemProps {
  tickets: SupportTicket[];
  onReplyTicket: (id: string, text: string) => void;
  onUpdateStatus: (id: string, status: 'open' | 'resolved' | 'archived') => void;
}

export default function SupportSystem({ tickets, onReplyTicket, onUpdateStatus }: SupportSystemProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTicketId, setActiveTicketId] = useState<string | null>(tickets.length > 0 ? tickets[0].id : null);
  const [replyText, setReplyText] = useState('');

  const filteredTickets = tickets.filter((t) => {
    const q = searchTerm.toLowerCase();
    return (
      t.firstName.toLowerCase().includes(q) ||
      t.username.toLowerCase().includes(q) ||
      t.telegramId.includes(q)
    );
  });

  const activeTicket = tickets.find((t) => t.id === activeTicketId);

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicketId || !replyText.trim()) return;
    onReplyTicket(activeTicketId, replyText);
    setReplyText('');
  };

  return (
    <div className="flex-1 p-8 bg-slate-50/50 flex flex-col h-screen overflow-hidden text-right" dir="rtl">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-6 shrink-0 flex-row-reverse text-right">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight text-right">مرکز پشتیبانی و تیکت‌های کاربران</h2>
        <p className="text-sm text-slate-500 mt-1 text-right">
          ارتباط مستقیم با کاربران ربات. پاسخ‌های ارسالی شما در این بخش فوراً به پیام تلگرامی تبدیل شده و به دست کاربر واقعی می‌رسد.
        </p>
      </div>

      {/* Main Inbox splits layout */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0 flex-row-reverse text-right">
        {/* Inbox List Left Bar */}
        <div className="w-80 bg-white border border-slate-150 rounded-2xl flex flex-col overflow-hidden shrink-0 text-right">
          <div className="p-4 border-b border-slate-100 bg-slate-50/55 space-y-3 text-right">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest block text-right">صندوق گفتگوهای پشتیبانی</h3>
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-150 flex-row-reverse">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                id="search-support-tickets"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="جستجوی کاربر یا آیدی تلگرام..."
                className="w-full text-xs text-slate-800 focus:outline-none placeholder-slate-400 text-right font-sans"
              />
            </div>
          </div>

          {/* List box */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 text-right font-sans">
            {filteredTickets.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                گفتگویی یافت نشد.
              </div>
            ) : (
              filteredTickets.map((t) => {
                const lastMsg = t.messages[t.messages.length - 1];
                const isActive = t.id === activeTicketId;
                return (
                  <div
                    key={t.id}
                    onClick={() => setActiveTicketId(t.id)}
                    className={`p-4 cursor-pointer transition flex flex-col gap-1 hover:bg-slate-50/40 text-right ${
                      isActive ? 'bg-blue-50/35 border-r-4 border-blue-600' : ''
                    }`}
                  >
                    <div className="flex justify-between items-center flex-row-reverse text-right">
                      <span className="font-bold text-slate-800 text-sm truncate max-w-[140px] text-right">{t.firstName}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        t.status === 'open' 
                          ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                          : t.status === 'resolved' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-slate-100 text-slate-500'
                      }`}>
                        {t.status === 'open' ? 'باز' : t.status === 'resolved' ? 'حل شده' : 'بایگانی شده'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-450 font-mono text-right" dir="ltr">@{t.username || 'anonymous'}</p>
                    <p className="text-xs text-slate-500 max-w-full truncate italic mt-1 bg-slate-50/70 p-1.5 rounded text-right">
                       "{lastMsg ? lastMsg.text : 'پیامی وجود ندارد'}"
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Conversation panel of selected ticket */}
        <div className="flex-1 bg-white border border-slate-150 rounded-2xl flex flex-col overflow-hidden bg-slate-50/20 text-right">
          {activeTicket ? (
            <>
              {/* Profile Top Bar */}
              <div className="p-5 border-b border-slate-100 bg-white flex justify-between items-center shrink-0 shadow-sm flex-row-reverse text-right">
                <div className="flex items-center gap-3 flex-row-reverse text-right">
                  <div className="h-10 w-10 bg-blue-50 text-blue-700 font-bold rounded-xl flex items-center justify-center">
                    {activeTicket.firstName.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-right">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 flex-row-reverse justify-end">
                      <span>{activeTicket.firstName}</span>
                      <span className="text-xs text-slate-400 font-mono font-normal" dir="ltr">@{activeTicket.username}</span>
                    </h4>
                    <p className="text-xs text-slate-450 font-mono text-right">شناسه تلگرام: {activeTicket.telegramId}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-row-reverse">
                  <button
                    id="btn-ticket-resolve"
                    onClick={() => onUpdateStatus(activeTicket.id, activeTicket.status === 'resolved' ? 'open' : 'resolved')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition flex-row-reverse cursor-pointer ${
                      activeTicket.status === 'resolved'
                        ? 'bg-slate-50 border-slate-150 text-slate-600 hover:bg-slate-100'
                        : 'bg-emerald-50 border-emerald-250 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>{activeTicket.status === 'resolved' ? 'بازگشایی مجدد تیکت' : 'بستن / حل گفتگو'}</span>
                  </button>

                  <button
                    id="btn-ticket-archive"
                    onClick={() => onUpdateStatus(activeTicket.id, activeTicket.status === 'archived' ? 'open' : 'archived')}
                    className="p-1.5 text-slate-400 hover:text-slate-650 border border-slate-150 rounded-lg hover:bg-slate-50 cursor-pointer"
                    title={activeTicket.status === 'archived' ? 'خروج از بایگانی' : 'بایگانی کردن گفتگو'}
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 text-right">
                {activeTicket.messages.map((msg, i) => {
                  const isAdmin = msg.sender === 'admin';
                  return (
                    <div 
                      key={i} 
                      className={`flex flex-col ${isAdmin ? 'items-start text-left' : 'items-end text-right'}`}
                    >
                      <div className={`max-w-md p-3.5 rounded-2xl text-sm shadow-sm font-sans text-right ${
                        isAdmin 
                          ? 'bg-blue-600 text-white rounded-tl-none' 
                          : 'bg-white text-slate-800 border border-slate-100 rounded-tr-none'
                      }`}>
                        <p>{msg.text}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono mt-1 px-1 text-right">
                        {isAdmin ? 'پشتیبان سیستم' : activeTicket.firstName} • {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Reply field form */}
              <form onSubmit={handleSendReply} className="p-4 border-t border-slate-100 bg-white flex items-center gap-3 shrink-0 flex-row-reverse font-sans">
                <input
                  id="form-support-reply-text"
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`پاسخ خود را به ${activeTicket.firstName} بنویسید...`}
                  className="flex-1 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 px-4 py-3 rounded-xl bg-slate-50/50 text-right"
                />
                <button
                  id="btn-support-reply-send"
                  type="submit"
                  disabled={!replyText.trim()}
                  className="bg-blue-600 text-white h-11 w-11 rounded-xl flex items-center justify-center shadow-md shadow-blue-650/10 hover:bg-blue-500 disabled:opacity-50 transition cursor-pointer flex-row-reverse"
                >
                  <Send className="h-4.5 w-4.5" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-slate-100 text-center py-20">
              <MessageSquare className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-slate-500 text-sm font-medium">جهت مشاهده پیام‌ها و گفتگو، یکی از کاربران را از لیست سمت راست انتخاب کنید.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
