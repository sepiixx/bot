// ==========================================
// MODULE: BROADCAST DISPATCH SYSTEM
// PURPOSE: Manage and execute mass message dispatching to bot users with metrics
// ==========================================

import React, { useState } from 'react';
import { 
  Radio, 
  Send, 
  CheckCircle, 
  FileText, 
  Image, 
  Video, 
  AlertTriangle, 
  Percent, 
  Clock, 
  Ban, 
  XOctagon,
  Users
} from 'lucide-react';
import { BroadcastLog } from '../types';

interface BroadcastSystemProps {
  logs: BroadcastLog[];
  onTriggerBroadcast: (bc: Partial<BroadcastLog>) => void;
  onCancelBroadcast: (id: string) => void;
}

export default function BroadcastSystem({ logs, onTriggerBroadcast, onCancelBroadcast }: BroadcastSystemProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [type, setType] = useState<'text' | 'photo' | 'video' | 'document'>('text');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [target, setTarget] = useState<'all' | 'active' | 'inactive' | 'with_points' | 'without_points'>('all');

  const handleReset = () => {
    setType('text');
    setContent('');
    setMediaUrl('');
    setTarget('all');
    setShowAddForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onTriggerBroadcast({
      type,
      content,
      mediaUrl: type !== 'text' ? mediaUrl : '',
      target
    });
    handleReset();
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'pending': return 'در صف انتظار';
      case 'processing': return 'در حال ارسال';
      case 'completed': return 'پایان‌یافته';
      case 'cancelled': return 'لغو شده';
      default: return 'پایان‌یافته';
    }
  };

  const getStatusBadgeClass = (status?: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  return (
    <div className="flex-1 p-8 space-y-8 bg-slate-50/50 overflow-y-auto text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex-row-reverse text-right">
        <div className="text-right">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">پنل مدیریت ارسال پیام همگانی (برودکست هوم)</h2>
          <p className="text-sm text-slate-500 mt-1">
            ارسال پیام‌های گروهی پیشرفته، اطلاعیه‌ها و تصاویر با رعایت سرعت ارسال تلگرام (۲٠ پیام در ثانیه) و قابلیت تعلیق زنده.
          </p>
        </div>
        {!showAddForm && (
          <button
            id="btn-add-bc-trigger"
            onClick={() => setShowAddForm(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-blue-500 shadow-md shadow-blue-600/10 transition-all self-start sm:self-center flex-row-reverse cursor-pointer"
          >
            <Radio className="h-4.5 w-4.5" />
            <span>ایجاد پیام همگانی پیشرفته</span>
          </button>
        )}
      </div>

      {/* Creation form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-blue-150 shadow-sm space-y-6 text-right">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider block border-b border-slate-50 pb-3 text-right">
            تنظیم مخاطبین و قالب محتوایی برودکست
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
            {/* Target Audience */}
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-bold text-slate-600 tracking-wider block text-right">معیار هدف‌گیری کاربران</label>
              <select
                id="form-bc-target"
                value={target}
                onChange={e => setTarget(e.target.value as any)}
                className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl bg-white transition text-right font-medium"
              >
                <option value="all">ارسال به تمامی کاربران ربات (همگی)</option>
                <option value="active">ارسال فقط به کاربران فعال (غیرمسدود)</option>
                <option value="inactive">ارسال به کاربران غیرفعال (بدون فعالیت در ۷ روز گذشته)</option>
                <option value="with_points">ارسال به کاربران دارای امتیاز (بیش از ۰ امتیاز)</option>
                <option value="without_points">ارسال به کاربران بدون امتیاز (سپر امتیاز صفر)</option>
              </select>
            </div>

            {/* Broadcast format */}
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-bold text-slate-600 tracking-wider block text-right">قالب رسانه پیوست</label>
              <select
                id="form-bc-type"
                value={type}
                onChange={e => setType(e.target.value as any)}
                className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl bg-white transition text-right font-medium"
              >
                <option value="text">پیام متنی (بدون رسانه)</option>
                <option value="photo">ارسال عکس (تصویر همراه با کپشن)</option>
                <option value="video">ارسال ویدیو (MP4 همراه با کپشن)</option>
                <option value="document">ارسال فایل (ZIP یا داکیومنت با کپشن)</option>
              </select>
            </div>

            {/* Media attachment url (conditional) */}
            {type !== 'text' && (
              <div className="space-y-1.5 md:col-span-2 text-right">
                <label className="text-xs font-semibold text-slate-600 tracking-wider block text-right font-mono">لینک اینترنتی فایل ضمیمه (Media URL)</label>
                <input
                  id="form-bc-mediaUrl"
                  type="url"
                  required
                  value={mediaUrl}
                  onChange={e => setMediaUrl(e.target.value)}
                  placeholder="https://example.com/asset.jpg"
                  className="w-full text-slate-850 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl transition text-left font-mono"
                  dir="ltr"
                />
              </div>
            )}
          </div>

          {/* Broadcast Body */}
          <div className="space-y-1.5 text-right">
            <label className="text-xs font-bold text-slate-600 tracking-wider block text-right">متن پیام ارسالی (پشتیبانی کامل از Markdown تلگرام)</label>
            <textarea
              id="form-bc-content"
              rows={5}
              required
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="📋 محتوای خود را برای توزیع همگانی بنویسید..."
              className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl transition text-right font-medium resize-none"
            ></textarea>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 flex-row-reverse">
            <button
              id="form-bc-submit"
              type="submit"
              className="px-6 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-500 shadow-md shadow-blue-600/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="h-4 w-4" />
              <span>آغاز فرآیند ارسال همگانی</span>
            </button>
            <button
              id="form-bc-cancel"
              type="button"
              onClick={handleReset}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-sm font-semibold rounded-xl text-slate-700 transition cursor-pointer"
            >
              انصراف
            </button>
          </div>
        </form>
      )}

      {/* Broadcast History logs */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden text-right">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider text-right">تاریخچه و وضعیت برودکست‌های همگانی</h3>
        </div>

        <div className="divide-y divide-slate-150 text-right">
          {logs.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Radio className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold">هیچ پیام همگانی قبلاً فرستاده نشده است.</p>
            </div>
          ) : (
            [...logs].reverse().map((log: any) => {
              const processed = log.processedCount ?? (log.successCount + log.failureCount);
              const total = log.totalTarget ?? processed;
              const hasTimeline = log.status === 'processing' || log.status === 'pending';
              const progressPct = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 100;
              
              return (
                <div key={log.id} className="p-5 flex flex-col gap-4 hover:bg-slate-50/10 transition text-right">
                  {/* Status metadata rail */}
                  <div className="flex flex-wrap justify-between items-center gap-3 flex-row-reverse">
                    <div className="flex items-center gap-2 flex-row-reverse">
                      <span className={`p-1 px-2.5 text-[10px] font-bold border rounded-md uppercase ${getStatusBadgeClass(log.status)}`}>
                        {getStatusLabel(log.status)}
                      </span>
                      <span className="p-1 px-2 text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-150 rounded-md">
                        هدف: {
                          log.target === 'all' ? 'همه کاربران' :
                          log.target === 'active' ? 'کاربران فعال' :
                          log.target === 'inactive' ? 'کاربران غیرفعال' :
                          log.target === 'with_points' ? 'کاربران دارای امتیاز' :
                          log.target === 'without_points' ? 'کاربران بدون امتیاز' : 'سفارشی'
                        }
                      </span>
                      <span className="p-1 px-2 text-[10px] font-bold bg-indigo-50 text-indigo-700 rounded-md flex items-center gap-1">
                        {log.type === 'photo' && <Image className="h-3 w-3" />}
                        {log.type === 'video' && <Video className="h-3 w-3" />}
                        {log.type === 'document' && <FileText className="h-3 w-3" />}
                        <span>قالب: {log.type === 'text' ? 'متن خالی' : log.type === 'photo' ? 'عکس پیوست' : log.type === 'video' ? 'ویدیو پیوست' : 'سند پیوست'}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 font-mono">
                        {new Date(log.sentAt).toLocaleDateString('fa-IR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </span>

                      {/* Display cancel button if on queue or processing */}
                      {hasTimeline && (
                        <button
                          onClick={() => onCancelBroadcast(log.id)}
                          className="flex items-center gap-1.5 px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-lg transition-colors border border-red-150"
                        >
                          <XOctagon className="w-3.5 h-3.5" />
                          <span>توقف و لغو ارسال</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Body message content & live progress bar */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                    <div className="lg:col-span-2 space-y-2">
                      <p className="text-slate-750 text-sm leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100 whitespace-pre-line text-right font-medium">
                        {log.content}
                      </p>
                      
                      {log.mediaUrl && (
                        <div className="text-[10px] font-mono select-all text-blue-600 bg-blue-50/40 p-2 rounded-lg truncate text-left" dir="ltr">
                          {log.mediaUrl}
                        </div>
                      )}
                    </div>

                    {/* Progress representation card */}
                    <div className="lg:col-span-1 bg-slate-50/60 p-4 rounded-xl border border-slate-100 space-y-3 font-sans">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-600 flex-row-reverse">
                        <span>پیشرفت ارسال:</span>
                        <span className="flex items-center gap-1 font-mono text-slate-900">
                          {progressPct}% ({processed} از {total})
                        </span>
                      </div>

                      {/* Progress bar wrap */}
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            log.status === 'cancelled' ? 'bg-gray-400' :
                            log.status === 'completed' ? 'bg-green-500' :
                            'bg-blue-600'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        ></div>
                      </div>

                      {/* Metrics counter panels */}
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-green-50 text-green-800 py-1.5 px-2 rounded-lg border border-green-100">
                          <span className="block text-md font-extrabold font-mono">{log.successCount}</span>
                          <span className="text-[9px] font-bold text-green-600 block uppercase">موفق</span>
                        </div>
                        <div className="bg-red-50 text-red-800 py-1.5 px-2 rounded-lg border border-red-100">
                          <span className="block text-md font-extrabold font-mono">{log.failureCount}</span>
                          <span className="text-[9px] font-bold text-red-600 block uppercase">ناموفق</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
