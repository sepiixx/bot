// ==========================================
// MODULE: BACKGROUND SCHEDULER SYSTEM
// PURPOSE: Handles scheduling, delay executions, and automation queues
// ==========================================

import React from 'react';
import { Clock, CheckCircle2, AlertCircle, PlayCircle, Plus } from 'lucide-react';
import { SchedulerTask } from '../types';

interface SchedulerSystemProps {
  tasks: SchedulerTask[];
  onTriggerTask: (id: string) => void;
}

export default function SchedulerSystem({ tasks, onTriggerTask }: SchedulerSystemProps) {
  return (
    <div className="flex-1 p-8 space-y-8 bg-slate-50/50 overflow-y-auto text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex-row-reverse text-right">
        <div className="text-right">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">زمان‌بندی هوشمند کارهای پس‌زمینه</h2>
          <p className="text-sm text-slate-500 mt-1">
            صف وظایف پس‌زمینه ربات. پیگیری زمان‌بندی فعال‌سازی کانال‌ها، خاموش/روشن کردن منوها و اجرای قوانین خودکار تلگرام.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden text-right">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center flex-row-reverse">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-right">لیست زمان‌بندی خودکار کارهای سیستم</h3>
          <span className="text-xs text-slate-500 font-semibold">{tasks.length} وظیفه زمان‌بندی شده</span>
        </div>

        <div className="divide-y divide-slate-100 text-right">
          {tasks.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Clock className="h-10 w-10 text-slate-350 mx-auto mb-2" />
              <p className="text-sm font-medium">هیچ وظیفه زمان‌بندی شده‌ای در صف وجود ندارد.</p>
            </div>
          ) : (
            [...tasks].reverse().map((task) => (
              <div key={task.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/20 transition flex-row-reverse text-right">
                <div className="flex items-start gap-3.5 flex-row-reverse text-right">
                  <div className={`p-3 rounded-xl border ${
                    task.status === 'completed' 
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                      : task.status === 'failed' 
                        ? 'bg-rose-50 border-rose-100 text-rose-600'
                        : 'bg-amber-50 border-amber-100 text-amber-600 animate-pulse'
                  }`}>
                    {task.status === 'completed' ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <Clock className="h-6 w-6" />
                    )}
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-2 flex-row-reverse justify-end">
                      <h4 className="text-sm font-semibold text-slate-800">{task.name}</h4>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                        task.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-250'
                          : task.status === 'failed'
                            ? 'bg-rose-50 text-rose-700 border-rose-250'
                            : 'bg-amber-50 text-amber-700 border-amber-250'
                      }`}>
                        {task.status === 'completed' ? 'انجام شده' : task.status === 'failed' ? 'ناموفق' : 'در انتظار اجرا'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 font-medium mt-1 text-right">
                      نوع عملیات: <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-xxs font-mono">{task.action}</code>
                    </p>

                    <div className="text-[11px] text-slate-400 font-mono mt-1.5 space-y-1 text-right">
                      <p className="text-right font-sans">تاریخ و ساعت اجرای خودکار: {new Date(task.triggerAt).toLocaleString()}</p>
                      {task.payload && Object.keys(task.payload).length > 0 && (
                        <p className="bg-slate-50 p-2 rounded border border-slate-100 mt-1 max-w-lg truncate text-left" dir="ltr">
                          Payload args: {JSON.stringify(task.payload)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {task.status === 'pending' && (
                  <button
                    id={`btn-task-exec-${task.id}`}
                    onClick={() => {
                      if(confirm(`آیا تمایل دارید وظیفه زمان‌بندی شده "${task.name}" را همین حالا به صورت دستی و فوری اجرا کنید؟`)) {
                        onTriggerTask(task.id);
                      }
                    }}
                    className="p-1 px-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 font-semibold text-xs flex items-center gap-1 cursor-pointer transition shadow-sm flex-row-reverse font-sans"
                  >
                    <PlayCircle className="h-4 w-4" />
                    <span>اجرای فوری همین حالا</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
