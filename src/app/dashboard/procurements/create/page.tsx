"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, User as SupabaseUser } from '@supabase/supabase-js';
import {
    Save,
    Loader2,
    ChevronRight,
    Building2,
    DollarSign,
    FileEdit,
    Clock
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
    cycle: string;
    reminder_days_before: number;
    description: string;
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

export default function CreateProcurementPage() {
    const router = useRouter();
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [initLoading, setInitLoading] = useState<boolean>(true);

    // 匯率相關狀態
    const [exchangeRate, setExchangeRate] = useState<number | null>(null);
    const [fetchingRate, setFetchingRate] = useState<boolean>(false);

    // 表單資料狀態
    const [formData, setFormData] = useState<ProcurementFormData>({
        title: '',
        budget: 0,
        currency: 'TWD',
        current_vendor_id: '',
        cycle: 'yearly',
        reminder_days_before: 30,
        description: ''
    });

    // ==========================================
    // 3. 初始資料載入 (使用者與廠商清單)
    // ==========================================
    useEffect(() => {
        const initData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setUser(session.user);

                // 從資料庫獲取廠商列表供下拉選單使用
                const { data: vendorData, error: vendorError } = await supabase
                    .from('vendors')
                    .select('id, name')
                    .order('name');

                if (!vendorError && vendorData) {
                    setVendors(vendorData);
                }
            }
            setInitLoading(false);
        };

        initData();
    }, []);

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
    // 5. 儲存至資料庫
    // ==========================================
    const handleSave = async () => {
        if (!user) {
            alert('請先登入後再進行操作');
            return;
        }

        if (!formData.title || !formData.budget) {
            alert('「採購標題案名」與「核定預算」為必填項目！');
            return;
        }

        setLoading(true);
        try {
            const newItem = {
                title: formData.title,
                budget: formData.budget,
                currency: formData.currency,
                cycle: formData.cycle,
                reminder_days_before: formData.reminder_days_before,
                description: formData.description,
                current_vendor_id: formData.current_vendor_id || null, // 允許空值
                creator_id: user.id,
                is_active: true
            };

            const { error } = await supabase
                .from('procurement_items')
                .insert([newItem]);

            if (error) throw error;

            // 儲存成功後，導回清單頁
            router.push('/dashboard/procurements');
        } catch (err) {
            if (err instanceof Error) {
                alert('儲存發生錯誤: ' + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // 6. 畫面渲染
    // ==========================================
    if (initLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="text-blue-500 animate-spin" size={48} />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-12">
            {/* 頂部標題與導覽 */}
            <header className="mb-10">
                <nav className="flex items-center space-x-2 text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">
                    <span>Enterprise</span>
                    <ChevronRight size={10} />
                    <span className="text-blue-500">Procurements</span>
                    <ChevronRight size={10} />
                    <span className="text-slate-400">Create</span>
                </nav>
            </header>

            {/* 表單主體 */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-[3.5rem] p-14 shadow-2xl relative overflow-hidden backdrop-blur-xl">
                <div className="flex justify-between items-center mb-14 pb-10 border-b border-slate-800/60">
                    <div>
                        <h3 className="text-3xl font-black tracking-tight text-white flex items-center">
                            <FileEdit className="mr-3 text-blue-500" size={32} />
                            建立新採購計畫
                        </h3>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-2 ml-11">
                            Create New Execution Plan
                        </p>
                    </div>
                    <div className="flex space-x-4">
                        <button
                            onClick={() => router.push('/dashboard/procurements')}
                            className="px-8 py-3.5 text-slate-500 font-black uppercase tracking-widest text-xs hover:text-slate-300 transition-colors"
                        >
                            取消返回
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="px-10 py-3.5 bg-blue-600 hover:bg-blue-500 rounded-2xl text-sm font-black text-white flex items-center shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 tracking-widest uppercase"
                        >
                            {loading ? <Loader2 className="animate-spin mr-3" size={20} /> : <Save size={20} className="mr-3" />}
                            確認儲存行程
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-12">
                    {/* 標題輸入 */}
                    <div className="col-span-2">
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 ml-3">
                            採購標題案名 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-6 outline-none focus:ring-2 focus:ring-blue-600/50 transition-all text-xl font-black placeholder:text-slate-800 text-white"
                            placeholder="請輸入採購計畫名稱..."
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                        />
                    </div>

                    {/* 預算與幣別 */}
                    <div>
                        <div className="flex justify-between items-end mb-4 ml-3">
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                核定預算 <span className="text-red-500">*</span>
                            </label>
                            {fetchingRate && <Loader2 className="animate-spin text-blue-500" size={14} />}
                            {exchangeRate && !fetchingRate && (
                                <span className="text-[10px] font-mono text-emerald-400">
                  1 USD = {exchangeRate.toFixed(2)} TWD
                </span>
                            )}
                        </div>
                        <div className="flex group relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                                <DollarSign size={18} className="text-slate-500" />
                            </div>
                            <select
                                className="bg-slate-800 border-r-0 border-slate-800 rounded-l-2xl pl-10 pr-4 text-sm font-black focus:outline-none text-white cursor-pointer appearance-none"
                                value={formData.currency}
                                onChange={(e) => setFormData({...formData, currency: e.target.value})}
                            >
                                <option value="TWD">TWD</option>
                                <option value="USD">USD</option>
                            </select>
                            <input
                                type="number"
                                min="0"
                                className="w-full bg-slate-950 border border-slate-800 rounded-r-2xl p-6 outline-none focus:ring-2 focus:ring-blue-600/50 transition-all font-black text-lg text-white"
                                value={formData.budget || ''}
                                onChange={(e) => setFormData({...formData, budget: parseInt(e.target.value) || 0})}
                            />
                        </div>
                        {formData.currency === 'USD' && exchangeRate && formData.budget ? (
                            <p className="text-xs text-slate-500 font-mono mt-3 ml-3">
                                約合台幣 NT$ {(formData.budget * exchangeRate).toLocaleString('zh-TW', { maximumFractionDigits: 0 })}
                            </p>
                        ) : null}
                    </div>

                    {/* 廠商選擇 */}
                    <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 ml-3">
                            關聯主要協力廠商
                        </label>
                        <div className="relative">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none">
                                <Building2 size={20} className="text-slate-600" />
                            </div>
                            <select
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-6 pl-14 outline-none focus:ring-2 focus:ring-blue-600/50 transition-all font-black text-white appearance-none cursor-pointer"
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

                    {/* 描述備註 */}
                    <div className="col-span-2">
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 ml-3">
                            備註與詳細說明
                        </label>
                        <textarea
                            rows={3}
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-6 outline-none focus:ring-2 focus:ring-blue-600/50 transition-all font-medium text-white placeholder:text-slate-800 resize-none"
                            placeholder="輸入有關此採購案的詳細資訊..."
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                    </div>

                    {/* 提醒排程引擎 */}
                    <div className="col-span-2 p-10 bg-blue-600/5 rounded-[3rem] border border-blue-500/10 mt-2 shadow-inner relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                        <div className="flex items-center mb-8 border-l-4 border-blue-600 pl-5">
                            <Clock size={16} className="text-blue-500 mr-2" />
                            <h4 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em] italic">
                                Automation & Reminder Engine
                            </h4>
                        </div>

                        <div className="grid grid-cols-2 gap-10">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 ml-2">
                                    前置提醒天數 (Days)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 outline-none focus:ring-2 focus:ring-blue-600/30 transition-all font-black text-blue-400 text-lg"
                                    value={formData.reminder_days_before}
                                    onChange={(e) => setFormData({...formData, reminder_days_before: parseInt(e.target.value) || 0})}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 ml-2">
                                    排程週期
                                </label>
                                <select
                                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 outline-none focus:ring-2 focus:ring-blue-600/30 transition-all font-black text-white appearance-none cursor-pointer"
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

                </div>
            </div>
        </div>
    );
}