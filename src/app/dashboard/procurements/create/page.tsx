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
    Clock,
    CalendarDays,
    Users,
    MailPlus,
    Tag,
    ShoppingBag,
    Bell
} from 'lucide-react';

// ==========================================
// 1. 強型別定義
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
    next_reminder_date: string; // 直接儲存日期
    description: string;
    notify_to: string;
    notify_cc: string; // CC 副本欄位
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

export default function CreateProcurementPage() {
    const router = useRouter();
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [initLoading, setInitLoading] = useState<boolean>(true);

    const [exchangeRate, setExchangeRate] = useState<number | null>(null);
    const [fetchingRate, setFetchingRate] = useState<boolean>(false);

    const [formData, setFormData] = useState<ProcurementFormData>({
        title: '',
        budget: 0,
        currency: 'TWD',
        current_vendor_id: '',
        start_date: '',
        end_date: '',
        cycle: 'yearly',
        next_reminder_date: '', 
        description: '',
        notify_to: '',
        notify_cc: '', 
        category: 'procurement',
        purchase_method: 'joint_contract'
    });

    useEffect(() => {
        const initData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setUser(session.user);
                const { data: vendorData } = await supabase
                    .from('vendors')
                    .select('id, name')
                    .order('name');
                if (vendorData) setVendors(vendorData);
            } else {
                router.push('/login');
            }
            setInitLoading(false);
        };
        initData();
    }, [router]);

    useEffect(() => {
        const fetchCurrentExchangeRate = async (baseCurrency: string, targetCurrency: string) => {
            setFetchingRate(true);
            try {
                const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);
                const data: ExchangeRateResponse = await response.json();
                const rate = data.conversion_rates[targetCurrency];
                if (rate) setExchangeRate(rate);
            } catch (err) {
                console.error('匯率失敗', err);
            } finally {
                setFetchingRate(false);
            }
        };
        if (formData.currency === 'USD') fetchCurrentExchangeRate('USD', 'TWD');
        else setExchangeRate(null);
    }, [formData.currency]);

    const handleSave = async () => {
        if (!user) return;

        if (!formData.title || !formData.budget || !formData.notify_to) {
            alert('「案名」、「預算」與「通知承辦人」為必填項目！');
            return;
        }

        const emailTemplateConfig = {
            to: formData.notify_to.split(',').map(email => email.trim()).filter(Boolean),
            cc: formData.notify_cc.split(',').map(email => email.trim()).filter(Boolean),
        };

        setLoading(true);
        try {
            const newItem = {
                title: formData.title,
                budget: formData.budget,
                currency: formData.currency,
                current_vendor_id: formData.current_vendor_id || null,
                start_date: formData.start_date || null,
                end_date: formData.end_date || null,
                next_reminder_date: formData.next_reminder_date || null,
                cycle: formData.cycle,
                reminder_days_before: null, 
                description: formData.description,
                email_template: emailTemplateConfig,
                creator_id: user.id,
                is_active: true,
                category: formData.category,
                purchase_method: formData.category === 'procurement' ? formData.purchase_method : null
            };

            const { error } = await supabase.from('procurement_items').insert([newItem]);
            if (error) throw error;
            router.push('/dashboard/procurements');
        } catch (err) {
            if (err instanceof Error) alert('儲存失敗: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDateClick = (e: React.MouseEvent<HTMLInputElement>) => {
        const target = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
        if (typeof target.showPicker === 'function') target.showPicker();
    };

    if (initLoading) return <div className="h-full flex items-center justify-center"><Loader2 className="text-blue-500 animate-spin" size={48} /></div>;

    return (
        <div className="max-w-4xl mx-auto p-12">
            <header className="mb-10">
                <nav className="flex items-center space-x-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    <span>Enterprise</span><ChevronRight size={10} /><span className="text-blue-500">Procurements</span><ChevronRight size={10} /><span className="text-slate-300">Create</span>
                </nav>
            </header>

            <div className="bg-slate-900/60 border border-slate-800 rounded-[3.5rem] p-14 shadow-2xl relative overflow-hidden backdrop-blur-xl">
                <div className="mb-12 pb-8 border-b border-slate-800/60">
                    <h3 className="text-3xl font-black tracking-tight text-white flex items-center"><FileEdit className="mr-3 text-blue-500" size={32} />建立新採購計畫</h3>
                </div>

                <div className="grid grid-cols-2 gap-12">
                    <div className="col-span-2">
                        <label className="block text-[11px] font-black text-slate-300 uppercase mb-4 ml-3">計畫標題案名 *</label>
                        <input type="text" className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-6 outline-none focus:ring-2 focus:ring-blue-600/50 transition-all text-xl font-black text-white" placeholder="請輸入計畫名稱..." value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                    </div>

                    <div>
                        <label className="block text-[11px] font-black text-slate-300 uppercase mb-4 ml-3">計畫類別 *</label>
                        <div className="relative">
                            <Tag className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><select className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-6 pl-14 outline-none focus:ring-2 focus:ring-blue-600/50 font-black text-white appearance-none cursor-pointer" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value as ProcurementCategory})}><option value="procurement">一般採購計畫</option><option value="warranty">設備保固維護</option></select>
                        </div>
                    </div>

                    <div className={formData.category === 'warranty' ? 'opacity-30 pointer-events-none' : ''}>
                        <label className="block text-[11px] font-black text-slate-300 uppercase mb-4 ml-3">購買方式</label>
                        <div className="relative">
                            <ShoppingBag className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><select className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-6 pl-14 outline-none focus:ring-2 focus:ring-blue-600/50 font-black text-white appearance-none cursor-pointer" value={formData.purchase_method} onChange={(e) => setFormData({...formData, purchase_method: e.target.value as PurchaseMethod})} disabled={formData.category === 'warranty'}><option value="joint_contract">共同供應契約</option><option value="open_tender">公開招標</option><option value="direct_order">簽名下訂</option></select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-black text-slate-300 uppercase mb-4 ml-3">起始日期</label>
                        <div className="relative"><CalendarDays className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input type="date" style={{ colorScheme: 'dark' }} onClick={handleDateClick} className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-6 pl-14 font-black text-white cursor-pointer" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} /></div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-black text-slate-300 uppercase mb-4 ml-3">結束日期</label>
                        <div className="relative"><CalendarDays className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input type="date" style={{ colorScheme: 'dark' }} onClick={handleDateClick} className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-6 pl-14 font-black text-white cursor-pointer" value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} /></div>
                    </div>

                    <div>
                        <div className="flex justify-between items-end mb-4 ml-3">
                            <label className="block text-[11px] font-black text-slate-300 uppercase">預算 / 金額 *</label>
                            {exchangeRate && <span className="text-[10px] font-mono text-emerald-400">1 USD = {exchangeRate.toFixed(2)} TWD</span>}
                        </div>
                        <div className="flex relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-slate-400" size={18} /><select className="bg-slate-800 border-r-0 border-slate-700 rounded-l-2xl pl-10 pr-4 text-sm font-black text-white appearance-none" value={formData.currency} onChange={(e) => setFormData({...formData, currency: e.target.value})}><option value="TWD">TWD</option><option value="USD">USD</option></select><input type="number" className="w-full bg-slate-950 border border-slate-700 rounded-r-2xl p-6 outline-none focus:ring-2 focus:ring-blue-600/50 font-black text-lg text-white" value={formData.budget || ''} onChange={(e) => setFormData({...formData, budget: parseInt(e.target.value) || 0})} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-black text-slate-300 uppercase mb-4 ml-3">主要廠商</label>
                        <div className="relative"><Building2 className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><select className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-6 pl-14 text-white appearance-none font-bold" value={formData.current_vendor_id} onChange={(e) => setFormData({...formData, current_vendor_id: e.target.value})}><option value="">-- 未指定 --</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
                    </div>

                    {/* 通知對象 - 重新加回 CC */}
                    <div className="col-span-2">
                        <label className="block text-[11px] font-black text-slate-300 uppercase mb-4 ml-3">通知承辦人 (To) *</label>
                        <div className="relative"><Users className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input type="text" className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-6 pl-14 font-medium text-white placeholder:text-slate-500" placeholder="Email, 多筆請用逗號隔開" value={formData.notify_to} onChange={(e) => setFormData({...formData, notify_to: e.target.value})} /></div>
                    </div>

                    <div className="col-span-2">
                        <label className="block text-[11px] font-black text-slate-300 uppercase mb-4 ml-3">通知主管 / 副本 (Cc)</label>
                        <div className="relative"><MailPlus className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input type="text" className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-6 pl-14 font-medium text-white placeholder:text-slate-500" placeholder="Email, 多筆請用逗號隔開" value={formData.notify_cc} onChange={(e) => setFormData({...formData, notify_cc: e.target.value})} /></div>
                    </div>

                    <div className="col-span-2">
                        <label className="block text-[11px] font-black text-slate-300 uppercase mb-4 ml-3">備註說明</label>
                        <textarea rows={3} className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-6 text-white font-medium outline-none focus:ring-2 focus:ring-blue-600/50" placeholder="輸入備註..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                    </div>

                    <div className="col-span-2 p-10 bg-blue-600/5 rounded-[3rem] border border-blue-500/20 mt-2 shadow-inner relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        <div className="flex items-center justify-between mb-8 border-l-4 border-blue-500 pl-5"><h4 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.3em] italic">Automation & Reminder Engine</h4></div>
                        <div className="grid grid-cols-2 gap-10">
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-4 ml-2">指定下次提醒日期 (System Reminder)</label><div className="relative"><Bell className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-500" size={18} /><input type="date" style={{ colorScheme: 'dark' }} onClick={handleDateClick} className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-5 pl-14 outline-none focus:ring-2 focus:ring-blue-600/30 transition-all font-black text-white text-lg cursor-pointer" value={formData.next_reminder_date} onChange={(e) => setFormData({...formData, next_reminder_date: e.target.value})} /></div></div>
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-4 ml-2">排程週期</label><select className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-5 outline-none focus:ring-2 focus:ring-blue-600/30 font-black text-white appearance-none cursor-pointer" value={formData.cycle} onChange={(e) => setFormData({...formData, cycle: e.target.value})}><option value="once">單次 (Once)</option><option value="monthly">每月 (Monthly)</option><option value="half-yearly">每半年 (Half-yearly)</option><option value="yearly">每年 (Yearly)</option></select></div>
                        </div>
                    </div>

                    <div className="col-span-2 flex justify-end items-center space-x-6 pt-10 border-t border-slate-800/60">
                        <button onClick={() => router.push('/dashboard/procurements')} className="text-slate-400 font-black uppercase text-xs">取消返回</button>
                        <button onClick={handleSave} disabled={loading} className="px-10 py-3.5 bg-blue-600 hover:bg-blue-500 rounded-2xl text-sm font-black text-white flex items-center shadow-lg tracking-widest uppercase">{loading ? <Loader2 className="animate-spin mr-3" size={20} /> : <Save size={20} className="mr-3" />}確認儲存</button>
                    </div>
                </div>
            </div>
        </div>
    );
}