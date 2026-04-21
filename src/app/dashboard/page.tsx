"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createClient, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
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
// 1. 強型別定義
// ==========================================
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
    vendor: string;
    status: 'active' | 'urgent' | 'completed';
    creator_id: string;
    created_at?: string;
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
                .select('*')
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
        fetchProcurements();

        // 訂閱資料庫變更以實現即時更新
        const channel = supabase
            .channel('public:procurement_items_dashboard')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'procurement_items' },
                (payload: RealtimePostgresChangesPayload<ProcurementItem>) => {
                    if (payload.eventType === 'INSERT') {
                        setProcurements(prev => [payload.new as ProcurementItem, ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        setProcurements(prev => prev.map(item => item.id === payload.new.id ? payload.new as ProcurementItem : item));
                    } else if (payload.eventType === 'DELETE') {
                        setProcurements(prev => prev.filter(item => item.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchProcurements]);

    // ==========================================
    // 4. 畫面渲染
    // ==========================================
    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="text-blue-500 animate-spin" size={48} />
            </div>
        );
    }

    // 取得前四筆最新的或最緊急的採購項目
    const recentProcurements = procurements.slice(0, 4);

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
                    title="進行中計畫"
                    value={procurements.length.toString()}
                    icon={Clock}
                    color="blue"
                />
                <StatCard
                    title="待處辦急件"
                    value={procurements.filter(p => p.status === 'urgent').length.toString()}
                    icon={AlertCircle}
                    color="amber"
                />
                <StatCard
                    title="年度達成率"
                    value="92%"
                    icon={CheckCircle2}
                    color="emerald"
                />
            </div>

            {/* 近期採購期限列表 */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-[3rem] p-12 backdrop-blur-xl shadow-2xl">
                <div className="flex justify-between items-center mb-10">
                    <h3 className="text-2xl font-black flex items-center tracking-tight">
                        <Calendar className="mr-4 text-blue-500" size={28} /> 近期採購期限
                    </h3>
                    <button
                        onClick={() => window.location.href = '/dashboard/procurements'}
                        className="text-xs font-black text-blue-500 hover:text-blue-400 flex items-center space-x-2 tracking-widest uppercase transition-colors"
                    >
                        <span>檢視全部</span> <ExternalLink size={14} />
                    </button>
                </div>

                {recentProcurements.length === 0 ? (
                    <div className="py-24 text-center">
                        <p className="text-slate-600 font-bold italic">目前資料庫尚無採購紀錄</p>
                        <button
                            onClick={() => window.location.href = '/dashboard/procurements/create'}
                            className="mt-6 px-8 py-3 bg-slate-800 hover:bg-slate-700 rounded-2xl text-xs font-black uppercase transition-all text-white"
                        >
                            開始新增
                        </button>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {recentProcurements.map(item => (
                            <div key={item.id} className="group flex items-center justify-between p-7 bg-slate-950/40 rounded-[2rem] border border-slate-800 hover:border-blue-500/40 transition-all cursor-pointer">
                                <div className="flex items-center space-x-6">
                                    <div className={`w-2.5 h-16 rounded-full ${item.status === 'urgent' ? 'bg-amber-500 shadow-lg shadow-amber-500/20' : 'bg-blue-600 shadow-lg shadow-blue-600/20'}`}></div>
                                    <div>
                                        <h4 className="font-black text-xl text-slate-100 group-hover:text-blue-400 transition-colors">{item.title}</h4>
                                        <p className="text-xs text-slate-500 mt-1 font-bold">
                                            {item.vendor || '內部採購'} • <span className="text-slate-400">{item.end_date || '未定截止日'}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">前置提醒</p>
                                    <p className="text-3xl font-mono font-black text-blue-500 tracking-tighter">
                                        {item.reminder_days_before} <span className="text-lg">天</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ==========================================
// 5. 數據統計圖卡組件 (StatCard)
// ==========================================
interface StatCardProps {
    title: string;
    value: string;
    color: 'blue' | 'amber' | 'emerald';
    icon: React.ElementType;
}

const StatCard = ({ title, value, color, icon: Icon }: StatCardProps) => {
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
                <span className="text-[10px] font-black uppercase tracking-[0.25em] opacity-30 tracking-tighter italic">Status: Secure</span>
            </div>
            <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.25em]">{title}</p>
            <div className="flex items-baseline mt-3">
                <h3 className="text-6xl font-black tracking-tighter text-white group-hover:text-blue-500 transition-colors">{value}</h3>
                <span className="text-xs font-bold text-slate-600 ml-3 uppercase tracking-widest">Active</span>
            </div>
        </div>
    );
};