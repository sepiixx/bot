// ==========================================
// MODULE: INPUT FORM SUBMISSIONS REGISTRY
// PURPOSE: Handles viewing, searching, approving, rejecting, and deleting form answers
// ==========================================

import React, { useState, useEffect } from 'react';
import { Inbox, Search, Trash2, Clock, CheckCircle2, XCircle, Play } from 'lucide-react';
import { InputFormSubmission } from '../types';

interface FormSubmissionsProps {
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

export default function FormSubmissions({ authenticatedFetch }: FormSubmissionsProps) {
  const [submissions, setSubmissions] = useState<InputFormSubmission[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/input-form-submissions');
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data);
      }
    } catch (err) {
      console.error('Error fetching submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: 'processing' | 'completed' | 'rejected') => {
    try {
      const res = await authenticatedFetch(`/api/input-form-submissions/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این درخواست فرم اطمینان دارید؟ این عمل غیرقابل بازگشت است.')) {
      return;
    }
    try {
      const res = await authenticatedFetch(`/api/input-form-submissions/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSubmissions(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error('Error deleting submission:', err);
    }
  };

  const filteredSubmissions = submissions.filter(s => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      s.username.toLowerCase().includes(term) ||
      s.userId.includes(term) ||
      s.buttonName.toLowerCase().includes(term) ||
      s.formTitle.toLowerCase().includes(term) ||
      s.submittedText.toLowerCase().includes(term);

    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-100">
            <Clock className="h-3 w-3" />
            در انتظار بررسی
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-100">
            <Play className="h-3 w-3" />
            درحال بررسی
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-100">
            <CheckCircle2 className="h-3 w-3" />
            تکمیل شد
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-800 border border-rose-100">
            <XCircle className="h-3 w-3" />
            رد شد
          </span>
        );
      default:
        return <span className="text-xs text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="flex-1 p-8 space-y-8 bg-slate-50/50 overflow-y-auto text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex-row-reverse text-right">
        <div className="text-right">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">📥 درخواست‌های ثبت فرم کاربران</h2>
          <p className="text-sm text-slate-500 mt-1">
            لیست پاسخ‌ها و اطلاعات ارسالی کاربران از طریق دکمه‌های فرم ورودی در این قسمت نمایش و مدیریت می‌شود.
          </p>
        </div>
      </div>

      {/* Filter and Control Panel */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch justify-between">
        {/* Search */}
        <div className="flex-1 flex items-center gap-3 bg-white px-4 py-3 rounded-xl border border-slate-100 shadow-sm flex-row-reverse text-right">
          <Search className="h-5 w-5 text-slate-400 font-sans" />
          <input
            id="search-submissions"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجوی پاسخ فرم بر اساس کاربر، شناسه تلگرام، دکمه یا محتوای فرم..."
            className="w-full text-slate-800 text-sm focus:outline-none placeholder-slate-400 text-right font-sans"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center bg-white border border-slate-100 rounded-xl p-1 gap-1 shadow-sm shrink-0 flex-row-reverse font-sans">
          {[
            { id: 'all', label: 'همه' },
            { id: 'pending', label: 'در انتظار' },
            { id: 'processing', label: 'درحال بررسی' },
            { id: 'completed', label: 'تکمیل شده' },
            { id: 'rejected', label: 'رد شده' }
          ].map((tab) => (
            <button
              id={`tab-submissions-filter-${tab.id}`}
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden text-right">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between flex-row-reverse">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">لیست کل فرم‌های دریافتی</h3>
          <button 
            onClick={loadSubmissions} 
            className="text-xs font-semibold text-blue-600 hover:text-blue-500 cursor-pointer"
          >
            بروزرسانی لیست
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 bg-slate-50/30 text-xxs font-bold uppercase tracking-wider">
                <th className="p-4 text-right">نام کاربر / یوزرنیم</th>
                <th className="p-4 text-right">شناسه تلگرام (ID)</th>
                <th className="p-4 text-right">نام دکمه و فرم</th>
                <th className="p-4 text-right">متن ارسال شده و پاسخ فرم</th>
                <th className="p-4 text-right">تاریخ ثبت</th>
                <th className="p-4 text-right">وضعیت</th>
                <th className="p-4 text-center">عملیات ادمین</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 font-medium">
                    در حال دریافت اطلاعات فرم‌ها...
                  </td>
                </tr>
              ) : filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 font-medium">
                    هیچ پاسخ فرمی یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="p-4 font-bold text-slate-800">
                      @{sub.username || 'بدون نام کاربری'}
                    </td>
                    <td className="p-4 font-mono text-xs text-slate-500">
                      {sub.userId}
                    </td>
                    <td className="p-4">
                      <div className="text-slate-800 font-medium">{sub.buttonName}</div>
                      <div className="text-xxs text-slate-400 font-sans mt-0.5">{sub.formTitle}</div>
                    </td>
                    <td className="p-4 max-w-xs">
                      <pre className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg font-sans border border-slate-150 whitespace-pre-wrap leading-relaxed">
                        {sub.fullText || sub.submittedText}
                      </pre>
                    </td>
                    <td className="p-4 text-xs font-sans text-slate-500">
                      {new Date(sub.createdAt).toLocaleString('fa-IR')}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(sub.status)}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-row-reverse font-sans">
                        <button
                          id={`sub-action-verify-${sub.id}`}
                          onClick={() => handleUpdateStatus(sub.id, 'completed')}
                          disabled={sub.status === 'completed'}
                          className={`px-2 py-1 text-xxs font-bold rounded-md border transition-all cursor-pointer ${
                            sub.status === 'completed'
                              ? 'bg-slate-50 border-slate-200 text-slate-400'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          تکمیل شد
                        </button>
                        <button
                          id={`sub-action-process-${sub.id}`}
                          onClick={() => handleUpdateStatus(sub.id, 'processing')}
                          disabled={sub.status === 'processing'}
                          className={`px-2 py-1 text-xxs font-bold rounded-md border transition-all cursor-pointer ${
                            sub.status === 'processing'
                              ? 'bg-slate-50 border-slate-200 text-slate-400'
                              : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                          }`}
                        >
                          درحال بررسی
                        </button>
                        <button
                          id={`sub-action-reject-${sub.id}`}
                          onClick={() => handleUpdateStatus(sub.id, 'rejected')}
                          disabled={sub.status === 'rejected'}
                          className={`px-2 py-1 text-xxs font-bold rounded-md border transition-all cursor-pointer ${
                            sub.status === 'rejected'
                              ? 'bg-slate-50 border-slate-200 text-slate-400'
                              : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                          }`}
                        >
                          رد شد
                        </button>
                        <button
                          id={`sub-action-delete-${sub.id}`}
                          onClick={() => handleDelete(sub.id)}
                          className="p-1 px-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md border border-transparent hover:border-rose-100 transition-colors cursor-pointer"
                          title="حذف پاسخ"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
