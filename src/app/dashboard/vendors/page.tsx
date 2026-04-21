"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createClient, User as SupabaseUser } from '@supabase/supabase-js';
import {
    Building2,
    Plus,
    Trash2,
    Loader2,
    ChevronRight,
    AlertCircle,
    User,
    Mail,
    Phone,
    MapPin
} from 'lucide-react';

// ==========================================
// 1. 強型別定義 (對應資料庫結構)
// ==========================================
interface Vendor {
    id: string;
    name: string;
    contact_name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    created_at: string;
}

interface VendorFormData {
    name: string;
    contact_name: string;
    email: string;
    phone: string;
    address: string;
}

// ==========================================
// 2. 初始化 Supabase Client
// ==========================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function VendorsManagementPage() {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [adding, setAdding] = useState<boolean>(false);

    // 表單狀態
    const [formData, setFormData] = useState<VendorFormData>({
        name: '',
        contact_name: '',
        email: '',
        phone: '',
        address: ''
    });

    const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);

    // ==========================================
    // 3. 資料獲取邏輯
    // ==========================================
    const fetchVendors = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('vendors')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setVendors(data || []);
        } catch (err) {
            console.error('獲取廠商資料失敗:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const initApp = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setCurrentUser(session.user);
                fetchVendors();
            } else {
                setLoading(false);
                window.location.href = '/login';
            }
        };
        initApp();
    }, [fetchVendors]);

    // ==========================================
    // 4. 業務邏輯 (新增與刪除)
    // ==========================================
    const handleAddVendor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            alert('廠商名稱為必填項目！');
            return;
        }

        setAdding(true);
        try {
            const newVendorData = {
                name: formData.name.trim(),
                contact_name: formData.contact_name.trim() || null,
                email: formData.email.trim() || null,
                phone: formData.phone.trim() || null,
                address: formData.address.trim() || null,
            };

            const { data, error } = await supabase
                .from('vendors')
                .insert([newVendorData])
                .select()
                .single();

            if (error) throw error;

            // 更新畫面
            setVendors(prev => [data, ...prev]);

            // 清空表單
            setFormData({
                name: '',
                contact_name: '',
                email: '',
                phone: '',
                address: ''
            });
        } catch (err) {
            if (err instanceof Error) alert('新增廠商失敗: ' + err.message);
        } finally {
            setAdding(false);
        }
    };

    const handleDeleteVendor = async (id: string) => {
        if (!confirm('確定要刪除此廠商嗎？\n注意：如果已有採購案關聯此廠商，可能會導致資料顯示異常。')) return;

        try {
            const { error } = await supabase.from('vendors').delete().eq('id', id);
            if (error) throw error;

            setVendors(prev => prev.filter(v => v.id !== id));
        } catch (err) {
            if (err instanceof Error) alert('刪除廠商失敗: ' + err.message);
        }
    };

    // ==========================================
    // 5. 畫面渲染
    // ==========================================
    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="text-blue-500 animate-spin" size={48} />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-12">
            {/* 頂部導覽列 */}
            <header className="mb-14">
                <nav className="flex items-center space-x-2 text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">
                    <span>Enterprise</span>
                    <ChevronRight size={10} />
                    <span className="text-blue-500">Core Engine</span>
                    <ChevronRight size={10} />
                    <span className="text-slate-400">Vendors</span>
                </nav>
                <h2 className="text-5xl font-black text-white tracking-tighter">
                    協力廠商管理
                </h2>
            </header>

            <div className="bg-slate-900/40 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl backdrop-blur-md">

                {/* 新增廠商區塊 */}
                <div className="p-10 border-b border-slate-800 bg-slate-900/60">
                    <h3 className="font-black text-xl flex items-center tracking-tight text-white mb-8">
                        <Building2 className="mr-3 text-blue-500" size={24} /> 新增協力廠商資料
                    </h3>

                    <form onSubmit={handleAddVendor} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* 廠商名稱 (必填) */}
                            <div className="md:col-span-2">
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">
                                    公司 / 廠商名稱 <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="例如：蘋果股份有限公司"
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-bold text-white placeholder:text-slate-600"
                                    />
                                </div>
                            </div>

                            {/* 聯絡人 */}
                            <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">
                                    主要聯絡人
                                </label>
                                <div className="relative">
                                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="姓名或職稱"
                                        value={formData.contact_name}
                                        onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium text-white placeholder:text-slate-600"
                                    />
                                </div>
                            </div>

                            {/* 電話 */}
                            <div>
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">
                                    連絡電話
                                </label>
                                <div className="relative">
                                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="市話或手機"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium text-white placeholder:text-slate-600"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div className="md:col-span-2">
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">
                                    電子信箱 Email
                                </label>
                                <div className="relative">
                                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="email"
                                        placeholder="contact@company.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium text-white placeholder:text-slate-600"
                                    />
                                </div>
                            </div>

                            {/* 地址 */}
                            <div className="md:col-span-2">
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">
                                    公司地址
                                </label>
                                <div className="relative">
                                    <MapPin size={18} className="absolute left-4 top-4 text-slate-500" />
                                    <textarea
                                        rows={2}
                                        placeholder="輸入完整公司地址..."
                                        value={formData.address}
                                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium text-white placeholder:text-slate-600 resize-none"
                                    />
                                </div>
                            </div>

                        </div>

                        {/* 提交按鈕 */}
                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={adding || !formData.name.trim()}
                                className="px-10 py-4 bg-blue-600 hover:bg-blue-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 flex items-center text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {adding ? <Loader2 size={18} className="animate-spin mr-2" /> : <Plus size={18} className="mr-2" />}
                                {adding ? '新增中...' : '建立廠商檔案'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* 廠商列表區塊 */}
                <div className="p-10">
                    <div className="flex justify-between items-center mb-8">
                        <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                            已建立的廠商清單 ({vendors.length})
                        </h4>
                    </div>

                    {vendors.length === 0 ? (
                        <div className="py-16 text-center bg-slate-950/30 rounded-3xl border border-slate-800/50 border-dashed">
                            <AlertCircle size={32} className="mx-auto text-slate-700 mb-4" />
                            <p className="text-slate-500 font-bold tracking-widest text-sm">尚無廠商資料，請從上方新增</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {vendors.map(vendor => (
                                <div key={vendor.id} className="relative p-6 bg-slate-950/50 border border-slate-800 rounded-3xl hover:border-blue-500/30 transition-all group overflow-hidden">

                                    {/* 裝飾背景光 */}
                                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors pointer-events-none"></div>

                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-800 group-hover:bg-blue-600/10 group-hover:border-blue-500/30 transition-all shrink-0">
                                                <Building2 size={20} className="text-slate-500 group-hover:text-blue-400" />
                                            </div>
                                            <div>
                                                <h5 className="font-bold text-lg text-slate-200 tracking-tight">{vendor.name}</h5>
                                                <p className="text-[10px] text-slate-600 font-mono mt-0.5">ID: {vendor.id.slice(0, 8).toUpperCase()}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteVendor(vendor.id)}
                                            className="p-2.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                                            title="刪除廠商"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {/* 聯絡資訊細節 */}
                                    <div className="space-y-3 mt-6 pt-6 border-t border-slate-800/60">
                                        {vendor.contact_name && (
                                            <div className="flex items-center text-sm text-slate-400">
                                                <User size={14} className="mr-3 text-slate-600 shrink-0" />
                                                <span className="truncate">{vendor.contact_name}</span>
                                            </div>
                                        )}
                                        {vendor.phone && (
                                            <div className="flex items-center text-sm text-slate-400">
                                                <Phone size={14} className="mr-3 text-slate-600 shrink-0" />
                                                <span className="truncate font-mono text-[13px]">{vendor.phone}</span>
                                            </div>
                                        )}
                                        {vendor.email && (
                                            <div className="flex items-center text-sm text-slate-400">
                                                <Mail size={14} className="mr-3 text-slate-600 shrink-0" />
                                                <span className="truncate">{vendor.email}</span>
                                            </div>
                                        )}
                                        {vendor.address && (
                                            <div className="flex items-start text-sm text-slate-400">
                                                <MapPin size={14} className="mr-3 text-slate-600 shrink-0 mt-0.5" />
                                                <span className="line-clamp-2 leading-relaxed">{vendor.address}</span>
                                            </div>
                                        )}

                                        {/* 如果沒有填寫任何聯絡資訊 */}
                                        {!vendor.contact_name && !vendor.phone && !vendor.email && !vendor.address && (
                                            <p className="text-xs text-slate-600 italic">尚未建立詳細聯絡資訊</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}