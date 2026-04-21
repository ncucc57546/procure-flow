"use client";

import React, { useEffect, useState } from 'react';
import { createClient, User as SupabaseUser } from '@supabase/supabase-js';
import {
    Calendar,
    FileText,
    Plus,
    Settings,
    User,
    LogOut,
    Mail,
    Loader2
} from 'lucide-react';

// ==========================================
// 初始化 Supabase Client
// ==========================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ==========================================
// 導航按鈕組件 (移至元件外部宣告以避免 ESLint 錯誤)
// ==========================================
interface NavItemProps {
    href: string;
    icon: React.ElementType;
    label: string;
    currentPath: string;
    exact?: boolean;
}

const NavItem = ({ href, icon: Icon, label, currentPath, exact = false }: NavItemProps) => {
    const isActive = exact
        ? currentPath === href
        : currentPath.startsWith(href);

    return (
        <button
            onClick={() => window.location.href = href}
            className={`w-full flex items-center space-x-3 px-4 py-4 rounded-2xl transition-all duration-300 ${
                isActive
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 translate-x-1'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
        >
            <Icon size={20} />
            <span className="font-bold text-sm tracking-wide">{label}</span>
        </button>
    );
};

export default function DashboardLayout({
                                            children,
                                        }: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [currentPath, setCurrentPath] = useState<string>('');

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                // 未登入則導回登入頁
                window.location.href = '/login';
            } else {
                // 將狀態更新移至非同步回呼中，避免觸發 ESLint cascading renders 錯誤
                setCurrentPath(window.location.pathname);
                setUser(session.user);
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        window.location.href = '/';
    };

    // 驗證中的全螢幕載入動畫
    if (loading) {
        return (
            <div className="h-screen bg-slate-950 flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                    <Loader2 className="text-blue-500 animate-spin" size={64} />
                    <div className="absolute inset-0 blur-xl bg-blue-500/20 animate-pulse"></div>
                </div>
                <div className="text-center">
                    <p className="text-slate-300 font-black tracking-[0.2em] uppercase text-sm">Verifying Session</p>
                    <p className="text-slate-500 text-xs mt-2">正在驗證您的存取權限...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
            {/* ========================================== */}
            {/* 側邊導覽 (Sidebar)                           */}
            {/* ========================================== */}
            <aside className="w-80 bg-slate-900/60 border-r border-slate-800 p-8 flex flex-col shrink-0 backdrop-blur-md z-10 relative">
                <div className="mb-14 flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-700 rounded-2xl flex items-center justify-center shadow-2xl ring-1 ring-white/10">
                        <Mail size={26} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter text-white">ProcureFlow</h1>
                        <p className="text-[10px] text-blue-500 font-black uppercase tracking-[0.3em]">Smart Scheduler</p>
                    </div>
                </div>

                <nav className="flex-1 space-y-3">
                    <NavItem href="/dashboard" icon={Calendar} label="控制儀表板" currentPath={currentPath} exact />
                    <NavItem href="/dashboard/procurements" icon={FileText} label="採購行程管理" currentPath={currentPath} exact />
                    <NavItem href="/dashboard/vendors" icon={Plus} label="廠商資料管理" currentPath={currentPath} exact />
                    <NavItem href="/dashboard/settings" icon={Settings} label="系統參數設定" currentPath={currentPath} exact />
                </nav>

                {/* 使用者狀態與登出 */}
                <div className="mt-auto">
                    <div className="p-6 bg-slate-800/40 rounded-3xl border border-slate-800/60 backdrop-blur-sm">
                        <div className="flex flex-col space-y-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center ring-2 ring-blue-500/30 shrink-0">
                                    <User size={20} className="text-blue-400" />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-black truncate text-slate-100">管理員身份</p>
                                    <p className="text-[10px] text-slate-500 truncate font-mono">
                                        {user?.email || user?.id.slice(0, 8)}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleSignOut}
                                className="w-full flex items-center justify-center space-x-2 py-2 bg-slate-900 hover:bg-red-900/20 hover:text-red-400 text-slate-500 rounded-xl text-[10px] font-black uppercase transition-all border border-slate-800"
                            >
                                <LogOut size={12} />
                                <span>登出系統</span>
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* ========================================== */}
            {/* 主要內容區塊 (Main Content)                   */}
            {/* ========================================== */}
            <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900/20 via-slate-950 to-slate-950">
                {children}
            </main>
        </div>
    );
}