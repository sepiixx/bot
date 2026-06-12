import React, { useState, useEffect } from 'react';
import { 
  Send, 
  User, 
  Image, 
  Video, 
  FileText, 
  CheckCircle, 
  XCircle, 
  History, 
  AlertCircle, 
  Fingerprint, 
  UserCheck,
  RefreshCw
} from 'lucide-react';

interface PrivateMessage {
  id: string;
  targetType: 'telegramId' | 'username';
  targetValue: string;
  resolvedTelegramId: string;
  type: 'text' | 'photo' | 'video' | 'document';
  content: string;
  mediaUrl?: string;
  status: 'Sent' | 'Not Sent';
  error?: string;
  sentAt: string;
}

interface PrivateMessageProps {
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

export default function PrivateMessage({ authenticatedFetch }: PrivateMessageProps) {
  const [targetType, setTargetType] = useState<'telegramId' | 'username'>('telegramId');
  const [targetValue, setTargetValue] = useState('');
  const [msgType, setMsgType] = useState<'text' | 'photo' | 'video' | 'document'>('text');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  
  const [logs, setLogs] = useState<PrivateMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch log history
  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await authenticatedFetch('/api/private-messages');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.reverse()); // latest first
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!targetValue.trim()) {
      setFeedback({ type: 'error', message: 'لطفاً شناسه کاربری یا آی‌دی تلگرام را وارد کنید.' });
      return;
    }

    if (!content.trim() && msgType === 'text') {
      setFeedback({ type: 'error', message: 'لطفاً متن پیام خصوصی را وارد کنید.' });
      return;
    }

    setIsSending(true);
    try {
      const res = await authenticatedFetch('/api/private-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetValue: targetValue.trim(),
          type: msgType,
          content: content.trim(),
          mediaUrl: mediaUrl.trim() || undefined
        })
      });

      const data = await res.json();

      if (res.ok) {
        if (data.status === 'Sent') {
          setFeedback({ type: 'success', message: 'پیام خصوصی شما با موفقیت برای کاربر ارسال شد.' });
          setTargetValue('');
          setContent('');
          setMediaUrl('');
          fetchLogs();
        } else {
          setFeedback({ 
            type: 'error', 
            message: `پیام ارسال نشد: ${data.error || 'خطایی در ارسال رخ داد'}` 
          });
          fetchLogs();
        }
      } else {
        setFeedback({ type: 'error', message: data.error || 'ارسال پیام با شکست مواجه شد.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'ارتباط با سرور برقرار نشد.' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6" id="private-message-section">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-xs border border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-gray-800">ارسال پیام خصوصی</h1>
          <p className="text-xs text-gray-500 mt-1">امکان ارسال پیام اختصاصی به یک کاربر مشخص از طریق شناسه عددی یا نام کاربری</p>
        </div>
        <button 
          onClick={fetchLogs}
          className="p-2 text-gray-600 hover:text-indigo-600 rounded-lg hover:bg-gray-50 transition-colors"
          title="بروزرسانی لیست سوابق"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border ${
          feedback.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle className="w-5 h-5 shrink-0 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          )}
          <span className="text-sm font-medium">{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Composition Form */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs h-fit">
          <h2 className="text-md font-bold text-gray-700 mb-4 pb-2 border-b border-gray-50 flex items-center gap-2">
            <Send className="w-5 h-5 text-indigo-500" />
            <span>تنظیم پیام جدید</span>
          </h2>

          <form onSubmit={handleSend} className="space-y-4">
            {/* Target Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">نوع هدف‌گیری</label>
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => { setTargetType('telegramId'); setTargetValue(''); }}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                    targetType === 'telegramId'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  شناسه تلگرام (ID)
                </button>
                <button
                  type="button"
                  onClick={() => { setTargetType('username'); setTargetValue(''); }}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                    targetType === 'username'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  نام کاربری (Username)
                </button>
              </div>
            </div>

            {/* Target input */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                {targetType === 'telegramId' ? 'شناسه تلگرام گیرنده (عددی)' : 'نام کاربری تلگرام (با @ یا بدون آن)'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder={targetType === 'telegramId' ? 'مثال: 987654321' : 'مثال: username_example'}
                  className="w-full text-right bg-gray-50 border border-gray-100 rounded-xl py-2 px-3 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Message Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">نوع پیام ارسالی</label>
              <div className="grid grid-cols-4 gap-1 bg-gray-50 p-1 rounded-lg">
                {(['text', 'photo', 'video', 'document'] as const).map((t) => {
                  const isActive = msgType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setMsgType(t)}
                      className={`py-1.5 text-[11px] font-bold rounded-md transition-all flex flex-col items-center gap-1 ${
                        isActive
                          ? 'bg-white text-indigo-600 shadow-xs shadow-indigo-100/30'
                          : 'text-gray-400 hover:text-gray-700'
                      }`}
                    >
                      {t === 'text' && <FileText className="w-4 h-4" />}
                      {t === 'photo' && <Image className="w-4 h-4" />}
                      {t === 'video' && <Video className="w-4 h-4" />}
                      {t === 'document' && <FileText className="w-4 h-4" />}
                      <span>
                        {t === 'text' && 'متن'}
                        {t === 'photo' && 'عکس'}
                        {t === 'video' && 'ویدیو'}
                        {t === 'document' && 'فایل'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Media URL Input for non-text items */}
            {msgType !== 'text' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">آدرس اینترنتی فایل رسانه (URL)</label>
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://example.com/file.jpg"
                  className="w-full text-left bg-gray-50 border border-gray-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-gray-400 mt-1">توصیه می‌شود ابتدا فایل را در بخش کتابخانه چندرسانه‌ای بارگذاری کرده و لینک آن را در این فیلد قرار دهید.</p>
              </div>
            )}

            {/* Message Content */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                {msgType === 'text' ? 'متن پیام خصوصی' : 'توضیحات زیر رسانه (Caption - اختیاری)'}
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                placeholder="متن پیام جدید خود را اینجا بنویسید..."
                className="w-full text-right bg-gray-50 border border-gray-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 font-bold text-sm transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSending ? 'در حال ارسال پیام...' : 'ارسال پیام خصوصی'}</span>
            </button>
          </form>
        </div>

        {/* Dispatch Logs */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
          <h2 className="text-md font-bold text-gray-700 mb-4 pb-2 border-b border-gray-50 flex items-center gap-2">
            <History className="w-5 h-5 text-gray-500" />
            <span>سوابق ارسال پیام‌های خصوصی اخیر</span>
          </h2>

          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
              <span className="text-xs text-gray-400">در حال دریافت تراکنش‌ها...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Send className="w-12 h-12 mx-auto stroke-1 mb-3 text-gray-300" />
              <p className="text-sm font-medium">هیچ پیام خصوصی ارسال شده‌ای یافت نشد.</p>
              <p className="text-xs text-gray-300 mt-1">تراکنش‌های فرستاده شده در این پنل آرشیو خواهند شد.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {logs.map((log) => (
                <div 
                  key={log.id} 
                  className={`p-4 rounded-xl border transition-all ${
                    log.status === 'Sent' 
                      ? 'bg-transparent border-gray-100 hover:border-indigo-100' 
                      : 'bg-red-50/20 border-red-100'
                  }`}
                >
                  <div className="flex flex-wrap justify-between items-start gap-2 mb-2 pb-2 border-b border-gray-50">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px]">
                        {log.targetType === 'telegramId' ? 'آی‌دی تلگرام' : 'نام کاربری'}
                      </span>
                      <span className="text-gray-900 font-mono">{log.targetValue}</span>
                      {log.resolvedTelegramId && log.targetType === 'username' && (
                        <span className="text-gray-400 font-normal font-mono">({log.resolvedTelegramId})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400">
                        {new Date(log.sentAt).toLocaleDateString('fa-IR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {log.status === 'Sent' ? (
                        <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          <span>فعالیت موفق</span>
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1" title={log.error}>
                          <XCircle className="w-3 h-3" />
                          <span>عملیات ناموفق</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 whitespace-pre-line text-right font-medium leading-relaxed">
                    {log.content || <span className="text-gray-400 italic">بدون متن همراه</span>}
                  </p>

                  {log.mediaUrl && (
                    <div className="mt-2 text-xs flex items-center gap-1.5 text-indigo-600 bg-indigo-50/40 p-1.5 px-2 rounded-lg w-max max-w-full font-mono">
                      {log.type === 'photo' && <Image className="w-3.5 h-3.5 shrink-0" />}
                      {log.type === 'video' && <Video className="w-3.5 h-3.5 shrink-0" />}
                      {log.type === 'document' && <FileText className="w-3.5 h-3.5 shrink-0" />}
                      <span className="truncate block direction-ltr select-all">{log.mediaUrl}</span>
                    </div>
                  )}

                  {log.error && (
                    <div className="mt-2 bg-red-50 text-red-700 p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{log.error}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
