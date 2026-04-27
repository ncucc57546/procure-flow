"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createClient, User as SupabaseUser } from '@supabase/supabase-js';
import {
    FileText,
    Search,
    Trash2,
    Loader2,
    ChevronRight,
    Plus,
    AlertCircle, 
    Edit2,
    CheckCircle2
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// ==========================================
// 1. 強型別定義 (Strict Typing)
// ==========================================
interface Vendor {
    name: string;
}

interface ProcurementItem {
    id: string;
    title: string;
    description: string;
    budget: number;
    currency: string;
    current_vendor_id: string | null;
    vendors: Vendor | null;
    start_date: string | null;
    end_date: string | null;
    cycle: string;
    reminder_days_before: number;
    next_reminder_date: string | null;
    is_active: boolean;
    is_completed: boolean; // [新增] 完成狀態註記
    creator_id: string;
    created_at: string;
}

// ==========================================
// 2. 初始化 Supabase Client
// ==========================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ProcurementsListPage() {
    const router = useRouter();
    const [procurements, setProcurements] = useState<ProcurementItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [user, setUser] = useState<SupabaseUser | null>(null);

    // ==========================================
    // 3. 資料獲取邏輯
    // ==========================================
    const fetchProcurements = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('procurement_items')
                .select(`
                  *,
                  vendors ( name )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProcurements((data as ProcurementItem[]) || []);
        } catch (err) {
            if (err instanceof Error) {
                console.error('資料讀取失敗:', err.message);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const initApp = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setUser(session.user);
                fetchProcurements();
            } else {
                setLoading(false);
            }
        };

        initApp();

        // 訂閱資料庫變更以實現即時更新
        const channel = supabase
            .channel('public:procurement_items_list')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'procurement_items' },
                () => {
                    fetchProcurements();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchProcurements]);

    // ==========================================
    // 4. 業務邏輯 (狀態計算、切換完成、刪除)
    // ==========================================
    
    // [核心邏輯] 依據您的需求判斷狀態
    const getProcurementStatus = (item: ProcurementItem) => {
        if (item.is_completed) {
            return { label: '已完成', style: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' };
        }
        
        if (!item.next_reminder_date) {
            return { label: '未排程', style: 'bg-slate-800 text-slate-400 border border-slate-700' };
        }

        const today = new Date().toISOString().split('T')[0];
        
        if (today < item.next_reminder_date) {
            return { label: '尚未開始', style: 'bg-slate-800 text-slate-300 border border-slate-700' };
        } else {
            return { label: '進行中', style: 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]' };
        }
    };

    // 切換完成狀態 (Optimistic UI Update)
    const handleToggleComplete = async (id: string, currentStatus: boolean, creator_id: string) => {
        if (!user || user.id !== creator_id) {
            alert('安全性限制：您無權修改他人的採購項目狀態。');
            return;
        }

        const newStatus = !currentStatus;

        // 1. 先在前端樂觀更新畫面，讓使用者感覺瞬間完成
        setProcurements(prev => 
            prev.map(item => item.id === id ? { ...item, is_completed: newStatus } : item)
        );

        // 2. 背景發送 API 請求更新資料庫
        try {
            const { error } = await supabase
                .from('procurement_items')
                .update({ is_completed: newStatus })
                .eq('id', id);
                
            if (error) throw error;
        } catch (err) {
            // 如果失敗，則把狀態還原並報錯
            setProcurements(prev => 
                prev.map(item => item.id === id ? { ...item, is_completed: currentStatus } : item)
            );
            if (err instanceof Error) alert('狀態更新失敗: ' + err.message);
        }
    };

    const handleDelete = async (id: string, creator_id: string) => {
        if (!user || user.id !== creator_id) {
            alert('安全性限制：您無權刪除他人的採購項目。');
            return;
        }

        if (!confirm('確定要永久刪除這筆採購計畫嗎？')) return;

        try {
            const { error } = await supabase.from('procurement_items').delete().eq('id', id);
            if (error) throw error;
            setProcurements(prev => prev.filter(item => item.id !== id));
        } catch (err) {
            if (err instanceof Error) alert('刪除失敗: ' + err.message);
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

    const filteredProcurements = procurements.filter(item => {
        const searchLower = searchQuery.toLowerCase();
        const titleMatch = item.title?.toLowerCase().includes(searchLower);
        const vendorMatch = item.vendors?.name?.toLowerCase().includes(searchLower);
        return titleMatch || vendorMatch;
    });

    return (
        <div className="max-w-6xl mx-auto p-12">
            {/* 頂部標題與搜尋 */}
            <header className="flex justify-between items-end mb-14">
                <div>
                    <nav className="flex items-center space-x-2 text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">
                        <span>Enterprise</span>
                        <ChevronRight size={10} />
                        <span className="text-blue-500">Procurements</span>
                        <ChevronRight size={10} />
                        <span className="text-slate-400">List</span>
                    </nav>
                    <h2 className="text-5xl font-black text-white tracking-tighter">
                        行程清單
                    </h2>
                </div>

                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="搜尋案號或廠商名稱..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 w-80 transition-all placeholder:text-slate-600 font-medium text-white"
                        />
                    </div>
                </div>
            </header>

            {/* 清單表格 */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl backdrop-blur-md">
                <div className="p-10 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <div className="flex items-center">
                        <h3 className="font-black text-2xl flex items-center tracking-tight text-white">
                            <FileText className="mr-4 text-blue-500" size={28} /> 全域採購清單
                        </h3>
                        <span className="ml-4 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-mono">
                            Total: {filteredProcurements.length}
                        </span>
                    </div>
                    <button
                        onClick={() => window.location.href = '/dashboard/procurements/create'}
                        className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 flex items-center text-white"
                    >
                        <Plus size={16} className="mr-2" />
                        建立新行程
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-800/50 text-[11px] font-black text-slate-500 uppercase tracking-[0.25em]">
                                <th className="px-12 py-8">標題案號</th>
                                <th className="px-8 py-8 text-right">預算編列</th>
                                <th className="px-10 py-8">進度狀態 / 廠商</th>
                                <th className="px-12 py-8 text-right">管理操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                            {filteredProcurements.map(item => {
                                const status = getProcurementStatus(item);
                                const isCreator = user?.id === item.creator_id;

                                return (
                                    <tr key={item.id} className="hover:bg-blue-600/[0.02] transition-colors group">
                                        
                                        {/* 標題與 ID */}
                                        <td className="px-12 py-8">
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-2 h-2 rounded-full ${item.is_completed ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'}`}></div>
                                                <div className={`font-black text-lg transition-colors tracking-tight ${item.is_completed ? 'text-slate-400 line-through' : 'text-slate-100 group-hover:text-blue-400'}`}>
                                                    {item.title}
                                                </div>
                                            </div>
                                            <div className="text-[10px] text-slate-600 mt-2 font-mono flex items-center space-x-2 pl-5">
                                                <span>ID: {item.id.slice(0, 8).toUpperCase()}</span>
                                                <span>•</span>
                                                <span className={item.next_reminder_date ? 'text-blue-400/70' : ''}>
                                                    提醒日: {item.next_reminder_date || '未設定'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* 預算 */}
                                        <td className="px-8 py-8 text-right">
                                            <span className="font-mono font-black text-sm text-slate-200 bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-800/60 shadow-inner block w-max ml-auto">
                                                {item.currency} {item.budget.toLocaleString()}
                                            </span>
                                        </td>

                                        {/* 狀態與廠商 (Switch Button & Status) */}
                                        <td className="px-10 py-8">
                                            <div className="flex flex-col space-y-3">
                                                <div className="flex items-center space-x-3">
                                                    {/* Tailwind 自製 Switch Toggle */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleComplete(item.id, item.is_completed, item.creator_id)}
                                                        disabled={!isCreator}
                                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
                                                            item.is_completed ? 'bg-emerald-500' : 'bg-slate-700'
                                                        } ${!isCreator && 'opacity-50 cursor-not-allowed'}`}
                                                    >
                                                        <span className="sr-only">Toggle Complete</span>
                                                        <span
                                                            aria-hidden="true"
                                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                                item.is_completed ? 'translate-x-5' : 'translate-x-0'
                                                            }`}
                                                        />
                                                    </button>

                                                    {/* 動態狀態 Badge */}
                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md ${status.style}`}>
                                                        {status.label}
                                                    </span>
                                                </div>

                                                <span className="text-sm font-bold text-slate-400 flex items-center">
                                                    {item.vendors?.name || '未指定廠商'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* 操作按鈕 */}
                                        <td className="px-12 py-8 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button
                                                    onClick={() => router.push(`/dashboard/procurements/${item.id}/edit`)}
                                                    className="p-3 hover:bg-slate-800 rounded-2xl text-slate-500 hover:text-amber-400 transition-all border border-transparent hover:border-slate-700"
                                                    title="編輯計畫"
                                                >
                                                    <Edit2 size={18}/>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id, item.creator_id)}
                                                    className={`p-3 rounded-2xl transition-all border border-transparent ${
                                                        isCreator
                                                            ? 'hover:bg-slate-800 text-slate-500 hover:text-red-400 hover:border-slate-700'
                                                            : 'opacity-30 cursor-not-allowed text-slate-600'
                                                    }`}
                                                    title={isCreator ? "刪除計畫" : "無權限刪除"}
                                                >
                                                    <Trash2 size={18}/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}

                            {filteredProcurements.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-12 py-24 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-4">
                                            <AlertCircle size={40} className="text-slate-700" />
                                            <p className="text-slate-500 font-bold tracking-widest text-sm">
                                                查無符合條件的採購項目
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}