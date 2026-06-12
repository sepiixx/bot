// ==========================================
// MODULE: MEDIA LIBRARY MANAGEMENT
// PURPOSE: Manage reusable bot assets, icons, and accounts images
// ==========================================

import React, { useState } from 'react';
import { Image, Code, Plus, Trash2, Link2, Download, AlertCircle } from 'lucide-react';
import { MediaAsset } from '../types';

interface MediaLibraryProps {
  media: MediaAsset[];
  onUpload: (media: Partial<MediaAsset>) => void;
  onDelete: (id: string) => void;
}

export default function MediaLibrary({ media, onUpload, onDelete }: MediaLibraryProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('image/jpeg');
  const [url, setUrl] = useState('');

  const handleReset = () => {
    setFileName('');
    setFileType('image/jpeg');
    setUrl('');
    setShowAdd(false);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onUpload({
      fileName,
      fileType,
      fileSize: '150 KB',
      url
    });
    handleReset();
  };

  return (
    <div className="flex-1 p-8 space-y-8 bg-slate-50/50 overflow-y-auto w-full text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex-row-reverse text-right">
        <div className="text-right">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">کتابخانه رسانه‌ها و فایل‌های ربات</h2>
          <p className="text-sm text-slate-500 mt-1">
            ذخیره و سازماندهی تصاویر، ویدیوها، لوگوی بازی‌ها و اسناد. می‌توانید از آدرس‌های اینترنتی این رسانه‌ها در منوها و دکمه‌های عمومی استفاده کنید.
          </p>
        </div>
        {!showAdd && (
          <button
            id="btn-add-media-trigger"
            onClick={() => setShowAdd(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-blue-500 shadow-md shadow-blue-600/10 transition-all self-start sm:self-center flex-row-reverse cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>ثبت رسانه جدید</span>
          </button>
        )}
      </div>

      {/* Upload simulated Form */}
      {showAdd && (
        <form onSubmit={handleCreate} className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm space-y-6 text-right">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider block border-b border-slate-50 pb-3 text-right">
            ثبت پرونده یا تصویر پیوست جدید در سیستم
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-right">
            {/* Asset File Name */}
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block text-right">نام نمایشی یا عنوان فایل</label>
              <input
                id="form-media-name"
                type="text"
                required
                value={fileName}
                onChange={e => setFileName(e.target.value)}
                placeholder="مثال: عکس بنر قرعه‌کشی"
                className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl transition text-right font-sans"
              />
            </div>

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block text-right">نوع یا فرمت فایل</label>
              <select
                id="form-media-type"
                value={fileType}
                onChange={e => setFileType(e.target.value)}
                className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl bg-white transition text-right font-sans"
              >
                <option value="image/jpeg">تصویر با فرمت JPG</option>
                <option value="image/png">تصویر گرافیکی PNG</option>
                <option value="video/mp4">ویدیو کلیپ MP4</option>
                <option value="application/zip">سند فشرده با فرمت ZIP</option>
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-2 lg:col-span-1 text-right">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block text-right font-mono">آدرس مستقیم دانلود فایل (Media URL)</label>
              <input
                id="form-media-url"
                type="url"
                required
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl transition text-left font-mono"
                dir="ltr"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 flex-row-reverse font-sans">
            <button
              id="form-media-submit"
              type="submit"
              className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-500 shadow-md shadow-blue-600/10 transition-all cursor-pointer"
            >
              ذخیره و ثبت پرونده
            </button>
            <button
              id="form-media-cancel"
              type="button"
              onClick={handleReset}
              className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              انصراف
            </button>
          </div>
        </form>
      )}

      {/* Grid of files gallery */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 text-right font-sans">
        {media.map((file) => {
          const isImg = file.fileType.startsWith('image/');
          return (
            <div key={file.id} className="bg-white border border-slate-150 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition duration-200 flex flex-col text-right">
              {/* Top cover preview */}
              <div className="h-40 bg-slate-900 flex items-center justify-center overflow-hidden shrink-0 relative">
                {isImg ? (
                  <img src={file.url} alt={file.fileName} className="w-full h-full object-cover" />
                ) : (
                  <Code className="h-10 w-10 text-slate-400" />
                )}
                
                <span className="absolute top-2.5 right-2.5 bg-slate-900/60 backdrop-blur-xs text-white text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase">
                  {file.fileType.split('/')[1]}
                </span>
              </div>

              {/* Description body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-4 text-right">
                <div className="text-right">
                  <h4 className="text-sm font-bold text-slate-800 truncate text-right" title={file.fileName}>{file.fileName}</h4>
                  <p className="text-xxs text-slate-400 font-mono mt-1 text-right" dir="rtl">حجم: {file.fileSize} • ثبت: {new Date(file.createdAt).toLocaleDateString()}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-100 flex-row-reverse">
                    <Link2 className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                    <input
                      id={`media-url-copy-${file.id}`}
                      type="text"
                      readOnly
                      value={file.url}
                      onClick={(e) => {
                        (e.target as HTMLInputElement).select();
                      }}
                      className="w-full text-xxs font-mono text-slate-500 bg-transparent focus:outline-none cursor-pointer select-all truncate text-left"
                      dir="ltr"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      id={`btn-media-delete-${file.id}`}
                      onClick={() => {
                        if(confirm(`آیا از حذف دکمه رسانه "${file.fileName}" اطمینان دارید؟`)) {
                          onDelete(file.id);
                        }
                      }}
                      className="px-2 py-1 bg-white border border-rose-150 rounded text-rose-600 hover:bg-rose-50 font-semibold text-xs flex items-center gap-1 transition-colors flex-1 justify-center cursor-pointer flex-row-reverse"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>حذف پرونده</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
