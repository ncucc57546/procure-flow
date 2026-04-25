"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient, User as SupabaseUser } from '@supabase/supabase-js';
import {
    Save,
    Loader2,
    ChevronRight,
    Building2,
    DollarSign,
    FileEdit,
    Clock,
    CalendarDays,
    Users,
    MailPlus
} from 'lucide-react';

// ==========================================
// 1. 強型別定義
// ==========================================
interface Vendor {
    id: string;
    name: string;
}

interface ProcurementFormData {
    title: string;
    budget: number;
    currency: string;
    current_vendor_id: string;
    start_date: string;
    end_date: string;
    cycle: string;
    reminder_days_before: number;
    description: string;
    notify_to: string;
    notify_cc: string;
}

interface ExchangeRateResponse {
    result: string;
    base_code: string;
    conversion_rates: Record<string, number>;
}

// ==========================================
// 2. 初始化 Supabase Client
// ==========================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function EditProcurementPage() {
    const router = useRouter();
    const params = useParams(); // 取得網址上的 [id] 參數
    const procurementId = params.id as string;

    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [initLoading, setInitLoading] = useState<boolean>(true);

    // 匯率相關狀態
    const [exchangeRate, setExchangeRate] = useState<number | null>(null);
    const [fetchingRate, setFetchingRate] = useState<boolean>(false);

    // 表單資料狀態 (初始為空，等撈到資料後覆寫)
    const [formData, setFormData] = useState<ProcurementFormData>({
        title: '',
        budget: 0,
        currency: 'TWD',
        current_vendor_id: '',
        start_date: '',
        end_date: '',
        cycle: 'yearly',
        reminder_days_before: 30,
        description: '',
        notify_to: '',
        notify_cc: ''
    });

    // ==========================================
    // 3. 初始資料載入 (取得廠商與舊資料)
    // ==========================================
    useEffect(() => {
        const initData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setUser(session.user);

                // 1. 獲取廠商列表
                const { data: vendorData } = await supabase
                    .from('vendors')
                    .select('id, name')
                    .order('name');

                if (vendorData) setVendors(vendorData);

                // 2. 獲取這筆採購案的舊資料
                if (procurementId) {
                    const { data: procData, error: procError } = await supabase
                        .from('procurement_items')
                        .select('*')
                        .eq('id', procurementId)
                        .single(); // 確保只回傳一筆

                    if (procError) {
                        alert('找不到該筆採購資料或權限不足');
                        router.push('/dashboard/procurements');
                        return;
                    }

                    if (procData) {
                        // 將 JSONB 的 email_template 轉回逗號分隔的字串
                        const toEmails = procData.email_template?.to?.join(', ') || '';
                        const ccEmails = procData.email_template?.cc?.join(', ') || '';

                        setFormData({
                            title: procData.title || '',
                            budget: procData.budget || 0,
                            currency: procData.currency || 'TWD',
                            current_vendor_id: procData.current_vendor_id || '',
                            // 處理日期格式 (確保只有 YYYY-MM-DD，避免包含時間戳)
                            start_date: procData.start_date ? procData.start_date.split('T')[0] : '',
                            end_date: procData.end_date ? procData.end_date.split('T')[0] : '',
                            cycle: procData.cycle || 'yearly',
                            reminder_days_before: procData.reminder_days_before || 30,
                            description: procData.description || '',
                            notify_to: toEmails,
                            notify_cc: ccEmails
                        });
                    }
                }
            } else {
                router.push('/login');
            }
            setInitLoading(false);
        };

        initData();
    }, [procurementId, router]);

    // ==========================================
    // 4. 外部匯率 API 整合
    // ==========================================
    useEffect(() => {
        const fetchCurrentExchangeRate = async (baseCurrency: string, targetCurrency: string) => {
            setFetchingRate(true);
            try {
                const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
                if (!response.ok) throw new Error('匯率 API 請求失敗');

                const data: ExchangeRateResponse = await response.json();
                const rate = data.conversion_rates[targetCurrency];

                if (rate) {
                    setExchangeRate(rate);
                }
            } catch (error) {
                console.error('獲取匯率失敗', error);
            } finally {
                setFetchingRate(false);
            }
        };

        if (formData.currency === 'USD') {
            fetchCurrentExchangeRate('USD', 'TWD');
        } else {
            setExchangeRate(null);
        }
    }, [formData.currency]);

    // ==========================================
    // 5. 儲存更新至資料庫 (Update)
    // ==========================================
    const handleUpdate = async () => {
        if (!user) {
            alert('請先登入後再進行操作');
            return;
        }

        if (!formData.title || !formData.budget || !formData.start_date || !formData.notify_to) {
            alert('「採購案名」、「預算」、「起始日期」與「通知承辦人」皆為必填項目！');
            return;
        }

        // 自動計算下次提醒日期
        let nextReminderDate = null;
        if (formData.start_date) {
            const startDateObj = new Date(formData.start_date);
            startDateObj.setDate(startDateObj.getDate() - (formData.reminder_days_before || 0));
            nextReminderDate = startDateObj.toISOString().split('T')[0];
        }

        const emailTemplateConfig = {
            to: formData.notify_to.split(',').map(email => email.trim()).filter(Boolean),
            cc: formData.notify_cc.split(',').map(email => email.trim()).filter(Boolean),
        };

        setLoading(true);
        try {
            const updateData = {
                title: formData.title,
                budget: formData.budget,
                currency: formData.currency,
                current_vendor_id: formData.current_vendor_id || null,
                start_date: formData.start_date || null,
                end_date: formData.end_date || null,
                next_reminder_date: nextReminderDate,
                cycle: formData.cycle,
                reminder_days_before: formData.reminder_days_before,
                description: formData.description,
                email_template: emailTemplateConfig
            };

            // 執行 Update，並加上 id 與 creator_id 條件以確保安全
            const { error } = await supabase
                .from('procurement_items')
                .update(updateData)
                .eq('id', procurementId)
                .eq('creator_id', user.id); // 確保只有建立者可以修改

            if (error) throw error;

            router.push('/dashboard/procurements');
        } catch (err) {
            if (err instanceof Error) {
                alert('更新發生錯誤: ' + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDateClick = (e: React.MouseEvent<HTMLInputElement>) => {
        try {
            if (typeof e.currentTarget.showPicker === 'function') {
                e.currentTarget.showPicker();
            }
        } catch (err) {
            // 忽略部分瀏覽器不支援 showPicker 的錯誤
        }
    };

    if (initLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="text-blue-500 animate-spin" size={48} />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-12">
            <header className="mb-10">
                <nav className="flex items-center space-x-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    <span>Enterprise</span>
                    <ChevronRight size={10} />
                    <span className="text-blue-500">Procurements</span>
                    <ChevronRight size={10} />
                    <span className="text-slate-300">Edit</span>
                </nav>
            </header>

            <div className="bg-slate-900/60 border border-slate-800 rounded-[3.5rem] p-14 shadow-2xl relative overflow-hidden backdrop-blur-xl">
                <div className="mb-12 pb-8 border-b border-slate-800/60">
                    <h3 className="text-3xl font-black tracking-tight text-white flex items-center">
                        <FileEdit className="mr-3 text-amber-500" size={32} />
                        編輯採購計畫
                    </h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-2 ml-11">
                        Update Execution Plan
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-12">
                    {/* 標題輸入 */}
                    <div className="col-span-2">
                        <label className="block text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4 ml-3">
                            採購標題案名 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-6 outline-none focus:ring-2 focus:ring-amber-600/50 transition-all text-xl font-black placeholder:text-slate-500 text-white"
                            placeholder="請輸入採購計畫名稱..."
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                        />
                    </div>

                    {/* 時程設定區 */}
                    <div>
                        <label className="block text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4 ml-3">
                            預計開始日期 <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none">
                                <CalendarDays size={20} className="text-slate-400" />
                            </div>
                            <input
                                type="date"
                                min="2000-01-01"
                                max="9999-12-31"
                                style={{ colorScheme: 'dark' }}
                                onClick={handleDateClick}
                                className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-6 pl-14 outline-none focus:ring-2 focus:ring-amber-600/50 transition-all font-black text-white cursor-pointer"
                                value={formData.start_date}
                                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4 ml-3">
                            預計完成日期 (結案日)
                        </label>
                        <div className="relative">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none">
                                <CalendarDays size={20} className="text-slate-400" />
                            </div>
                            <input
                                type="date"
                                min="2000-01-01"
                                max="9999-12-31"
                                style={{ colorScheme: 'dark' }}
                                onClick={handleDateClick}
                                className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-6 pl-14 outline-none focus:ring-2 focus:ring-amber-600/50 transition-all font-black text-white cursor-pointer"
                                value={formData.end_date}
                                onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                            />
                        </div>
                    </div>

                    {/* 預算與幣別 */}
                    <div>
                        <div className="flex justify-between items-end mb-4 ml-3">
                            <label className="block text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">
                                核定預算 <span className="text-red-500">*</span>
                            </label>
                            {fetchingRate && <Loader2 className="animate-spin text-amber-500" size={14} />}
                            {exchangeRate && !fetchingRate && (
                                <span className="text-[10px] font-mono text-emerald-400">
                  1 USD = {exchangeRate.toFixed(2)} TWD
                </span>
                            )}
                        </div>
                        <div className="flex group relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                                <DollarSign size={18} className="text-slate-400" />
                            </div>
                            <select
                                className="bg-slate-800 border-r-0 border-slate-700 rounded-l-2xl pl-10 pr-4 text-sm font-black focus:outline-none text-white cursor-pointer appearance-none"
                                value={formData.currency}
                                onChange={(e) => setFormData({...formData, currency: e.target.value})}
                            >
                                <option value="TWD">TWD</option>
                                <option value="USD">USD</option>
                            </select>
                            <input
                                type="number"
                                min="0"
                                className="w-full bg-slate-950 border border-slate-700 rounded-r-2xl p-6 outline-none focus:ring-2 focus:ring-amber-600/50 transition-all font-black text-lg text-white"
                                value={formData.budget || ''}
                                onChange={(e) => setFormData({...formData, budget: parseInt(e.target.value) || 0})}
                            />
                        </div>
                        {formData.currency === 'USD' && exchangeRate && formData.budget ? (
                            <p className="text-xs text-slate-400 font-mono mt-3 ml-3">
                                約合台幣 NT$ {(formData.budget * exchangeRate).toLocaleString('zh-TW', { maximumFractionDigits: 0 })}
                            </p>
                        ) : null}
                    </div>

                    {/* 廠商選擇 */}
                    <div>
                        <label className="block text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4 ml-3">
                            關聯主要協力廠商
                        </label>
                        <div className="relative">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none">
                                <Building2 size={20} className="text-slate-400" />
                            </div>
                            <select
                                className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-6 pl-14 outline-none focus:ring-2 focus:ring-amber-600/50 transition-all font-black text-white appearance-none cursor-pointer"
                                value={formData.current_vendor_id}
                                onChange={(e) => setFormData({...formData, current_vendor_id: e.target.value})}
                            >
                                <option value="">-- 尚未指定或內部處理 --</option>
                                {vendors.map(vendor => (
                                    <option key={vendor.id} value={vendor.id}>
                                        {vendor.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 通知對象 - 承辦人 (To) */}
                    <div className="col-span-2">
                        <label className="block text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4 ml-3">
                            通知承辦人 (To) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none">
                                <Users size={20} className="text-slate-400" />
                            </div>
                            <input
                                type="text"
                                className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-6 pl-14 outline-none focus:ring-2 focus:ring-amber-600/50 transition-all font-medium text-white placeholder:text-slate-500"
                                placeholder="輸入 Email 信箱，多筆請以半形逗號 ( , ) 隔開"
                                value={formData.notify_to}
                                onChange={(e) => setFormData({...formData, notify_to: e.target.value})}
                            />
                        </div>
                    </div>

                    {/* 通知對象 - 主管副本 (Cc) */}
                    <div className="col-span-2">
                        <label className="block text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4 ml-3">
                            通知主管 / 副本 (Cc)
                        </label>
                        <div className="relative">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none">
                                <MailPlus size={20} className="text-slate-400" />
                            </div>
                            <input
                                type="text"
                                className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-6 pl-14 outline-none focus:ring-2 focus:ring-amber-600/50 transition-all font-medium text-white placeholder:text-slate-500"
                                placeholder="輸入主管 Email 信箱，多筆請以半形逗號 ( , ) 隔開"
                                value={formData.notify_cc}
                                onChange={(e) => setFormData({...formData, notify_cc: e.target.value})}
                            />
                        </div>
                    </div>

                    {/* 描述備註 */}
                    <div className="col-span-2">
                        <label className="block text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4 ml-3">
                            備註與詳細說明
                        </label>
                        <textarea
                            rows={3}
                            className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-6 outline-none focus:ring-2 focus:ring-amber-600/50 transition-all font-medium text-white placeholder:text-slate-500 resize-none"
                            placeholder="輸入有關此採購案的詳細資訊..."
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                    </div>

                    {/* 提醒排程引擎 */}
                    <div className="col-span-2 p-10 bg-amber-600/5 rounded-[3rem] border border-amber-500/20 mt-2 shadow-inner relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                        <div className="flex items-center justify-between mb-8 border-l-4 border-amber-500 pl-5">
                            <div className="flex items-center">
                                <Clock size={16} className="text-amber-500 mr-2" />
                                <h4 className="text-[11px] font-black text-amber-500 uppercase tracking-[0.3em] italic">
                                    Automation & Reminder Engine
                                </h4>
                            </div>
                            {formData.start_date && (
                                <div className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                                    系統預計將於 {(
                                    new Date(new Date(formData.start_date).getTime() - (formData.reminder_days_before * 86400000))
                                ).toISOString().split('T')[0]} 發送通知
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-10">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">
                                    前置提醒天數 (Days)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-5 outline-none focus:ring-2 focus:ring-amber-600/30 transition-all font-black text-amber-500 text-lg"
                                    value={formData.reminder_days_before}
                                    onChange={(e) => setFormData({...formData, reminder_days_before: parseInt(e.target.value) || 0})}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">
                                    排程週期
                                </label>
                                <select
                                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-5 outline-none focus:ring-2 focus:ring-amber-600/30 transition-all font-black text-white appearance-none cursor-pointer"
                                    value={formData.cycle}
                                    onChange={(e) => setFormData({...formData, cycle: e.target.value})}
                                >
                                    <option value="once">單次採購 (One-time)</option>
                                    <option value="monthly">每月執行 (Monthly)</option>
                                    <option value="half-yearly">每半年執行 (Half-yearly)</option>
                                    <option value="yearly">每年重複 (Yearly)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* 按鈕移到底部 */}
                    <div className="col-span-2 flex justify-end items-center space-x-6 mt-6 pt-10 border-t border-slate-800/60">
                        <button
                            onClick={() => router.push('/dashboard/procurements')}
                            className="px-8 py-3.5 text-slate-400 font-black uppercase tracking-widest text-xs hover:text-white transition-colors"
                        >
                            取消返回
                        </button>
                        <button
                            onClick={handleUpdate}
                            disabled={loading}
                            className="px-10 py-3.5 bg-amber-600 hover:bg-amber-500 rounded-2xl text-sm font-black text-white flex items-center shadow-lg shadow-amber-600/20 transition-all disabled:opacity-50 tracking-widest uppercase"
                        >
                            {loading ? <Loader2 className="animate-spin mr-3" size={20} /> : <Save size={20} className="mr-3" />}
                            確認更新行程
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}