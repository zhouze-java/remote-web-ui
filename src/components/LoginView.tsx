import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Moon, Server, ShieldCheck, Sun, Terminal, User } from 'lucide-react';
import { SANDBOX_USERS } from '../data/mockConfig';
import { SandboxUser, ThemeMode } from '../types/sandbox';

interface LoginViewProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  onLoginSuccess: (user: SandboxUser) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  theme,
  onToggleTheme,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const matched = SANDBOX_USERS.find(
      (u) => u.username === username.trim() && u.password === password
    );
    if (!matched) {
      setError('沙箱账号或密码不正确，请核对后重试');
      return;
    }
    onLoginSuccess(matched);
  };

  const fillAccount = (user: SandboxUser) => {
    setUsername(user.username);
    setPassword(user.password);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#0b0f17] dark:text-slate-100 transition-colors">
      {/* Top Bar */}
      <header className="h-14 px-6 border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#111827] flex items-center justify-between gap-8">
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <Terminal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="font-display font-semibold text-base tracking-tight">
            院外远程沙箱控制台
          </span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
          <span>院外排障终端</span>
          <span aria-hidden="true">·</span>
          <span>消息队列直连院内后端</span>
          <span aria-hidden="true">·</span>
          <span>会话级 Cookie 隔离</span>
        </div>
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            aria-label="切换浅色或深色模式"
          >
            {theme === ThemeMode.DARK ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>浅色模式</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-600" />
                <span>深色模式</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Split Workspace */}
      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-[1040px] grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          {/* Left Context Column */}
          <section className="lg:col-span-7 flex flex-col justify-between p-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]">
            <div>
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-3">
                运维与实施专用远程工作台
              </p>
              <h1
                className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 leading-snug mb-4"
                style={{ textWrap: 'balance' }}
              >
                在院外临时启动某医院前端，连通院内真实后端，用于远程查看与排查。
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
                登录沙箱平台后，左侧选择已授权医院节点即可制备私有前端沙箱；就绪后在右侧远程视口内登录院内业务账号，排查、演示与验收互不干扰。
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>两层登录解耦</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  先登录沙箱平台获取医院授权范围，再于会话视口内登录院内业务系统。
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  <Server className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>会话私有隔离</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  每个会话独立解压运行且 Cookie 互不串号，默认并发上限 2 个。
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  <Terminal className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>TTL 自动回收</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  支持手动立即销毁；闲置约 2h 或存活满 24h 将自动清理沙箱资源。
                </p>
              </div>
            </div>
          </section>

          {/* Right Form Column */}
          <section className="lg:col-span-5 flex flex-col justify-center p-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]">
            <div className="mb-6">
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-50">
                登录沙箱控制台
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                使用内部配置账号认证以加载可访问医院列表
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="sandbox-username"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  内部账号
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="sandbox-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="输入内部用户名，如 admin"
                    className="w-full h-10 pl-9 pr-3 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 dark:focus:border-blue-400 transition-colors"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="sandbox-password"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  访问密码
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="sandbox-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="输入密码"
                    className="w-full h-10 pl-9 pr-10 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 dark:focus:border-blue-400 transition-colors"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="px-3 py-2 text-xs rounded-md border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full h-10 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap"
              >
                进入沙箱工作台
              </button>
            </form>

            {/* Quick Account Switcher for internal configs */}
            <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2.5">
                快捷填入配置账号（权限对比测试）
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {SANDBOX_USERS.map((u) => {
                  const selected = username === u.username;
                  return (
                    <button
                      key={u.username}
                      type="button"
                      onClick={() => fillAccount(u)}
                      className={`text-left px-3 py-2 rounded-md border text-xs transition-colors cursor-pointer ${
                        selected
                          ? 'border-blue-600/50 dark:border-blue-500/60 bg-blue-50/70 dark:bg-blue-950/30 text-slate-900 dark:text-slate-100'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0b0f17]/70 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="font-mono font-semibold">{u.username}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {u.roleTitle} · {u.authorizedHospitalIds.length} 家医院
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
