"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
    Calendar,
    Clock,
    AlertCircle,
    CheckCircle2,
    ExternalLink,
    Loader2,
    ChevronRight
} from 'lucide-react';

// ==========================================
// 1. 強型別定義 (根據真實資料庫結構)
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
    start_date: string | null;
    end_date: string | null;
    cycle: string;
    reminder_days_before: number;
    next_reminder_date: string | null;
    current_vendor_id: string | null;
    vendors: Vendor | null;
    is_active: boolean;
    is_completed: boolean; // [新增] 完成註記欄位
    creator_id: string;
    created_at: string;
}

// ==========================================
// 2. 初始化 Supabase Client
// ==========================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function DashboardOverview() {
    const [procurements, setProcurements] = useState<ProcurementItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    // ==========================================
    // 3. 資料獲取與 Realtime 訂閱
    // ==========================================
    const fetchProcurements = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('procurement_items')
                .select(`*, vendors(name)`)
                // 我們希望依照提醒日期排序，越近的越前面
                .order('next_reminder_date', { ascending: true, nullsFirst: false });

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
        fetchProcurements();

        // 訂閱資料庫變更以實現即時更新
        const channel = supabase
            .channel('public:procurement_items_dashboard')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'procurement_items' },
                () => {
                    // 重新抓取資料以確保取得最新狀態與關聯的廠商名稱
                    fetchProcurements();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchProcurements]);

    // ==========================================
    // 4. 業務指標計算邏輯 (Metrics Calculation)
    // ==========================================
    const todayStr = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear().toString();

    // 指標 A: 進行中計畫 (所有未完成的項目)
    const activeProcurements = procurements.filter(p => !p.is_completed);

    // 指標 B: 待處理急件 (未完成，且已到達或超過系統提醒日)
    const urgentProcurements = activeProcurements.filter(p =>
        p.next_reminder_date && p.next_reminder_date <= todayStr
    );

    // 指標 C: 年度達成率 (以 start_date 在今年度為基準)
    const thisYearProcurements = procurements.filter(p =>
        p.start_date && p.start_date.startsWith(currentYear)
    );
    // 達成定義改為 is_completed === true
    const completedThisYear = thisYearProcurements.filter(p => p.is_completed); 
    const totalThisYearCount = thisYearProcurements.length;
    const achievementRate = totalThisYearCount === 0
        ? 0
        : Math.round((completedThisYear.length / totalThisYearCount) * 100);

    // 畫面下方的近期清單 (取最接近提醒日的 4 筆「未完成」案件)
    const recentProcurements = activeProcurements.slice(0, 4);

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
        <div className="max-w-6xl mx-auto p-12">
            {/* 頂部標題 */}
            <header className="flex justify-between items-end mb-14">
                <div>
                    <nav className="flex items-center space-x-2 text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">
                        <span>Enterprise</span>
                        <ChevronRight size={10} />
                        <span className="text-blue-500">Core Engine</span>
                        <ChevronRight size={10} />
                        <span className="text-slate-400">Dashboard</span>
                    </nav>
                    <h2 className="text-5xl font-black text-white tracking-tighter">
                        採購總覽
                    </h2>
                </div>
            </header>

            {/* 數據統計圖卡 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                <StatCard
                    title="待推進計畫"
                    value={activeProcurements.length.toString()}
                    subText="Active Tasks"
                    icon={Clock}
                    color="blue"
                />
                <StatCard
                    title="待處辦急件"
                    value={urgentProcurements.length.toString()}
                    subText="Action Required"
                    icon={AlertCircle}
                    color="amber"
                />
                <StatCard
                    title={`${currentYear} 年度達成率`}
                    value={`${achievementRate}%`}
                    subText={`已完成 ${completedThisYear.length} / ${totalThisYearCount} 筆`}
                    icon={CheckCircle2}
                    color="emerald"
                />
            </div>

            {/* 近期採購期限列表 */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[3rem] p-12 backdrop-blur-xl shadow-2xl">
                <div className="flex justify-between items-center mb-10">
                    <h3 className="text-2xl font-black flex items-center tracking-tight text-white">
                        <Calendar className="mr-4 text-blue-500" size={28} /> 近期排程提醒
                    </h3>
                    <button
                        onClick={() => window.location.href = '/dashboard/procurements'}
                        className="text-xs font-black text-blue-500 hover:text-blue-400 flex items-center space-x-2 tracking-widest uppercase transition-colors"
                    >
                        <span>檢視全部清單</span> <ExternalLink size={14} />
                    </button>
                </div>

                {recentProcurements.length === 0 ? (
                    <div className="py-24 text-center">
                        <p className="text-slate-600 font-bold italic">目前沒有尚未完成的採購紀錄</p>
                        <button
                            onClick={() => window.location.href = '/dashboard/procurements/create'}
                            className="mt-6 px-8 py-3 bg-slate-800 hover:bg-slate-700 rounded-2xl text-xs font-black uppercase transition-all text-white"
                        >
                            開始建立計畫
                        </button>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {recentProcurements.map(item => {
                            // 判定單筆是否為急件 (已超過或等於今日的未完成案件)
                            const isUrgent = item.next_reminder_date && item.next_reminder_date <= todayStr;

                            return (
                                <div key={item.id} onClick={() => window.location.href = `/dashboard/procurements/${item.id}/edit`} className="group flex items-center justify-between p-7 bg-slate-950/40 rounded-[2rem] border border-slate-800 hover:border-blue-500/40 transition-all cursor-pointer">
                                    <div className="flex items-center space-x-6">
                                        <div className={`w-2.5 h-16 rounded-full transition-all ${isUrgent ? 'bg-amber-500 shadow-lg shadow-amber-500/20' : 'bg-blue-600 shadow-lg shadow-blue-600/20'}`}></div>
                                        <div>
                                            <h4 className="font-black text-xl text-slate-100 group-hover:text-blue-400 transition-colors">{item.title}</h4>
                                            <p className="text-xs text-slate-500 mt-1 font-bold">
                                                {item.vendors?.name || '未指定廠商或內部處理'} •
                                                <span className="text-slate-400 ml-1">排定結案: {item.end_date || '未設定'}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isUrgent ? 'text-amber-500 animate-pulse' : 'text-slate-600'}`}>
                                            {isUrgent ? '已達提醒日' : '下次提醒日'}
                                        </p>
                                        <p className={`text-2xl font-mono font-black tracking-tighter ${isUrgent ? 'text-white' : 'text-blue-500'}`}>
                                            {item.next_reminder_date || '未排程'}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ==========================================
// 6. 數據統計圖卡組件 (StatCard)
// ==========================================
interface StatCardProps {
    title: string;
    value: string;
    subText: string;
    color: 'blue' | 'amber' | 'emerald';
    icon: React.ElementType;
}

const StatCard = ({ title, value, subText, color, icon: Icon }: StatCardProps) => {
    const colorMap = {
        blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20 shadow-blue-500/5',
        amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20 shadow-amber-500/5',
        emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/5'
    };

    return (
        <div className={`bg-slate-900/60 border p-10 rounded-[3rem] transition-all duration-500 hover:scale-[1.03] shadow-2xl group ${colorMap[color]}`}>
            <div className="flex justify-between items-start mb-8">
                <div className={`p-4 rounded-2xl bg-slate-950/80 border border-white/5 shadow-xl transition-transform duration-500 group-hover:rotate-6`}>
                    <Icon size={30} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] opacity-30 tracking-tighter italic">
                    Live Data
                </span>
            </div>
            <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em]">{title}</p>
            <div className="flex items-baseline mt-3">
                <h3 className="text-6xl font-black tracking-tighter text-white group-hover:text-blue-500 transition-colors">{value}</h3>
                <span className="text-xs font-bold text-slate-500 ml-4 uppercase tracking-widest bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                    {subText}
                </span>
            </div>
        </div>
    );
};