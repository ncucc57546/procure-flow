"use client";

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Calendar,
  Mail,
  FileText,
  Search,
  MoreVertical,
  Bell,
  Settings,
  User,
  Trash2,
  Download,
  Paperclip,
  ChevronRight,
  Save,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronDown,
  Loader2,
  LogOut
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

/**
 * ProcureFlow - 採購排程管理系統
 * 修正說明：加入 "use client" 指令以解決 Server Component 無法使用 useState 的問題。
 */

// 定義 Supabase 環境變數（在 Vercel 中設定）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 初始化 Supabase Client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 採購項目資料型別定義
interface ProcurementItem {
  id: string;
  title: string;
  description: string;
  budget: number;
  currency: string;
  start_date: string;
  end_date: string;
  cycle: string;
  reminder_days_before: number;
  vendor: string;
  status: 'active' | 'urgent' | 'completed';
  creator_id: string;
}

export default function App() {
  // 視圖狀態
  const [view, setView] = useState('dashboard');
  const [procurements, setProcurements] = useState<ProcurementItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // 新增行程的表單狀態
  const [formData, setFormData] = useState({
    title: '',
    budget: 0,
    currency: 'TWD',
    cycle: 'yearly',
    reminder_days_before: 30,
    vendor: '',
    description: ''
  });

  // 1. 初始化系統：讀取 Session 與資料
  useEffect(() => {
    const initApp = async () => {
      // 獲取當前用戶狀態
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        await fetchProcurements();
      } else {
        setLoading(false);
      }

      // 監聽 Auth 狀態變化
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });

      return () => subscription.unsubscribe();
    };

    initApp();
  }, []);

  // 2. 從 Supabase 讀取採購數據
  const fetchProcurements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
          .from('procurement_items')
          .select('*')
          .order('created_at', { ascending: false });

      if (error) throw error;
      setProcurements(data || []);
    } catch (err: any) {
      console.error('資料讀取失敗:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. 執行儲存邏輯
  const handleSave = async () => {
    if (!user) {
      alert('請先登入後再進行操作');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
          .from('procurement_items')
          .insert([{
            ...formData,
            creator_id: user.id,
            status: 'active'
          }]);

      if (error) throw error;

      // 重置並回列表
      setFormData({
        title: '', budget: 0, currency: 'TWD', cycle: 'yearly',
        reminder_days_before: 30, vendor: '', description: ''
      });
      await fetchProcurements();
      setView('list');
    } catch (err: any) {
      alert('儲存發生錯誤: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 導航按鈕組件
  const NavItem = ({ id, icon: Icon, label }: { id: string, icon: any, label: string }) => (
      <button
          onClick={() => setView(id)}
          className={`w-full flex items-center space-x-3 px-4 py-4 rounded-2xl transition-all duration-300 ${
              view === id
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 translate-x-1'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
          }`}
      >
        <Icon size={20} />
        <span className="font-bold text-sm tracking-wide">{label}</span>
      </button>
  );

  // 載入畫面
  if (loading && procurements.length === 0) {
    return (
        <div className="h-screen bg-slate-950 flex flex-col items-center justify-center space-y-6">
          <div className="relative">
            <Loader2 className="text-blue-500 animate-spin" size={64} />
            <div className="absolute inset-0 blur-xl bg-blue-500/20 animate-pulse"></div>
          </div>
          <div className="text-center">
            <p className="text-slate-300 font-black tracking-[0.2em] uppercase text-sm">Initializing System</p>
            <p className="text-slate-500 text-xs mt-2">正在同步雲端採購數據庫...</p>
          </div>
        </div>
    );
  }

  return (
      <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
        {/* 側邊導覽 */}
        <aside className="w-80 bg-slate-900/60 border-r border-slate-800 p-8 flex flex-col shrink-0 backdrop-blur-md">
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
            <NavItem id="dashboard" icon={Calendar} label="控制儀表板" />
            <NavItem id="list" icon={FileText} label="採購行程管理" />
            <NavItem id="create" icon={Plus} label="新增採購計畫" />
            <NavItem id="settings" icon={Settings} label="系統參數設定" />
          </nav>

          <div className="mt-auto">
            <div className="p-6 bg-slate-800/40 rounded-3xl border border-slate-800/60 backdrop-blur-sm">
              {!user ? (
                  <button
                      onClick={() => supabase.auth.signInAnonymously()}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20"
                  >
                    快速登入
                  </button>
              ) : (
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center ring-2 ring-blue-500/30">
                        <User size={20} className="text-blue-400" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-black truncate text-slate-100">管理員身份</p>
                        <p className="text-[10px] text-slate-500 truncate font-mono">{user.email || 'Anonymous User'}</p>
                      </div>
                    </div>
                    <button
                        onClick={() => supabase.auth.signOut()}
                        className="w-full flex items-center justify-center space-x-2 py-2 bg-slate-900 hover:bg-red-900/20 hover:text-red-400 text-slate-500 rounded-xl text-[10px] font-black uppercase transition-all border border-slate-800"
                    >
                      <LogOut size={12} />
                      <span>登出系統</span>
                    </button>
                  </div>
              )}
            </div>
          </div>
        </aside>

        {/* 內容區 */}
        <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900/20 via-slate-950 to-slate-950">
          <div className="max-w-6xl mx-auto p-12">
            <header className="flex justify-between items-end mb-14">
              <div>
                <nav className="flex items-center space-x-2 text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3">
                  <span>Enterprise</span>
                  <ChevronRight size={10} />
                  <span className="text-blue-500">Core Engine</span>
                  <ChevronRight size={10} />
                  <span className="text-slate-400">{view}</span>
                </nav>
                <h2 className="text-5xl font-black text-white tracking-tighter">
                  {view === 'dashboard' && '採購總覽'}
                  {view === 'list' && '行程清單'}
                  {view === 'create' && '建立計畫'}
                  {view === 'settings' && '系統設定'}
                </h2>
              </div>

              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                      type="text"
                      placeholder="搜尋採購案號或廠商..."
                      className="bg-slate-900 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 w-80 transition-all placeholder:text-slate-600 font-medium"
                  />
                </div>
                <button className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 hover:text-blue-400 transition-all">
                  <Bell size={22} />
                </button>
              </div>
            </header>

            {/* 看板介面 */}
            {view === 'dashboard' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <StatCard title="進行中計畫" value={procurements.length.toString()} icon={Clock} color="blue" />
                  <StatCard title="待處辦急件" value={procurements.filter(p => p.status === 'urgent').length.toString()} icon={AlertCircle} color="amber" />
                  <StatCard title="年度達成率" value="92%" icon={CheckCircle2} color="emerald" />

                  <div className="md:col-span-2 bg-slate-900/40 border border-slate-800 rounded-[3rem] p-12 backdrop-blur-xl shadow-2xl">
                    <div className="flex justify-between items-center mb-10">
                      <h3 className="text-2xl font-black flex items-center tracking-tight">
                        <Calendar className="mr-4 text-blue-500" size={28} /> 近期採購期限
                      </h3>
                      <button onClick={() => setView('list')} className="text-xs font-black text-blue-500 hover:text-blue-400 flex items-center space-x-2 tracking-widest uppercase">
                        <span>檢視全部</span> <ExternalLink size={14} />
                      </button>
                    </div>

                    {procurements.length === 0 ? (
                        <div className="py-24 text-center">
                          <p className="text-slate-600 font-bold italic">目前資料庫尚無採購紀錄</p>
                          <button onClick={() => setView('create')} className="mt-6 px-8 py-3 bg-slate-800 hover:bg-slate-700 rounded-2xl text-xs font-black uppercase transition-all">開始新增</button>
                        </div>
                    ) : (
                        <div className="space-y-5">
                          {procurements.slice(0, 4).map(item => (
                              <div key={item.id} className="group flex items-center justify-between p-7 bg-slate-950/40 rounded-[2rem] border border-slate-800 hover:border-blue-500/40 transition-all cursor-pointer">
                                <div className="flex items-center space-x-6">
                                  <div className={`w-2.5 h-16 rounded-full ${item.status === 'urgent' ? 'bg-amber-500 shadow-lg shadow-amber-500/20' : 'bg-blue-600 shadow-lg shadow-blue-600/20'}`}></div>
                                  <div>
                                    <h4 className="font-black text-xl text-slate-100 group-hover:text-blue-400 transition-colors">{item.title}</h4>
                                    <p className="text-xs text-slate-500 mt-1 font-bold">{item.vendor} • <span className="text-slate-400">{item.end_date}</span></p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">倒數</p>
                                  <p className="text-3xl font-mono font-black text-blue-500 tracking-tighter">{item.reminder_days_before}D</p>
                                </div>
                              </div>
                          ))}
                        </div>
                    )}
                  </div>
                </div>
            )}

            {/* 行程列表 */}
            {view === 'list' && (
                <div className="bg-slate-900/40 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl backdrop-blur-md">
                  <div className="p-10 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <h3 className="font-black text-2xl flex items-center tracking-tight">
                      <FileText className="mr-4 text-blue-500" size={28} /> 全域採購清單
                    </h3>
                    <button onClick={() => setView('create')} className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20">
                      + 建立新行程
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                      <tr className="border-b border-slate-800/50 text-[11px] font-black text-slate-500 uppercase tracking-[0.25em]">
                        <th className="px-12 py-8">標題案號</th>
                        <th className="px-8 py-8 text-right">預算編列</th>
                        <th className="px-10 py-8">協力廠商</th>
                        <th className="px-12 py-8 text-right">管理操作</th>
                      </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                      {procurements.map(item => (
                          <tr key={item.id} className="hover:bg-blue-600/[0.03] transition-colors group">
                            <td className="px-12 py-8">
                              <div className="font-black text-lg text-slate-100 group-hover:text-blue-400 transition-colors tracking-tight">{item.title}</div>
                              <div className="text-[10px] text-slate-600 mt-1 font-mono">ID: {item.id.slice(0, 8).toUpperCase()}</div>
                            </td>
                            <td className="px-8 py-8 text-right">
                          <span className="font-mono font-black text-sm text-slate-200 bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-800/60 shadow-inner">
                            {item.currency} {item.budget.toLocaleString()}
                          </span>
                            </td>
                            <td className="px-10 py-8 text-sm font-bold text-slate-400">{item.vendor}</td>
                            <td className="px-12 py-8 text-right">
                              <div className="flex items-center justify-end space-x-3">
                                <button className="p-3 hover:bg-slate-800 rounded-2xl text-slate-500 hover:text-blue-400 transition-all border border-transparent hover:border-slate-700"><Mail size={18}/></button>
                                <button className="p-3 hover:bg-slate-800 rounded-2xl text-slate-500 hover:text-red-400 transition-all border border-transparent hover:border-slate-700"><Trash2 size={18}/></button>
                              </div>
                            </td>
                          </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>
                </div>
            )}

            {/* 建立介面 */}
            {view === 'create' && (
                <div className="max-w-4xl mx-auto">
                  <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-14 shadow-2xl relative overflow-hidden backdrop-blur-xl">
                    <div className="flex justify-between items-center mb-14 pb-10 border-b border-slate-800/60">
                      <div>
                        <h3 className="text-3xl font-black tracking-tight">建立新採購計畫</h3>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-2">Create New Execution Plan</p>
                      </div>
                      <div className="flex space-x-4">
                        <button onClick={() => setView('list')} className="px-8 py-3.5 text-slate-500 font-black uppercase tracking-widest text-xs hover:text-slate-300">取消返回</button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="px-12 py-3.5 bg-blue-600 hover:bg-blue-700 rounded-2xl text-sm font-black flex items-center shadow-2xl transition-all disabled:opacity-50 tracking-widest uppercase"
                        >
                          {loading ? <Loader2 className="animate-spin mr-3" size={20} /> : <Save size={20} className="mr-3" />}
                          確認儲存行程
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-12">
                      <div className="col-span-2">
                        <label className="block text-[11px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4 ml-3">採購標題案名</label>
                        <input
                            type="text"
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-6 outline-none focus:ring-4 focus:ring-blue-600/10 transition-all text-xl font-black placeholder:text-slate-800"
                            placeholder="請輸入採購計畫名稱..."
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4 ml-3">核定預算</label>
                        <div className="flex group">
                          <select
                              className="bg-slate-800 border-r-0 border-slate-800 rounded-l-2xl px-6 text-sm font-black focus:outline-none"
                              value={formData.currency}
                              onChange={(e) => setFormData({...formData, currency: e.target.value})}
                          >
                            <option>TWD</option>
                            <option>USD</option>
                          </select>
                          <input
                              type="number"
                              className="w-full bg-slate-950 border border-slate-800 rounded-r-2xl p-6 outline-none focus:ring-4 focus:ring-blue-600/10 transition-all font-black text-lg"
                              value={formData.budget}
                              onChange={(e) => setFormData({...formData, budget: parseInt(e.target.value)})}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4 ml-3">主要協力廠商</label>
                        <input
                            type="text"
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-6 outline-none focus:ring-4 focus:ring-blue-600/10 transition-all font-black"
                            placeholder="填寫廠商全稱..."
                            value={formData.vendor}
                            onChange={(e) => setFormData({...formData, vendor: e.target.value})}
                        />
                      </div>

                      <div className="col-span-2 p-10 bg-blue-600/5 rounded-[3rem] border border-blue-500/10 mt-6 shadow-inner">
                        <h4 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em] mb-8 border-l-4 border-blue-600 pl-6 italic">Automation & Reminder Engine</h4>
                        <div className="grid grid-cols-2 gap-10">
                          <div>
                            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4">前置提醒天數 (Days)</label>
                            <input
                                type="number"
                                className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 outline-none focus:ring-2 focus:ring-blue-600/30 transition-all font-black text-blue-400"
                                value={formData.reminder_days_before}
                                onChange={(e) => setFormData({...formData, reminder_days_before: parseInt(e.target.value)})}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4">排程週期</label>
                            <select
                                className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 outline-none focus:ring-2 focus:ring-blue-600/30 transition-all font-black appearance-none cursor-pointer"
                                value={formData.cycle}
                                onChange={(e) => setFormData({...formData, cycle: e.target.value})}
                            >
                              <option value="yearly">每年重複 (Yearly)</option>
                              <option value="once">單次採購 (One-time)</option>
                              <option value="half-yearly">每半年執行</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            )}
          </div>
        </main>
      </div>
  );
}

// 數據統計組件
const StatCard = ({ title, value, color, icon: Icon }: { title: string, value: string, color: 'blue' | 'amber' | 'emerald', icon: any }) => {
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