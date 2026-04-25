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
    MailPlus,
    Tag,
    ShoppingBag
} from 'lucide-react';

// ==========================================
// 1. 強型別定義 (遵循顧問準則，嚴格控制型別)
// ==========================================
interface Vendor {
    id: string;
    name: string;
}

type ProcurementCategory = 'procurement' | 'warranty';
type PurchaseMethod = 'joint_contract' | 'open_tender' | 'direct_order';

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
    // 配合資料庫異動的新欄位
    category: ProcurementCategory;
    purchase_method: PurchaseMethod | '';
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
    const params = useParams();
    const procurementId = params?.id as string;

    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [initLoading, setInitLoading] = useState<boolean>(true);

    const [exchangeRate, setExchangeRate] = useState<number | null>(null);
    const [fetchingRate, setFetchingRate] = useState<boolean>(false);

    // 表單初始狀態 (同步新增頁面的欄位)
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
        notify_cc: '',
        category: 'procurement',
        purchase_method: 'joint_contract'
    });

    // ==========================================
    // 3. 初始資料載入 (同步獲取計畫詳細資料)
    // ==========================================
    useEffect(() => {
        const initData = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    setUser(session.user);

                    // 1. 獲取廠商清單
                    const { data: vendorData } = await supabase
                        .from('vendors')
                        .select('id, name')
                        .order('name');
                    if (vendorData) setVendors(vendorData);

                    // 2. 獲取舊有計畫資料
                    if (procurementId) {
                        const { data: procData, error: procError } = await supabase
                            .from('procurement_items')
                            .select('*')
                            .eq('id', procurementId)
                            .single();

                        if (procError) throw procError;

                        if (procData) {
                            const toEmails = procData.email_template?.to?.join(', ') || '';
                            const ccEmails = procData.email_template?.cc?.join(', ') || '';

                            setFormData({
                                title: procData.title || '',
                                budget: procData.budget || 0,
                                currency: procData.currency || 'TWD',
                                current_vendor_id: procData.current_vendor_id || '',
                                start_date: procData.start_date ? procData.start_date.split('T')[0] : '',
                                end_date: procData.end_date ? procData.end_date.split('T')[0] : '',
                                cycle: procData.cycle || 'yearly',
                                reminder_days_before: procData.reminder_days_before || 30,
                                description: procData.description || '',
                                notify_to: toEmails,
                                notify_cc: ccEmails,
                                // 資料回顯處理
                                category: (procData.category as ProcurementCategory) || 'procurement',
                                purchase_method: (procData.purchase_method as PurchaseMethod) || 'joint_contract'
                            });
                        }
                    }
                } else {
                    router.push('/login');
                }
            } catch (err) {
                console.error('載入失敗:', err);
                router.push('/dashboard/procurements');
            } finally {
                setInitLoading(false);
            }
        };

        initData();
    }, [procurementId, router]);

    // ==========================================
    // 4. 匯率 API 整合
    // ==========================================
    useEffect(() => {
        const fetchCurrentExchangeRate = async (baseCurrency: string, targetCurrency: string) => {
            setFetchingRate(true);
            try {
                const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
                if (!response.ok) throw new Error('API Error');
                const data: ExchangeRateResponse = await response.json();
                const rate = data.conversion_rates[targetCurrency];
                if (rate) setExchangeRate(rate);
            } catch (error) {
                console.error('匯率獲取失敗', error);
            } finally {
                setFetchingRate(false);
            }
        };

        if (formData.currency === 'USD') fetchCurrentExchangeRate('USD', 'TWD');
        else setExchangeRate(null);
    }, [formData.currency]);

    // ==========================================
    // 5. 更新邏輯 (同步處理新欄位)
    // ==========================================
    const handleUpdate = async () => {
        if (!user) return;

        if (!formData.title || !formData.budget || !formData.notify_to) {
            alert('「計畫案名」、「預算」與「通知承辦人」為必填項目！');
            return;
        }

        // 計算下次提醒日
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
                reminder_days_before: formData.reminder_days_before || null,
                description: formData.description,
                email_template: emailTemplateConfig,
                // 更新新欄位資料
                category: formData.category,
                purchase_method: formData.category === 'procurement' ? formData.purchase_method : null
            };

            const { error } = await supabase
                .from('procurement_items')
                .update(updateData)
                .eq('id', procurementId)
                .eq('creator_id', user.id);

            if (error) throw error;

            router.push('/dashboard/procurements');
        } catch (err) {
            if (err instanceof Error) alert('更新發生錯誤: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDateClick = (e: React.MouseEvent<HTMLInputElement>) => {
        const target = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
        if (typeof target.showPicker === 'function') {
            try {
                target.showPicker();
            } catch (err) {
                console.warn('Browser does not support showPicker');
            }
        }
    };

    if (initLoading) return (
        <div className="h-full flex items-center justify-center">
            <Loader2 className="text-blue-500 animate-spin" size={48} />
        </div>
    );

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
                        編輯計畫詳情
                    </h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-2 ml-11">
                        Update Project Configuration
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-12">
                    {/* 計畫標題 */}
                    <div className="col-span-2">
                        <label className="block text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4 ml-3">
                            計畫標題案名 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-6 outline-none focus:ring-2 focus:ring-amber-600/50 transition-all text-xl font-black text-white"
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                        />
                    </div>

                    {/* 類別選擇 - 同步 Create 頁面邏輯 */}
                    <div>
                        <label className="block text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4 ml-3">
                            計畫類別 <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Tag className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <select
                                className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-6 pl-14 outline-none focus:ring-2 focus:ring-amber-600/50 transition-all font-black text-white appearance-none cursor-pointer"
                                value={formData.category}
                                onChange={(e) => setFormData({...formData, category: e.target.value as ProcurementCategory})}
                            >
                                <option value="procurement">一般採購計畫</option>
                                <option value="warranty">設備保固維護</option>
                            </select>
                        </div>
                    </div>

                    {/* 購買方式連動選單 */}
                    <div className={formData.category === 'warranty' ? 'opacity-30 pointer-events-none' : ''}>
                        <label className="block text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4 ml-3">
                            購買方式 {formData.category === 'procurement' && <span className="text-red-500">*</span>}
                        </label>
                        <div className="relative">
                            <ShoppingBag className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <select
                                className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-6 pl-14 outline-none focus:ring-2 focus:ring-amber-600/50 transition-all font-black text-white appearance-none cursor-pointer"
                                value={formData.purchase_method}
                                onChange={(e) => setFormData({...formData, purchase_method: e.target.value as PurchaseMethod})}
                                disabled={formData.category === 'warranty'}
                            >
                                <option value="joint_contract">共同供應契約</option>
                                <option value="open_tender">公開招標</option>
                                <option value="direct_order">簽名下訂</option>
                            </select>
                        </div>
                    </div>

                    {/* 時程設定 */}
                    <div>
                        <label className="block text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4 ml-3">
                            起始日期 (執行/保固起始)
                        </label>
                        <div className="relative">
                            <CalendarDays className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="date"
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
                            結束日期 (結案/保固到期)
                        </label>
                        <div className="relative">
                            <CalendarDays className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="date"
                                style={{ colorScheme: 'dark' }}
                                onClick={handleDateClick}
                                className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-6 pl-14 outline-none focus:ring-2 focus:ring-amber-600/50 transition-all font-black text-white cursor-pointer"
                                value={formData.end_date}
                                onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                            />
                        </div>
                    </div>

                    {/* 預算與金額 */}
                    <div>
                        <div className="flex justify-between items-end mb-4 ml-3">
                            <label className="block text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">
                                核定預算 / 金額 <span className="text-red-500">*</span>
                            </label>
                            {fetchingRate && <Loader2 className="animate-spin text-amber-500" size={14} />}
                            {exchangeRate && (
                                <span className="text-[10px] font-mono text-emerald-400">1 USD = {exchangeRate.toFixed(2)} TWD</span>
                            )}
                        </div>
                        <div className="flex group relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-slate-400" size={18} />
                            <select
                                className="bg-slate-800 border-r-0 border-slate-700 rounded-l-2xl pl-10 pr-4 text-sm font-black focus:outline-none text-white appearance-none cursor-pointer"
                                value={formData.currency}
                                onChange={(e) => setFormData({...formData, currency: e.target.value})}
                            >
                                <option value="TWD">TWD</option>
                                <option value="USD">USD</option>
                            </select>
                            <input
                                type="number"
                                className="w-full bg-slate-950 border border-slate-700 rounded-r-2xl p-6 outline-none focus:ring-2 focus:ring-amber-600/50 font-black text-lg text-white"
                                value={formData.budget || ''}
                                onChange={(e) => setFormData({...formData, budget: parseInt(e.target.value) || 0})}
                            />
                        </div>
                    </div>

                    {/* 廠商 */}
                    <div>
                        <label className="block text-[11px] font-black text-slate-300 uppercase mb-4 ml-3">主要協力廠商</label>
                        <div className="relative">
                            <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <select
                                className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-6 pl-14 outline-none focus:ring-2 focus:ring-amber-600/50 text-white appearance-none font-bold"
                                value={formData.current_vendor_id}
                                onChange={(e) => setFormData({...formData, current_vendor_id: e.target.value})}
                            >
                                <option value="">-- 未指定 --</option>
                                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* 通知對象 */}
                    <div className="col-span-2">
                        <label className="block text-[11px] font-black text-slate-300 uppercase mb-4 ml-3">通知承辦人 (To) <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <Users className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-6 pl-14 outline-none focus:ring-2 focus:ring-amber-600/50 transition-all font-medium text-white"
                                placeholder="Email, 多筆請用逗號隔開"
                                value={formData.notify_to}
                                onChange={(e) => setFormData({...formData, notify_to: e.target.value})}
                            />
                        </div>
                    </div>

                    {/* 提醒排程引擎 */}
                    <div className="col-span-2 p-10 bg-amber-600/5 rounded-[3rem] border border-amber-500/20 mt-2 shadow-inner relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        <div className="flex items-center justify-between mb-8 border-l-4 border-amber-500 pl-5">
                            <h4 className="text-[11px] font-black text-amber-500 uppercase tracking-[0.3em] italic">
                                Automation & Reminder Engine
                            </h4>
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
                                    <option value="once">單次計畫 (Once)</option>
                                    <option value="monthly">每月執行 (Monthly)</option>
                                    <option value="half-yearly">每半年執行 (Half-yearly)</option>
                                    <option value="yearly">每年重複 (Yearly)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* 操作按鈕 */}
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