// ==========================================
// MODULE: BUTTON MANAGEMENT SYSTEM
// PURPOSE: Handles dynamic creation, deletion, parent binding, and point levels of bot menus
// ==========================================

import React, { useState } from 'react';
import { 
  Sliders, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Folder, 
  FileText, 
  ExternalLink,
  Lock,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { BotButton, ButtonType } from '../types';

interface ButtonManagementProps {
  buttons: BotButton[];
  onCreate: (btn: Partial<BotButton>) => void;
  onUpdate: (id: string, btn: Partial<BotButton>) => void;
  onDelete: (id: string) => void;
}

export default function ButtonManagement({ buttons, onCreate, onUpdate, onDelete }: ButtonManagementProps) {
  const [editingBtnId, setEditingBtnId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [requiredPoints, setRequiredPoints] = useState(0);
  const [buttonType, setButtonType] = useState<ButtonType>('content');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'enabled' | 'disabled'>('enabled');
  const [visibility, setVisibility] = useState<'public' | 'restricted'>('public');
  const [order, setOrder] = useState(1);
  const [linkUrl, setLinkUrl] = useState('');
  const [mediaType, setMediaType] = useState<'text' | 'photo' | 'video' | 'document'>('text');
  const [mediaUrl, setMediaUrl] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formPrompt, setFormPrompt] = useState('');
  const [formSubmitText, setFormSubmitText] = useState('');
  const [formStepsCount, setFormStepsCount] = useState<number>(1);
  const [step1Title, setStep1Title] = useState('');
  const [step1Prompt, setStep1Prompt] = useState('');
  const [step2Title, setStep2Title] = useState('');
  const [step2Prompt, setStep2Prompt] = useState('');
  const [step3Title, setStep3Title] = useState('');
  const [step3Prompt, setStep3Prompt] = useState('');
  const [step4Title, setStep4Title] = useState('');
  const [step4Prompt, setStep4Prompt] = useState('');

  // Handle resets
  const handleResetForm = () => {
    setName('');
    setParentId('');
    setRequiredPoints(0);
    setButtonType('content');
    setContent('');
    setStatus('enabled');
    setVisibility('public');
    setOrder(buttons.length + 1);
    setLinkUrl('');
    setMediaType('text');
    setMediaUrl('');
    setFormTitle('');
    setFormPrompt('');
    setFormSubmitText('');
    setFormStepsCount(1);
    setStep1Title('');
    setStep1Prompt('');
    setStep2Title('');
    setStep2Prompt('');
    setStep3Title('');
    setStep3Prompt('');
    setStep4Title('');
    setStep4Prompt('');
    setShowAddForm(false);
    setEditingBtnId(null);
  };

  const handleEditInit = (btn: BotButton) => {
    setEditingBtnId(btn.id);
    setName(btn.name);
    setParentId(btn.parentId || '');
    setRequiredPoints(btn.requiredPoints);
    setButtonType(btn.buttonType);
    setContent(btn.content);
    setStatus(btn.status);
    setVisibility(btn.visibility);
    setOrder(btn.order);
    setLinkUrl(btn.linkUrl || '');
    setMediaType(btn.mediaType || 'text');
    setMediaUrl(btn.mediaUrl || '');
    setFormTitle(btn.formTitle || '');
    setFormPrompt(btn.formPrompt || '');
    setFormSubmitText(btn.formSubmitText || '');
    setFormStepsCount(btn.formStepsCount || 1);
    setStep1Title(btn.step1Title || '');
    setStep1Prompt(btn.step1Prompt || '');
    setStep2Title(btn.step2Title || '');
    setStep2Prompt(btn.step2Prompt || '');
    setStep3Title(btn.step3Title || '');
    setStep3Prompt(btn.step3Prompt || '');
    setStep4Title(btn.step4Title || '');
    setStep4Prompt(btn.step4Prompt || '');
    setShowAddForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      parentId: parentId || null,
      requiredPoints: Number(requiredPoints),
      buttonType,
      content,
      status,
      visibility,
      order: Number(order),
      linkUrl: buttonType === 'link' ? linkUrl : '',
      mediaType: buttonType === 'content' ? mediaType : 'text',
      mediaUrl: buttonType === 'content' ? mediaUrl : '',
      formTitle: buttonType === 'input_form' ? formTitle : '',
      formPrompt: buttonType === 'input_form' ? formPrompt : '',
      formSubmitText: buttonType === 'input_form' ? formSubmitText : '',
      formStepsCount: buttonType === 'input_form' ? formStepsCount : 1,
      step1Title: buttonType === 'input_form' ? step1Title : '',
      step1Prompt: buttonType === 'input_form' ? step1Prompt : '',
      step2Title: buttonType === 'input_form' ? step2Title : '',
      step2Prompt: buttonType === 'input_form' ? step2Prompt : '',
      step3Title: buttonType === 'input_form' ? step3Title : '',
      step3Prompt: buttonType === 'input_form' ? step3Prompt : '',
      step4Title: buttonType === 'input_form' ? step4Title : '',
      step4Prompt: buttonType === 'input_form' ? step4Prompt : ''
    };

    if (editingBtnId) {
      onUpdate(editingBtnId, payload);
    } else {
      onCreate(payload);
    }
    handleResetForm();
  };

  // Find all possible sub-menus for parent selection
  const eligibleParents = buttons.filter(b => b.buttonType === 'submenu' && b.id !== editingBtnId);

  // Group buttons by hierarchical structures
  const rootButtons = buttons.filter(b => b.parentId === null || b.parentId === undefined);
  
  // Recursively render hierarchical tree nodes
  const renderTreeNode = (btn: BotButton, depth = 0) => {
    const children = buttons.filter(b => b.parentId === btn.id);
    
    return (
      <div key={btn.id} className="space-y-2 mt-2">
        <div 
          className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border rounded-xl shadow-sm transition-all hover:shadow-md ${
            btn.status === 'disabled' ? 'opacity-65 bg-slate-50/50' : 'border-slate-100'
          } flex-row-reverse text-right`}
          style={{ marginRight: `${depth * 28}px` }}
        >
          <div className="flex items-center gap-3 flex-row-reverse text-right">
            {btn.buttonType === 'submenu' ? (
              <Folder className="h-5 w-5 text-blue-500 fill-blue-50" />
            ) : btn.buttonType === 'link' ? (
              <ExternalLink className="h-5 w-5 text-sky-500" />
            ) : (
              <FileText className="h-5 w-5 text-emerald-500" />
            )}
            
            <div className="text-right">
              <div className="flex flex-wrap items-center gap-2 flex-row-reverse justify-end">
                <span className="font-bold text-slate-800 text-sm">{btn.name}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  btn.buttonType === 'submenu' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                  btn.buttonType === 'link' ? 'bg-sky-50 text-sky-700 border border-sky-100' :
                  btn.buttonType === 'input' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                  btn.buttonType === 'input_form' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                  'bg-emerald-50 text-emerald-700 border border-emerald-100'
                }`}>
                  {btn.buttonType === 'submenu' ? 'زیرمنو' : 
                   btn.buttonType === 'link' ? 'لینک' : 
                   btn.buttonType === 'input' ? 'ورودی کاربر' : 
                   btn.buttonType === 'input_form' ? 'فرم ورودی' : 'محتوا'}
                </span>

                {btn.requiredPoints > 0 && (
                  <span className="bg-amber-50 text-amber-800 border border-amber-100 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 flex-row-reverse">
                    <Lock className="h-3 w-3" />
                    <span>کاهش امتیاز: {btn.requiredPoints} امتیاز</span>
                  </span>
                )}

                {btn.visibility === 'restricted' && (
                  <span className="bg-rose-50 text-rose-800 border border-rose-100 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 flex-row-reverse">
                    <EyeOff className="h-3 w-3" />
                    <span>محدود شده</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-lg line-clamp-1 text-right font-sans">
                {btn.buttonType === 'link' ? btn.linkUrl : 
                 btn.buttonType === 'input_form' ? `📋 فرم ورودی: ${btn.formTitle || ''} (${btn.formPrompt || ''})` :
                 btn.content || 'هیچ متنی پاسخی تعریف نشده است'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 mt-3 sm:mt-0 justify-end flex-row-reverse self-end sm:self-center">
            <button
              id={`btn-edit-${btn.id}`}
              onClick={() => handleEditInit(btn)}
              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="ویرایش تنظیمات"
            >
              <Edit3 className="h-4.5 w-4.5" />
            </button>
            <button
              id={`btn-del-${btn.id}`}
              onClick={() => {
                if(confirm(`آیا از حذف دکمه "${btn.name}" مطمئن هستید؟ با حذف این مورد، تمام زیرمنوهای متصل به آن نیز حذف خواهند شد.`)) {
                  onDelete(btn.id);
                }
              }}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="حذف دکمه"
            >
              <Trash2 className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Render child elements */}
        {children.length > 0 && (
          <div className="space-y-2 border-r-2 border-slate-100 mr-4 font-sans text-right">
            {children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 p-8 space-y-8 bg-slate-50/50 overflow-y-auto text-right" dir="rtl">
      {/* Header with trigger button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex-row-reverse text-right">
        <div className="text-right">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">طراحی دکمه‌ها و منوهای ربات تلگرام</h2>
          <p className="text-sm text-slate-500 mt-1">
            دکمه‌ها و زیرمنوهای تودرتو را به صورت نامحدود سازماندهی کنید. تغییرات فوراً به تلگرام منتقل خواهند شد!
          </p>
        </div>
        {!showAddForm && !editingBtnId && (
          <button
            id="btn-add-menu-trigger"
            onClick={() => setShowAddForm(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-blue-500 shadow-md shadow-blue-600/10 transition-all self-start sm:self-center flex-row-reverse cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>ایجاد دکمه جدید</span>
          </button>
        )}
      </div>

      {/* Adding / Editing Modal form layout */}
      {(showAddForm || editingBtnId) && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm space-y-6 text-right">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 flex-row-reverse text-right">
            <h3 className="text-md font-bold text-slate-900 flex items-center gap-2 flex-row-reverse">
              <Sliders className="h-5 w-5 text-blue-500" />
              <span>{editingBtnId ? 'ویرایش تنظیمات و دسترسی دکمه' : 'افزودن دکمه تعاملی جدید'}</span>
            </h3>
            <button 
              type="button" 
              onClick={handleResetForm}
              className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-right">
            {/* Button Name */}
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block text-right font-bold">متن روی دکمه (کیبورد ریپلای)</label>
              <input
                id="form-btn-name"
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="مثال: 🎁 دریافت اکانت رایگان"
                className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl transition text-right font-sans"
              />
            </div>

            {/* Parent Button */}
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block text-right font-bold">اتصال به منوی اصلی یا مادر (زیرمنو)</label>
              <select
                id="form-btn-parent"
                value={parentId}
                onChange={e => setParentId(e.target.value)}
                className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl bg-white transition text-right font-sans"
              >
                <option value="">-- سطح منوی اصلی (خانه) --</option>
                {eligibleParents.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Button Type */}
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block text-right font-bold">رفتار و نوع دکمه</label>
              <select
                id="form-btn-type"
                value={buttonType}
                onChange={e => setButtonType(e.target.value as ButtonType)}
                className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl bg-white transition text-right font-sans"
              >
                <option value="content">نمایش محتوا (متنی یا پیوست رسانه)</option>
                <option value="submenu">زیرمنو جدید (باز کردن پوشه دکمه‌ها)</option>
                <option value="link">لینک ارجاع یا لینک دعوت تلگرام</option>
                <option value="input_form">فرم ورودی اطلاعات (Input Form)</option>
              </select>
            </div>

            {/* Point Requirement */}
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block text-right font-bold">امتیاز لازم جهت بازگشایی دکمه</label>
              <input
                id="form-btn-requiredPoints"
                type="number"
                min="0"
                value={requiredPoints}
                onChange={e => setRequiredPoints(Number(e.target.value))}
                placeholder="0"
                className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl transition text-right font-sans"
              />
            </div>

            {/* Visibility - Initial Status */}
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block text-right font-bold">وضعیت انتشار دکمه</label>
              <select
                id="form-btn-status"
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl bg-white transition text-right font-sans"
              >
                <option value="enabled">فعال و قابل نمایش در ربات</option>
                <option value="disabled">غیرفعال و موقتاً مخفی شده</option>
              </select>
            </div>

            {/* Access Gate Visibility */}
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block text-right font-bold">محدودیت دسترسی بر اساس امتیاز</label>
              <select
                id="form-btn-visibility"
                value={visibility}
                onChange={e => setVisibility(e.target.value as any)}
                className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl bg-white transition text-right font-sans"
              >
                <option value="public">عمومی و آزاد برای همه</option>
                <option value="restricted">مخصوص کاربران دارای امتیاز حد مجاز</option>
              </select>
            </div>
          </div>

          {/* Conditional inputs */}
          {buttonType === 'link' && (
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block text-right font-bold">آدرس اینترنتی لینک مقصد (URL)</label>
              <input
                id="form-btn-link-url"
                type="url"
                required
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                placeholder="https://t.me/invite/..."
                className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl transition text-left font-mono"
                dir="ltr"
              />
            </div>
          )}

          {buttonType === 'content' && (
            <div className="space-y-4 text-right">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block text-right">نوع فایل ضمیمه پاسخ</label>
                  <select
                    id="form-btn-mediaType"
                    value={mediaType}
                    onChange={e => setMediaType(e.target.value as any)}
                    className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl bg-white transition text-right font-sans"
                  >
                    <option value="text">بدون ضمیمه (پاسخ متنی ساده)</option>
                    <option value="photo">تصویر عکسی پیوست شده</option>
                    <option value="video">ویدیو ویدیویی پیوست شده</option>
                    <option value="document">سند با فرمت ZIP یا سایر فرمت‌ها</option>
                  </select>
                </div>
                {mediaType !== 'text' && (
                  <div className="space-y-1.5 text-right">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block text-right">لینک دانلود فایل یا تصویر پیوست</label>
                    <input
                      id="form-btn-mediaUrl"
                      type="url"
                      required
                      value={mediaUrl}
                      onChange={e => setMediaUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl transition text-left font-mono"
                      dir="ltr"
                    />
                  </div>
                )}
              </div>

              {/* Bot response text content */}
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block font-bold text-right">متن پیامی که کاربر در تلگرام دریافت می‌کند</label>
                <textarea
                  id="form-btn-content"
                  rows={4}
                  required
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="متن پاسخ یا اطلاعیه خود را که حاوی اطلاعات یا کدهای کاربری است کامل بنویسید..."
                  className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl transition text-right font-sans"
                ></textarea>
              </div>
            </div>
          )}

          {buttonType === 'input_form' && (
            <div className="space-y-6 text-right">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-right">
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block text-right font-bold">عنوان فرم</label>
                  <input
                    id="form-btn-formTitle"
                    type="text"
                    required
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    placeholder="مثال: ارسال اطلاعات اکانت"
                    className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl transition text-right font-sans"
                  />
                </div>
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block text-right font-bold">متن دکمه تایید نهایی</label>
                  <input
                    id="form-btn-formSubmitText"
                    type="text"
                    required
                    value={formSubmitText}
                    onChange={e => setFormSubmitText(e.target.value)}
                    placeholder="مثال: ✅ تایید اطلاعات"
                    className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl transition text-right font-sans"
                  />
                </div>
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block text-right font-bold">تعداد مراحل فرم</label>
                  <select
                    id="form-btn-formStepsCount"
                    value={formStepsCount}
                    onChange={e => setFormStepsCount(Number(e.target.value))}
                    className="w-full text-slate-800 text-sm border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2.5 rounded-xl transition text-right font-sans"
                  >
                    <option value={1}>۱ مرحله‌ای (ساده)</option>
                    <option value={2}>۲ مرحله‌ای</option>
                    <option value={3}>۳ مرحله‌ای</option>
                    <option value={4}>۴ مرحله‌ای</option>
                  </select>
                </div>
              </div>

              {/* Step Customizers based on selected count */}
              <div className="space-y-4 border-t border-slate-100 pt-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">تنظیم اطلاعات هر مرحله</h4>
                
                {/* Step 1 */}
                <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-3">
                  <div className="flex items-center justify-between flex-row-reverse">
                    <span className="text-xs font-bold text-blue-600 font-sans">مرحله اول (پیش‌فرض)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xxs font-bold text-slate-500">عنوان مرحله ۱</label>
                      <input
                        id="form-btn-step1Title"
                        type="text"
                        value={step1Title}
                        onChange={e => {
                          setStep1Title(e.target.value);
                          if (formStepsCount === 1) setFormTitle(e.target.value);
                        }}
                        placeholder="مثال: ایمیل تلگرام"
                        className="w-full text-slate-800 text-xs border border-slate-200 focus:outline-none focus:border-blue-500 px-3 py-2 rounded-lg text-right font-sans"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xxs font-bold text-slate-500">متن راهنمای مرحله ۱</label>
                      <input
                        id="form-btn-step1Prompt"
                        type="text"
                        required
                        value={step1Prompt}
                        onChange={e => {
                          setStep1Prompt(e.target.value);
                          if (formStepsCount === 1) setFormPrompt(e.target.value);
                        }}
                        placeholder="لطفاً ایمیل اکانت خود را بفرستید."
                        className="w-full text-slate-800 text-xs border border-slate-200 focus:outline-none focus:border-blue-500 px-3 py-2 rounded-lg text-right font-sans"
                      />
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                {formStepsCount >= 2 && (
                  <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-3">
                    <span className="text-xs font-bold text-blue-600 font-sans block text-right">مرحله دوم</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xxs font-bold text-slate-500">عنوان مرحله ۲</label>
                        <input
                          id="form-btn-step2Title"
                          type="text"
                          required
                          value={step2Title}
                          onChange={e => setStep2Title(e.target.value)}
                          placeholder="مثال: پسورد اکانت"
                          className="w-full text-slate-800 text-xs border border-slate-200 focus:outline-none focus:border-blue-500 px-3 py-2 rounded-lg text-right font-sans"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xxs font-bold text-slate-500">متن راهنمای مرحله ۲</label>
                        <input
                          id="form-btn-step2Prompt"
                          type="text"
                          required
                          value={step2Prompt}
                          onChange={e => setStep2Prompt(e.target.value)}
                          placeholder="رمز عبور اکانت مقصد را بنویسید."
                          className="w-full text-slate-800 text-xs border border-slate-200 focus:outline-none focus:border-blue-500 px-3 py-2 rounded-lg text-right font-sans"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3 */}
                {formStepsCount >= 3 && (
                  <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-3">
                    <span className="text-xs font-bold text-blue-600 font-sans block text-right">مرحله سوم</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xxs font-bold text-slate-500">عنوان مرحله ۳</label>
                        <input
                          id="form-btn-step3Title"
                          type="text"
                          required
                          value={step3Title}
                          onChange={e => setStep3Title(e.target.value)}
                          placeholder="مثال: ایمیل دوم"
                          className="w-full text-slate-800 text-xs border border-slate-200 focus:outline-none focus:border-blue-500 px-3 py-2 rounded-lg text-right font-sans"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xxs font-bold text-slate-500">متن راهنمای مرحله ۳</label>
                        <input
                          id="form-btn-step3Prompt"
                          type="text"
                          required
                          value={step3Prompt}
                          onChange={e => setStep3Prompt(e.target.value)}
                          placeholder="ایمیل اکانت پشتیبان یا بازیابی را بفرستید."
                          className="w-full text-slate-800 text-xs border border-slate-200 focus:outline-none focus:border-blue-500 px-3 py-2 rounded-lg text-right font-sans"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4 */}
                {formStepsCount >= 4 && (
                  <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-3">
                    <span className="text-xs font-bold text-blue-600 font-sans block text-right">مرحله چهارم</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xxs font-bold text-slate-500">عنوان مرحله ۴</label>
                        <input
                          id="form-btn-step4Title"
                          type="text"
                          required
                          value={step4Title}
                          onChange={e => setStep4Title(e.target.value)}
                          placeholder="مثال: توضیحات اضافه"
                          className="w-full text-slate-800 text-xs border border-slate-200 focus:outline-none focus:border-blue-500 px-3 py-2 rounded-lg text-right font-sans"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xxs font-bold text-slate-500">متن راهنمای مرحله ۴</label>
                        <input
                          id="form-btn-step4Prompt"
                          type="text"
                          required
                          value={step4Prompt}
                          onChange={e => setStep4Prompt(e.target.value)}
                          placeholder="هرگونه نظر یا توضیحات مکمل را اینجا وارد کنید."
                          className="w-full text-slate-800 text-xs border border-slate-200 focus:outline-none focus:border-blue-500 px-3 py-2 rounded-lg text-right font-sans"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Backward fallback support block */}
              <div className="space-y-1.5 text-right opacity-70">
                <label className="text-xxs font-bold text-slate-500 block text-right">متن تکی راهنما (سازگاری با نسخه‌های قدیمی)</label>
                <textarea
                  id="form-btn-formPrompt"
                  rows={2}
                  required
                  value={formPrompt}
                  onChange={e => {
                    setFormPrompt(e.target.value);
                    if (formStepsCount === 1) setStep1Prompt(e.target.value);
                  }}
                  placeholder="مثال: لطفاً ایمیل و رمز اکانت خود را ارسال کنید."
                  className="w-full text-slate-850 text-xs border border-slate-200 focus:outline-none focus:border-blue-500 px-3.5 py-2 rounded-xl transition text-right font-sans bg-slate-50"
                ></textarea>
              </div>
            </div>
          )}

          {/* Submitting Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 flex-row-reverse font-sans">
            <button
              id="form-btn-save"
              type="submit"
              className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-500 shadow-md shadow-blue-600/10 transition-all cursor-pointer"
            >
              {editingBtnId ? 'بروزرسانی دکمه' : 'ذخیره و انتشار دکمه تعاملی'}
            </button>
            <button
              id="form-btn-cancel"
              type="button"
              onClick={handleResetForm}
              className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              انصراف
            </button>
          </div>
        </form>
      )}

      {/* Hierarchy Button View */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-right">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-5 text-right">ساختار درختی منوهای پیکربندی شده</h3>
        
        {rootButtons.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl">
            <Sliders className="h-8 w-8 text-slate-350 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-medium">هیچ دکمه یا منوی تعاملی هنوز طراحی نشده است.</p>
            <p className="text-xs text-slate-400 mt-1">با استفاده از دکمه بالا، اولین دکمه سطح صفحه اصلی ربات خود را ایجاد نمایید.</p>
          </div>
        ) : (
          <div className="space-y-3 text-right font-sans">
            {rootButtons.map(btn => renderTreeNode(btn))}
          </div>
        )}
      </div>
    </div>
  );
}
