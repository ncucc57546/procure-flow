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
    next_reminder_date: string; 
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

    const [formData, setFormData] = useState<ProcurementFormData>({
        title: '', budget: 0, currency: 'TWD', current_vendor_id: '',
        start_date: '', end_date: '', cycle: 'yearly', next_reminder_date: '',
        description: '', notify_to: '', notify_cc: '',
        category: 'procurement', purchase_method: 'joint_contract'
    });

    useEffect(() => {
        const initData = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    setUser(session.user);
                    const { data: vData } = await supabase.from('vendors').select('id, name').order('name');
                    if (vData) setVendors(vData);

                    if (procurementId) {
                        const { data: pData, error } = await supabase.from('procurement_items').select('*').eq('id', procurementId).single();
                        if (error) throw error;
                        if (pData) {
                            setFormData({
                                title: pData.title || '',
                                budget: pData.budget || 0,
                                currency: pData.currency || 'TWD',
                                current_vendor_id: pData.current_vendor_id || '',
                                start_date: pData.start_date ? pData.start_date.split('T')[0] : '',
                                end_date: pData.end_date ? pData.end_date.split('T')[0] : '',
                                cycle: pData.cycle || 'yearly',
                                next_reminder_date: pData.next_reminder_date ? pData.next_reminder_date.split('T')[0] : '',
                                description: pData.description || '',
                                notify_to: pData.email_template?.to?.join(', ') || '',
                                notify_cc: pData.email_template?.cc?.join(', ') || '',
                                category: (pData.category as ProcurementCategory) || 'procurement',
                                purchase_method: (pData.purchase_method as PurchaseMethod) || 'joint_contract'
                            });
                        }
                    }
                } else {
                    router.push('/login');
                }
            } catch (err) {
                router.push('/dashboard/procurements');
            } finally {
                setInitLoading(false);
            }
        };
        initData();
    }, [procurementId, router]);

    useEffect(() => {
        const fetchRate = async (base: string, target: string) => {
            setFetchingRate(true);
            try {
                const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
                const data = await res.json();
                if (data.conversion_rates?.[target]) setExchangeRate(data.conversion_rates[target]);
            } finally { setFetchingRate(false); }
        };
        if (formData.currency === 'USD') fetchRate('USD', 'TWD');
        else setExchangeRate(null);
    }, [formData.currency]);

    const handleUpdate = async () => {
        if (!user) return;
        if (!formData.title || !formData.budget || !formData.notify_to) {
            alert('「案名」、「預算」與「通知承辦人」為必填項目！');
            return;
        }

        const emailTemplateConfig = {
            to: formData.notify_to.split(',').map(e => e.trim()).filter(Boolean),
            cc: formData.notify_cc.split(',').map(e => e.trim()).filter(Boolean),
        };

        setLoading(true);
        try {
            const updateData = {
                title: formData.title, budget: formData.budget, currency: formData.currency,
                current_vendor_id: formData.current_vendor_id || null,
                start_date: formData.start_date || null, end_date: formData.end_date || null,
                next_reminder_date: formData.next_reminder_date || null,
                cycle: formData.cycle, reminder_days_before: null,
                description: formData.description, email_template: emailTemplateConfig,
                category: formData.category, purchase_method: formData.category === 'procurement' ? formData.purchase_method : null
            };
            const { error } = await supabase.from('procurement_items').update(updateData).eq('id', procurementId).eq('creator_id', user.id);
            if (error) throw error;
            router.push('/dashboard/procurements');
        } catch (err) {
            alert('更新失敗');
        } finally { setLoading(false); }
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
                    <span>Enterprise</span><ChevronRight size={10} /><span className="text-blue-500">Procurements</span><ChevronRight size={10} /><span className="text-slate-300">Edit</span>
                </nav>
            </header>

            <div className="bg-slate-900/60 border border-slate-800 rounded-[3.5rem] p-14 shadow-2xl relative overflow-hidden backdrop-blur-xl">
                <div className="mb-12 pb-8 border-b border-slate-800/60">
                    <h3 className="text-3xl font-black tracking-tight text-white flex items-center"><FileEdit className="mr-3 text-amber-500" size={32} />編輯計畫詳情</h3>
                </div>

                <div className="grid grid-cols-2 gap-12">
                    <div className="col-span-2">
                        <label className="block text-[11px] font-black text-slate-300 uppercase mb-4 ml-3">計畫標題案名 *</label>
                        <input type="text" className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-6 outline-none focus:ring-2 focus:ring-amber-600/50 transition-all text-xl font-black text-white" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                    </div>

                    <div>
                        <label className="block text-[11px] font-black text-slate-300 uppercase mb-4 ml-3">計畫類別 *</label>
                        <div className="relative"><Tag className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><select className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-6 pl-14 outline-none focus:ring-2 focus:ring-amber-600/50 font-black text-white appearance-none cursor-pointer" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value as ProcurementCategory})}><option value="procurement">一般採購計畫</option><option value="warranty">設備保固維護</option></select></div>
                    </div>

                    <div className={formData.category === 'warranty' ? 'opacity-30 pointer-events-none' : ''}>
                        <label className="block text-[11px] font-black text-slate-300 uppercase mb-4 ml-3">購買方式</label>
                        <div className="relative"><ShoppingBag className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><select className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-6 pl-14 outline-none focus:ring-2 focus:ring-amber-600/50 font-black text-white appearance-none cursor-pointer" value={formData.purchase_method} onChange={(e) => setFormData({...formData, purchase_method: e.target.value as PurchaseMethod})} disabled={formData.category === 'warranty'}><option value="joint_contract">共同供應契約</option><option value="open_tender">公開招標</option><option value="direct_order">簽名下訂</option></select></div>
                    </div>

                    <div><label className="block text-[11px] font-black text-slate-300 uppercase mb-4 ml-3">起始日期</label><div className="relative"><CalendarDays className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input type="date" style={{ colorScheme: 'dark' }} onClick={handleDateClick} className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-6 pl-14 font-black text-white cursor-pointer" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} /></div></div>
                    <div><label className="block text-[11px] font-black text-slate-300 uppercase mb-4 ml-3">結束日期</label><div className="relative"><CalendarDays className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input type="date" style={{ colorScheme: 'dark' }} onClick={handleDateClick} className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-6 pl-14 font-black text-white cursor-pointer" value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} /></div></div>

                    <div>
                        <div className="flex justify-between items-end mb-4 ml-3"><label className="block text-[11px] font-black text-slate-300 uppercase">預算 / 金額 *</label>{exchangeRate && <span className="text-[10px] font-mono text-emerald-400">1 USD = {exchangeRate.toFixed(2)} TWD</span>}</div>
                        <div className="flex relative"><DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-slate-400" size={18} /><select className="bg-slate-800 border-r-0 border-slate-700 rounded-l-2xl pl-10 pr-4 text-sm font-black text-white appearance-none" value={formData.currency} onChange={(e) => setFormData({...formData, currency: e.target.value})}><option value="TWD">TWD</option><option value="USD">USD</option></select><input type="number" className="w-full bg-slate-950 border border-slate-700 rounded-r-2xl p-6 outline-none focus:ring-2 focus:ring-amber-600/50 font-black text-lg text-white" value={formData.budget || ''} onChange={(e) => setFormData({...formData, budget: parseInt(e.target.value) || 0})} /></div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-black text-slate-300 uppercase mb-4 ml-3">主要廠商</label>
                        <div className="relative"><Building2 className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><select className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-6 pl-14 text-white appearance-none font-bold" value={formData.current_vendor_id} onChange={(e) => setFormData({...formData, current_vendor_id: e.target.value})}><option value="">-- 未指定 --</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
                    </div>

                    <div className="col-span-2">
                        <label className="block text-[11px] font-black text-slate-300 uppercase mb-4 ml-3">通知承辦人 (To) *</label>
                        <div className="relative"><Users className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input type="text" className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-6 pl-14 font-medium text-white" placeholder="Email, 多筆用逗號隔開" value={formData.notify_to} onChange={(e) => setFormData({...formData, notify_to: e.target.value})} /></div>
                    </div>

                    {/* 通知主管 / 副本 (Cc) - 重新加回 */}
                    <div className="col-span-2">
                        <label className="block text-[11px] font-black text-slate-300 uppercase mb-4 ml-3">通知主管 / 副本 (Cc)</label>
                        <div className="relative"><MailPlus className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} /><input type="text" className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-6 pl-14 font-medium text-white" placeholder="主管或相關人 Email" value={formData.notify_cc} onChange={(e) => setFormData({...formData, notify_cc: e.target.value})} /></div>
                    </div>

                    <div className="col-span-2 p-10 bg-amber-600/5 rounded-[3rem] border border-amber-500/20 mt-2 shadow-inner relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        <div className="flex items-center justify-between mb-8 border-l-4 border-amber-500 pl-5"><h4 className="text-[11px] font-black text-amber-500 uppercase tracking-[0.3em] italic">Automation & Reminder Engine</h4></div>
                        <div className="grid grid-cols-2 gap-10">
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">指定下次提醒日期 (System Reminder)</label><div className="relative"><Bell className="absolute left-5 top-1/2 -translate-y-1/2 text-amber-500" size={18} /><input type="date" style={{ colorScheme: 'dark' }} onClick={handleDateClick} className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-5 pl-14 outline-none focus:ring-2 focus:ring-amber-600/30 transition-all font-black text-white text-lg cursor-pointer" value={formData.next_reminder_date} onChange={(e) => setFormData({...formData, next_reminder_date: e.target.value})} /></div></div>
                            <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-2">排程重複週期</label><select className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-5 outline-none focus:ring-2 focus:ring-amber-600/30 font-black text-white appearance-none cursor-pointer" value={formData.cycle} onChange={(e) => setFormData({...formData, cycle: e.target.value})}><option value="once">單次 (Once)</option><option value="monthly">每月 (Monthly)</option><option value="half-yearly">每半年 (Half-yearly)</option><option value="yearly">每年 (Yearly)</option></select></div>
                        </div>
                    </div>

                    <div className="col-span-2 flex justify-end items-center space-x-6 pt-10 border-t border-slate-800/60">
                        <button onClick={() => router.push('/dashboard/procurements')} className="text-slate-400 font-black uppercase text-xs">取消返回</button>
                        <button onClick={handleUpdate} disabled={loading} className="px-10 py-3.5 bg-amber-600 hover:bg-amber-500 rounded-2xl text-sm font-black text-white flex items-center shadow-lg uppercase tracking-widest">{loading ? <Loader2 className="animate-spin mr-3" size={20} /> : <Save size={20} className="mr-3" />}確認更新</button>
                    </div>
                </div>
            </div>
        </div>
    );
}