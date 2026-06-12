// ==========================================
// MODULE: USER REGISTRY MANAGEMENT
// PURPOSE: Handles viewing, searching, banning, and assigning scoring points
// ==========================================

import React, { useState } from 'react';
import { Users, Search, Ban, CheckCircle, Edit, DollarSign, Award, Calendar, Link } from 'lucide-react';
import { User } from '../types';

interface UserManagementProps {
  users: User[];
  onUpdateUser: (id: string, user: Partial<User>) => void;
}

export default function UserManagement({ users, onUpdateUser }: UserManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pointsDelta, setPointsDelta] = useState(0);

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    return (
      u.firstName.toLowerCase().includes(term) ||
      (u.username && u.username.toLowerCase().includes(term)) ||
      u.telegramId.includes(term)
    );
  });

  const handleAdjustPoints = () => {
    if (!selectedUser) return;
    const currentPoints = selectedUser.points;
    const finalPoints = Math.max(0, currentPoints + pointsDelta);
    onUpdateUser(selectedUser.id, { points: finalPoints });
    
    // Refresh local selections
    setSelectedUser({ ...selectedUser, points: finalPoints });
    setPointsDelta(0);
  };

  const toggleBanStatus = (user: User) => {
    const isCurrentlyBanned = user.status === 'banned';
    onUpdateUser(user.id, { status: isCurrentlyBanned ? 'active' : 'banned' });
  };

  return (
    <div className="flex-1 p-8 space-y-8 bg-slate-50/50 overflow-y-auto text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex-row-reverse text-right">
        <div className="text-right">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">بانک اعضا و کاربران ربات</h2>
          <p className="text-sm text-slate-500 mt-1">
            مشاهده اعضای متصل شده از تلگرام، مسدود کردن دسترسی خاطیان، و تعیین یا کسر امتیاز کاربران به صورت دستی.
          </p>
        </div>
      </div>

      {/* Control panel: Search Bar */}
      <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl border border-slate-100 shadow-sm flex-row-reverse text-right">
        <Search className="h-5 w-5 text-slate-400" />
        <input
          id="search-user-registry"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="جستجوی کاربران بر اساس نام، یوزرنیم غیراورگانیک، یا شناسه عددی تلگرام..."
          className="w-full text-slate-800 text-sm focus:outline-none placeholder-slate-400 text-right font-sans"
        />
      </div>

      {/* Main split dashboard: List on the left, Point Editor on the right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start text-right">
        {/* Table Listing */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden lg:col-span-2 text-right">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 text-right">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-right">لیست اعضای ذخیره شده در ربات</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 bg-slate-50/30 text-xxs font-bold uppercase tracking-wider flex-row-reverse">
                  <th className="p-4 text-right">کاربر تلگرام</th>
                  <th className="p-4 text-right">امتیاز</th>
                  <th className="p-4 text-right">تعداد دعوت</th>
                  <th className="p-4 text-right">معرف / دعوت‌شده توسط</th>
                  <th className="p-4 text-right">تاریخ عضویت</th>
                  <th className="p-4 text-left">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                      هیچ کاربری با مشخصات جستجو شده یافت نشد.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr 
                      key={user.id} 
                      className={`hover:bg-slate-50/40 transition cursor-pointer text-right ${
                        selectedUser?.id === user.id ? 'bg-blue-50/35 border-r-4 border-blue-600' : ''
                      }`}
                      onClick={() => {
                        setSelectedUser(user);
                        setPointsDelta(0);
                      }}
                    >
                      <td className="p-4 text-right">
                        <div className="flex items-center gap-3 flex-row-reverse text-right">
                          <div className={`h-8 w-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                            user.status === 'banned' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {user.firstName.charAt(0).toUpperCase()}
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5 flex-row-reverse justify-end">
                              <span>{user.firstName}</span>
                              {user.status === 'banned' && (
                                <span className="bg-rose-50 text-rose-700 border border-rose-150 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                                  مسدود شده
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 font-mono text-right" dir="rtl">
                              @{user.username || 'n/a'} • <span className="text-slate-500">{user.telegramId}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono font-bold text-blue-600 text-right">
                        💰 {user.points} امتیاز
                      </td>
                      <td className="p-4 font-mono font-bold text-emerald-600 text-right">
                        👥 {user.referralsCount ?? 0} نفر
                      </td>
                      <td className="p-4 text-xs text-slate-500 font-mono text-right">
                        {user.referredBy ? (
                          <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded w-fit border border-slate-100 flex-row-reverse">
                            <Link className="h-3 w-3 text-slate-400 font-sans" />
                            <span>{user.referredBy}</span>
                          </span>
                        ) : (
                          <span className="text-slate-350 font-sans">مستقیم / بدون معرف</span>
                        )}
                      </td>
                      <td className="p-4 text-xs text-slate-400 text-right">
                        <span className="flex items-center gap-1.5 flex-row-reverse justify-end">
                          <Calendar className="h-3.5 w-3.5 text-slate-350" />
                          <span>{new Date(user.joinedAt).toLocaleDateString('fa-IR')}</span>
                        </span>
                      </td>
                      <td className="p-4 text-left" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-start gap-1.5 font-sans flex-wrap">
                          <button
                            id={`btn-user-select-${user.id}`}
                            onClick={() => {
                              setSelectedUser(user);
                              setPointsDelta(0);
                            }}
                            className="p-1 px-2 text-xs font-semibold hover:bg-slate-100 border border-slate-150 rounded text-slate-650 transition cursor-pointer"
                          >
                            ویرایش
                          </button>
                          <button
                            id={`btn-user-ban-${user.id}`}
                            onClick={() => toggleBanStatus(user)}
                            className={`p-1 bg-white border rounded text-xs px-2 font-semibold transition cursor-pointer ${
                              user.status === 'banned'
                                ? 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                                : 'text-rose-600 border-rose-200 hover:bg-rose-50'
                            }`}
                          >
                            {user.status === 'banned' ? 'آزاد کردن' : 'مسدود کردن'}
                          </button>

                          {/* Quick points adjusting triggers */}
                          <div className="flex items-center gap-1 border-r pr-1.5 border-slate-200 mr-1.5">
                            <button
                              id={`btn-plus-5-${user.id}`}
                              onClick={() => {
                                const finalPoints = user.points + 5;
                                onUpdateUser(user.id, { points: finalPoints });
                                if (selectedUser?.id === user.id) {
                                  setSelectedUser({ ...selectedUser, points: finalPoints });
                                }
                              }}
                              className="px-1.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 text-xs font-semibold rounded shrink-0 transition cursor-pointer"
                            >
                              +۵ امتیاز
                            </button>
                            <button
                              id={`btn-minus-5-${user.id}`}
                              onClick={() => {
                                const finalPoints = Math.max(0, user.points - 5);
                                onUpdateUser(user.id, { points: finalPoints });
                                if (selectedUser?.id === user.id) {
                                  setSelectedUser({ ...selectedUser, points: finalPoints });
                                }
                              }}
                              className="px-1.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 text-xs font-semibold rounded shrink-0 transition cursor-pointer"
                            >
                              -۵ امتیاز
                            </button>
                            <button
                              id={`btn-reset-points-${user.id}`}
                              onClick={() => {
                                onUpdateUser(user.id, { points: 0 });
                                if (selectedUser?.id === user.id) {
                                  setSelectedUser({ ...selectedUser, points: 0 });
                                }
                              }}
                              className="px-1.5 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-semibold rounded shrink-0 transition cursor-pointer"
                            >
                              ریست امتیاز
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed User Editor on Selection */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 text-right">
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider block border-b border-slate-50 pb-3 text-right">
            مدیریت کیف پول و جزئیات پاداش کاربر
          </h4>

          {selectedUser ? (
            <div className="space-y-6 text-right">
              {/* User Bio header */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-right">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold text-right">پروفایل فعال کاربر</p>
                <p className="text-sm font-bold text-slate-800 mt-1 text-right">{selectedUser.firstName}</p>
                <p className="text-xs text-slate-450 font-mono text-right">ID: {selectedUser.telegramId}</p>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200/60 flex-row-reverse">
                  <span className="text-xs text-slate-500 font-medium">موجودی کیف پول:</span>
                  <span className="text-lg font-black text-blue-600">💰 {selectedUser.points} امتیاز</span>
                </div>
              </div>

              {/* Adjust counter */}
              <div className="space-y-3 text-right">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block text-right font-bold">افزودن / کاهش امتیاز کاربر</label>
                <div className="flex items-center gap-3">
                  <button
                    id="btn-points-dec-1"
                    onClick={() => setPointsDelta((p) => p - 1)}
                    className="h-10 w-10 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-bold flex items-center justify-center transition cursor-pointer"
                  >
                    -1
                  </button>
                  <button
                    id="btn-points-dec-5"
                    onClick={() => setPointsDelta((p) => p - 5)}
                    className="h-10 w-10 bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100 rounded-xl font-bold flex items-center justify-center text-xs transition cursor-pointer"
                  >
                    -5
                  </button>
                  
                  <div className="flex-1 text-center font-mono font-bold text-lg text-slate-800 border-b-2 border-blue-200 py-1.5" dir="ltr">
                    {pointsDelta >= 0 ? `+${pointsDelta}` : pointsDelta}
                  </div>

                  <button
                    id="btn-points-inc-5"
                    onClick={() => setPointsDelta((p) => p + 5)}
                    className="h-10 w-10 bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100 rounded-xl font-bold flex items-center justify-center text-xs transition cursor-pointer"
                  >
                    +5
                  </button>
                  <button
                    id="btn-points-inc-1"
                    onClick={() => setPointsDelta((p) => p + 1)}
                    className="h-10 w-10 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-bold flex items-center justify-center transition cursor-pointer"
                  >
                    +1
                  </button>
                </div>
                
                <p className="text-[10px] text-slate-400 text-right">وارد کردن امتیازات با علامت منفی، از موجودی کاربر کسر خواهد کرد (حداقل مقدار، صفر است).</p>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 flex-row-reverse font-sans">
                <button
                  id="btn-points-save"
                  onClick={handleAdjustPoints}
                  className="px-4 py-2.5 text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 rounded-xl shadow-sm transition flex-1 cursor-pointer"
                >
                  ثبت و همگام‌سازی امتیاز
                </button>
                <button
                  id="btn-points-reset"
                  onClick={() => setPointsDelta(0)}
                  className="px-4 py-2.5 text-xs font-bold border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 flex-1 transition cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl">
              <Users className="h-8 w-8 text-slate-350 mx-auto mb-2" />
              <p className="text-slate-450 text-xs font-medium">جهت ویرایش تفصیلی کیف پول و تنظیم سطح دسترسی، یکی از کاربران را از جدول انتخاب کنید.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
