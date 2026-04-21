"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Loader2, ShieldCheck, ArrowRight } from 'lucide-react';

// ==========================================
// 初始化 Supabase Client
// ==========================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function HomePage() {
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // 檢查使用者登入狀態
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // 如果已經登入，直接跳轉到 Dashboard
        window.location.href = '/dashboard';
      } else {
        // 如果未登入，停止載入動畫，顯示歡迎與登入按鈕
        setIsChecking(false);
      }
    };

    checkAuth();
  }, []);

  // 檢查狀態中的載入畫面
  if (isChecking) {
    return (
        <div className="h-screen bg-slate-950 flex flex-col items-center justify-center">
          <div className="relative mb-6">
            <Loader2 className="text-blue-500 animate-spin" size={56} />
            <div className="absolute inset-0 blur-xl bg-blue-500/20 animate-pulse"></div>
          </div>
          <p className="text-slate-400 font-mono text-sm tracking-widest animate-pulse uppercase">
            Authenticating...
          </p>
        </div>
    );
  }

  // 未登入時的歡迎首頁
  return (
      <div className="h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-12 rounded-[3rem] shadow-2xl text-center transform transition-all hover:scale-[1.01] hover:border-slate-700">
          <div className="w-24 h-24 bg-blue-600/10 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3">
            <ShieldCheck size={48} className="text-blue-500 -rotate-3" />
          </div>

          <h1 className="text-4xl font-black text-white tracking-tighter mb-4">
            ProcureFlow
          </h1>
          <p className="text-blue-500 font-black text-[10px] uppercase tracking-[0.3em] mb-8">
            Enterprise Smart Scheduler
          </p>

          <p className="text-slate-400 mb-10 text-sm leading-relaxed font-medium">
            自動化採購排程與信件提醒系統。<br/>請登入以存取您的企業控制台與管理清單。
          </p>

          <button
              onClick={() => window.location.href = '/login'}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-3 shadow-lg shadow-blue-600/20 hover:shadow-blue-500/40"
          >
            <span>進入系統登入頁</span>
            <ArrowRight size={18} />
          </button>
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-600 text-xs font-mono">
            Secure Access Required &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
  );
}