"use client";

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Mail, Lock, Loader2, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';

// ==========================================
// 初始化 Supabase Client
// ==========================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function LoginPage() {
    const [isSignUp, setIsSignUp] = useState<boolean>(false);
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // 處理登入或註冊邏輯
    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!email || !password) {
            setErrorMsg('請完整填寫信箱與密碼。');
            return;
        }

        setLoading(true);

        try {
            if (isSignUp) {
                // 註冊邏輯
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;

                alert('註冊成功！請查看您的信箱以完成驗證，或直接登入。');
                setIsSignUp(false); // 註冊後切換回登入模式
            } else {
                // 登入邏輯
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;

                // 登入成功，導向至 Dashboard
                window.location.href = '/dashboard';
            }
        } catch (err) {
            if (err instanceof Error) {
                setErrorMsg(err.message);
            } else {
                setErrorMsg('發生未知的錯誤，請稍後再試。');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 flex flex-col items-center justify-center p-6">

            {/* 返回首頁按鈕 */}
            <button
                onClick={() => window.location.href = '/'}
                className="absolute top-8 left-8 text-slate-500 hover:text-slate-300 text-sm font-black uppercase tracking-widest transition-colors"
            >
                ← 返回首頁
            </button>

            <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-10 rounded-[2.5rem] shadow-2xl">

                {/* 頂部 Logo 與標題 */}
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <ShieldCheck size={32} className="text-blue-500" />
                    </div>
                    <h2 className="text-3xl font-black text-white tracking-tight mb-2">
                        {isSignUp ? '建立企業帳號' : '登入控制台'}
                    </h2>
                    <p className="text-xs text-slate-500 font-mono tracking-widest uppercase">
                        Secure Authentication
                    </p>
                </div>

                {/* 錯誤訊息提示區塊 */}
                {errorMsg && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-3">
                        <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-400 font-medium leading-relaxed">{errorMsg}</p>
                    </div>
                )}

                {/* 登入/註冊表單 */}
                <form onSubmit={handleAuth} className="space-y-6">

                    <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-2">
                            電子信箱 Email
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="email"
                                required
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition-all placeholder:text-slate-700 font-medium"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-2">
                            密碼 Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="password"
                                required
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition-all placeholder:text-slate-700 font-medium"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 mt-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <>
                                <span>{isSignUp ? '註冊帳號' : '確認登入'}</span>
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                {/* 切換註冊 / 登入 */}
                <div className="mt-8 text-center border-t border-slate-800/60 pt-6">
                    <p className="text-sm text-slate-400">
                        {isSignUp ? '已經有帳號了嗎？' : '還沒有企業帳號？'}
                        <button
                            type="button"
                            onClick={() => {
                                setIsSignUp(!isSignUp);
                                setErrorMsg(null); // 切換時清除錯誤訊息
                            }}
                            className="ml-2 text-blue-500 font-bold hover:text-blue-400 transition-colors focus:outline-none"
                        >
                            {isSignUp ? '返回登入' : '立即註冊'}
                        </button>
                    </p>
                </div>

            </div>
        </div>
    );
}