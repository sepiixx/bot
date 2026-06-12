// ==========================================
// MODULE: FORCED JOIN SYSTEM
// PURPOSE: Manage channels, groups, and membership verification rules
// ==========================================

import React, { useState } from 'react';
import { Network, Plus, Trash2, ShieldCheck, Clock, Calendar, Globe, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { ForcedJoinChannel } from '../types';

interface ForcedJoinProps {
  channels: ForcedJoinChannel[];
  onCreateChannel: (channel: Partial<ForcedJoinChannel>) => void;
  onUpdateChannel: (id: string, channel: Partial<ForcedJoinChannel>) => void;
  onDeleteChannel: (id: string) => void;
}

export default function ForcedJoin({ channels, onCreateChannel, onUpdateChannel, onDeleteChannel }: ForcedJoinProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  
  // State variables for form
  const [type, setType] = useState<'channel' | 'group'>('channel');
  const [title, setTitle] = useState('');
  const [chatId, setChatId] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [addAfterHours, setAddAfterHours] = useState('');
  const [removeAfterHours, setRemoveAfterHours] = useState('');
  const [activateAt, setActivateAt] = useState('');
  const [deactivateAt, setDeactivateAt] = useState('');

  const handleResetForm = () => {
    setType('channel');
    setTitle('');
    setChatId('');
    setInviteLink('');
    setAddAfterHours('');
    setRemoveAfterHours('');
    setActivateAt('');
    setDeactivateAt('');
    setShowAddForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateChannel({
      type,
      title,
      chatId,
      inviteLink,
      status: (activateAt || addAfterHours) ? 'scheduled_add' : 'active',
      addAfterHours: addAfterHours ? Number(addAfterHours) : null,
      removeAfterHours: removeAfterHours ? Number(removeAfterHours) : null,
      activateAt: activateAt || null,
      deactivateAt: deactivateAt || null
    });
    handleResetForm();
  };

  const toggleStatus = (ch: ForcedJoinChannel) => {
    const nextStatus = ch.status === 'active' ? 'inactive' : 'active';
    onUpdateChannel(ch.id, { status: nextStatus });
  };

  return (
    <div className="flex-1 p-8 space-y-8 bg-slate-50/50 overflow-y-auto text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex-row-reverse text-right">
        <div className="text-right">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">درگاه‌های شرط عضویت اجباری</h2>
          <p className="text-sm text-slate-500 mt-1">
            کاربران را مجبور به عضویت در کانال‌ها یا گروه‌های خود کنید تا بعد از عضویت بتوانند به منوها و دکمه‌های ربات دسترسی پیدا کنند.
          </p>
        </div>
        {!showAddForm && (
          <button
            id="btn-add-fj-trigger"
            onClick={() => setShowAddForm(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-blue-500 shadow-md shadow-blue-600/10 transition-all self-start sm:self-center flex-row-reverse"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>افزودن درگاه عضویت اجباری</span>
          </button>
        )}
      </div>

      {/* Creation form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm space-y-6 text-right">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider block border-b border-slate-50 pb-3 text-right">
            افزودن شرط عضویت اجباری جدید به سیستم
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-right">
            {/* Type */}
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block text-right">نوع شرط عضویت</label>
              <select
                id="form-fj-type"
                value={type}
                onChange={e => setType(e.target.value as any)}
                className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl bg-white transition text-right"
              >
                <option value="channel">کانال تلگرام</option>
                <option value="group">گروه یا سوپرگروه</option>
              </select>
            </div>

            {/* Title */}
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block text-right">عنوان یا نام نمایشی کانال/گروه</label>
              <input
                id="form-fj-title"
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="مثال: کانال اطلاع‌رسانی کالاف"
                className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl transition text-right"
              />
            </div>

            {/* Chat ID (@username or numeric ID) */}
            <div className="space-y-1.5 text-right font-sans">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block text-right">یوزرنیم کانال (با @) یا آیدی عددی عمومی</label>
              <input
                id="form-fj-chatId"
                type="text"
                required
                value={chatId}
                onChange={e => setChatId(e.target.value)}
                placeholder="مثال: @my_channel یا -100123456789"
                className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl transition text-left"
                dir="ltr"
              />
            </div>

            {/* Invite Link */}
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block text-right">لینک عمومی یا دعوت خصوصی تلگرام</label>
              <input
                id="form-fj-link"
                type="url"
                required
                value={inviteLink}
                onChange={e => setInviteLink(e.target.value)}
                placeholder="https://t.me/invite/..."
                className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl transition text-left"
                dir="ltr"
              />
            </div>
          </div>

          {/* Advanced delay triggers */}
          <div className="border-t border-slate-100 pt-6 space-y-4 text-right">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 flex-row-reverse text-right">
              <Clock className="h-4 w-4" />
              <span>تنظیم فعال‌سازی هوشمند (محاسبه ساعتی خودکار)</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-semibold text-slate-505 block text-right">فعال شدن درگاه عضویت پس از X ساعت</label>
                <input
                  id="form-fj-addAfter"
                  type="number"
                  min="1"
                  value={addAfterHours}
                  onChange={e => setAddAfterHours(e.target.value)}
                  placeholder="مثال: 24 (بعد از ۲۴ ساعت نمایان می‌شود)"
                  className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl transition text-right"
                />
              </div>
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-semibold text-slate-500 block text-right">غیرفعال و حذف شدن درگاه پس از Y ساعت</label>
                <input
                  id="form-fj-removeAfter"
                  type="number"
                  min="1"
                  value={removeAfterHours}
                  onChange={e => setRemoveAfterHours(e.target.value)}
                  placeholder="مثال: 48 (بعد از این مدت خودکار برداشته می‌شود)"
                  className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl transition text-right"
                />
              </div>
            </div>
          </div>

          {/* Calendar-based Timelines */}
          <div className="border-t border-slate-100 pt-6 space-y-4 text-right">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 flex-row-reverse text-right">
              <Calendar className="h-4 w-4" />
              <span>زمان‌بندی تاریخ معین تقویم سیستم</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-semibold text-slate-500 block text-right">تاریخ و ساعت دقیق شروع فعال‌سازی شرط</label>
                <input
                  id="form-fj-activate-at"
                  type="datetime-local"
                  value={activateAt}
                  onChange={e => setActivateAt(e.target.value)}
                  className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl transition text-right"
                />
              </div>
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-semibold text-slate-500 block text-right">تاریخ و ساعت دقیق منقضی و غیرفعال شدن شرط</label>
                <input
                  id="form-fj-deactivate-at"
                  type="datetime-local"
                  value={deactivateAt}
                  onChange={e => setDeactivateAt(e.target.value)}
                  className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl transition text-right"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 flex-row-reverse">
            <button
              id="form-fj-submit"
              type="submit"
              className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-500 shadow-md shadow-blue-600/10 transition-all cursor-pointer"
            >
              ذخیره درگاه و فعال‌سازی
            </button>
            <button
              id="form-fj-cancel"
              type="button"
              onClick={handleResetForm}
              className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              انصراف
            </button>
          </div>
        </form>
      )}

      {/* channels listing list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden text-right">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center flex-row-reverse">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-right">لیست درگاه‌های عضویت اجباری فعال و زمان‌بندی شده</h3>
          <span className="text-xs text-slate-500 font-medium">{channels.length} درگاه عضویت ثبت شده</span>
        </div>

        <div className="divide-y divide-slate-100 text-slate-700 text-right">
          {channels.length === 0 ? (
            <div className="text-center py-16">
              <Network className="h-10 w-10 text-slate-350 mx-auto mb-3" />
              <p className="text-sm text-slate-500 font-medium">هیچ کانال یا گروه شرط عضویت اجباری پیکربندی نشده است.</p>
              <p className="text-xs text-slate-400 mt-1">کاربران می‌توانند مستقیماً از تمام بخش‌های ربات استفاده کنند.</p>
            </div>
          ) : (
            channels.map((ch) => (
              <div key={ch.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50/30 transition flex-row-reverse text-right">
                <div className="flex items-start gap-3.5 flex-row-reverse text-right">
                  <div className={`p-3 rounded-xl border ${
                    ch.status === 'active' 
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                      : ch.status === 'scheduled_add' || ch.status === 'scheduled_remove'
                        ? 'bg-amber-50 border-amber-100 text-amber-600'
                        : 'bg-slate-5s border-slate-100 text-slate-400'
                  }`}>
                    <Globe className="h-6 w-6" />
                  </div>
                  <div className="text-right">
                    <div className="flex flex-wrap items-center gap-2 flex-row-reverse justify-end">
                      <h4 className="text-sm font-bold text-slate-800">{ch.title}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        ch.type === 'channel'
                          ? 'bg-blue-50 text-blue-700 border-blue-100'
                          : 'bg-emerald-55 text-emerald-700 border-emerald-100'
                      }`}>
                        {ch.type === 'channel' ? 'کانال' : 'گروه'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                        ch.status === 'active' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : ch.status === 'scheduled_add' || ch.status === 'scheduled_remove'
                            ? 'bg-amber-50 text-amber-700 border-amber-202'
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        {ch.status === 'active' ? 'فعال' : ch.status === 'scheduled_add' ? 'برنامه‌ریزی افزودن' : 'غیرفعال'}
                      </span>
                    </div>
                    
                    <div className="text-xs text-slate-400 mt-1 font-mono flex items-center gap-3 flex-row-reverse justify-end">
                      <span>شناسه: {ch.chatId}</span>
                      <span>•</span>
                      <a href={ch.inviteLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-0.5 font-bold">
                        مشاهده لینک عضویت
                      </a>
                    </div>

                    {/* Show schedules details */}
                    {(ch.addAfterHours || ch.removeAfterHours || ch.activateAt || ch.deactivateAt) && (
                      <div className="mt-2.5 p-2.5 bg-slate-50 rounded-lg border border-slate-100 space-y-1 text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 flex-row-reverse text-right">
                          <Clock className="h-3.5 w-3.5" />
                          <span>دستورات و زمان‌بندی خودکار سیستم:</span>
                        </p>
                        {ch.addAfterHours && <p className="text-xs text-slate-600 text-right">➕ فعال شدن خودکار پس از {ch.addAfterHours} ساعت از عضویت کاربر</p>}
                        {ch.removeAfterHours && <p className="text-xs text-slate-600 text-right">➖ قطع دسترسی خودکار پس از {ch.removeAfterHours} ساعت</p>}
                        {ch.activateAt && <p className="text-xs text-slate-600 text-right">📅 زمان دقیق راه‌اندازی: {new Date(ch.activateAt).toLocaleString()}</p>}
                        {ch.deactivateAt && <p className="text-xs text-slate-600 text-right">📅 زمان دقیق خروج از مدار: {new Date(ch.deactivateAt).toLocaleString()}</p>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center flex-row-reverse">
                  <button
                    id={`btn-fj-toggle-${ch.id}`}
                    onClick={() => toggleStatus(ch)}
                    className="p-1 px-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-600 flex items-center gap-1.5 transition flex-row-reverse"
                  >
                    {ch.status === 'active' ? (
                      <>
                        <ToggleRight className="h-5 w-5 text-blue-600" />
                        <span>غیرفعال‌سازی موقت</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="h-5 w-5 text-slate-400" />
                        <span>فعال‌سازی درگاه</span>
                      </>
                    )}
                  </button>

                  <button
                    id={`btn-fj-delete-${ch.id}`}
                    onClick={() => {
                      if (confirm(`آیا تمایل دارید درگاه عضویت کانال "${ch.title}" را کاملاً حذف کنید؟`)) {
                        onDeleteChannel(ch.id);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="حذف درگاه"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
