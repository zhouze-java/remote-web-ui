import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Info,
  Loader2,
  LogOut,
  Maximize2,
  Minimize2,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  ShieldCheck,
  Sun,
  Terminal,
  Trash2,
} from 'lucide-react';
import {
  HospitalBusinessState,
  HospitalNode,
  ProvisionStep,
  SandboxSession,
  SandboxUser,
  SessionStatus,
  ThemeMode,
} from '../types/sandbox';
import { buildHospitalIframeSrcDoc } from '../utils/hospitalIframeHtml';
import { formatRemainingDuration, SessionDetailDrawer } from './SessionDetailDrawer';

interface SandboxConsoleProps {
  user: SandboxUser;
  hospitals: HospitalNode[];
  sessions: SandboxSession[];
  activeSessionId: string | null;
  businessStates: Record<string, HospitalBusinessState>;
  theme: ThemeMode;
  now: number;
  onToggleTheme: () => void;
  onLogout: () => void;
  onSelectSession: (sessionId: string) => void;
  onProvision: (hospitalId: string, simulateFailure?: boolean) => void;
  onDestroySession: (sessionId: string) => void;
  onRetrySession: (session: SandboxSession) => void;
}

type ConsoleTab = 'workbench' | 'hospitals';

export const SandboxConsole: React.FC<SandboxConsoleProps> = ({
  user,
  hospitals,
  sessions,
  activeSessionId,
  businessStates,
  theme,
  now,
  onToggleTheme,
  onLogout,
  onSelectSession,
  onProvision,
  onDestroySession,
  onRetrySession,
}) => {
  const authorizedHospitals = useMemo(
    () => hospitals.filter((h) => user.authorizedHospitalIds.includes(h.id)),
    [hospitals, user.authorizedHospitalIds]
  );

  const [activeTab, setActiveTab] = useState<ConsoleTab>('workbench');
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(
    authorizedHospitals[0]?.id ?? ''
  );
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [iframeReloadNonce, setIframeReloadNonce] = useState<Record<string, number>>({});
  const [isRefreshingIframe, setIsRefreshingIframe] = useState(false);
  const [isFullscreenStage, setIsFullscreenStage] = useState(false);
  const [confirmDestroyId, setConfirmDestroyId] = useState<string | null>(null);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? null,
    [sessions, activeSessionId]
  );

  const activeHospital = useMemo(
    () => hospitals.find((h) => h.id === activeSession?.hospitalId),
    [hospitals, activeSession]
  );

  const selectedProvisionHospital = useMemo(
    () => authorizedHospitals.find((h) => h.id === selectedHospitalId) ?? authorizedHospitals[0],
    [authorizedHospitals, selectedHospitalId]
  );

  const quotaReached = sessions.length >= user.maxSessions;

  const filteredAuthorizedHospitals = useMemo(() => {
    const q = hospitalSearch.trim().toLowerCase();
    if (!q) return authorizedHospitals;
    return authorizedHospitals.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.code.toLowerCase().includes(q) ||
        h.region.toLowerCase().includes(q)
    );
  }, [authorizedHospitals, hospitalSearch]);

  const handleRefreshStage = () => {
    if (!activeSession || activeSession.status !== SessionStatus.READY) return;
    setIsRefreshingIframe(true);
    setIframeReloadNonce((prev) => ({
      ...prev,
      [activeSession.id]: (prev[activeSession.id] ?? 0) + 1,
    }));
    setTimeout(() => setIsRefreshingIframe(false), 320);
  };

  const handleProvisionClick = () => {
    if (!selectedProvisionHospital || quotaReached) return;
    onProvision(selectedProvisionHospital.id, simulateFailure);
    setSimulateFailure(false);
    setActiveTab('workbench');
  };

  const handleConfirmDestroy = (sessionId: string) => {
    setConfirmDestroyId(null);
    if (activeSessionId === sessionId) {
      setIsFullscreenStage(false);
    }
    onDestroySession(sessionId);
  };

  const renderStatusLabel = (status: SessionStatus) => {
    switch (status) {
      case SessionStatus.READY:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap shrink-0">
            <CheckCircle2 className="w-3 h-3" />
            <span>READY</span>
          </span>
        );
      case SessionStatus.PROVISIONING:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap shrink-0">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>制备中</span>
          </span>
        );
      case SessionStatus.FAILED:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 dark:text-red-400 whitespace-nowrap shrink-0">
            <AlertTriangle className="w-3 h-3" />
            <span>FAILED</span>
          </span>
        );
      case SessionStatus.DESTROYING:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>销毁中</span>
          </span>
        );
    }
  };

  const activeBusinessState: HospitalBusinessState | undefined = activeSession
    ? businessStates[activeSession.id]
    : undefined;

  const iframeSrcDoc = useMemo(() => {
    if (
      !activeSession ||
      !activeHospital ||
      activeSession.status !== SessionStatus.READY ||
      !activeBusinessState
    ) {
      return '';
    }
    return buildHospitalIframeSrcDoc(activeSession, activeHospital, activeBusinessState);
  }, [activeSession, activeHospital, activeBusinessState]);

  const activeIdleRemaining = activeSession
    ? Math.max(0, activeSession.idleTtlMs - (now - activeSession.lastActiveAt))
    : 0;

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-50 text-slate-900 dark:bg-[#0b0f17] dark:text-slate-100">
      {/* Top Bar: Clean 3-zone header */}
      <header className="h-12 px-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] flex items-center justify-between gap-8 shrink-0">
        {/* Zone 1: Brand Title */}
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <Terminal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="font-display font-semibold text-sm tracking-tight text-slate-900 dark:text-slate-100">
            院外远程沙箱控制台
          </span>
        </div>

        {/* Zone 2: Clean single-line view links */}
        <nav className="flex items-center gap-6 text-xs font-medium whitespace-nowrap shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('workbench')}
            className={`py-3.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'workbench'
                ? 'border-blue-600 dark:border-blue-400 text-slate-900 dark:text-slate-50 font-semibold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            远程终端台
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hospitals')}
            className={`py-3.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'hospitals'
                ? 'border-blue-600 dark:border-blue-400 text-slate-900 dark:text-slate-50 font-semibold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            授权医院节点 ({authorizedHospitals.length})
          </button>
        </nav>

        {/* Zone 3: Account & Logout */}
        <div className="flex items-center gap-4 whitespace-nowrap shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
              {user.displayName}
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
              ·
            </span>
            <span className="text-slate-500 dark:text-slate-400">{user.roleTitle}</span>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>退出</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      {activeTab === 'hospitals' ? (
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[1200px] mx-auto space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h1 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-50">
                  已授权医院节点清单
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  当前账号 <span className="font-mono">{user.username}</span> 可访问{' '}
                  <span className="font-mono">{authorizedHospitals.length}</span> 家医院节点 ·
                  当前会话配额{' '}
                  <span className="font-mono">
                    {sessions.length} / {user.maxSessions}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={hospitalSearch}
                    onChange={(e) => setHospitalSearch(e.target.value)}
                    placeholder="搜索医院名称、编码或区域"
                    className="h-9 w-64 pl-8 pr-3 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 dark:focus:border-blue-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap shrink-0"
                >
                  {theme === ThemeMode.DARK ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span>浅色</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-slate-600" />
                      <span>深色</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                      <th className="py-3 px-4 font-medium">医院节点名称</th>
                      <th className="py-3 px-4 font-medium">节点编码</th>
                      <th className="py-3 px-4 font-medium">所属区域 / 网关</th>
                      <th className="py-3 px-4 font-medium">前端资源包</th>
                      <th className="py-3 px-4 font-medium text-right">包大小</th>
                      <th className="py-3 px-4 font-medium">MQ 转发路由</th>
                      <th className="py-3 px-4 font-medium text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/80">
                    {filteredAuthorizedHospitals.map((h) => {
                      const existingSession = sessions.find((s) => s.hospitalId === h.id);
                      return (
                        <tr
                          key={h.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                            {h.name}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                            {h.code}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                            {h.region}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                            {h.packageName}
                          </td>
                          <td className="py-3 px-4 font-mono text-right text-slate-600 dark:text-slate-300">
                            {h.packageSizeMb.toFixed(1)} MB
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                            {h.mqRoute}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              {existingSession && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectSession(existingSession.id);
                                    setActiveTab('workbench');
                                  }}
                                  className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                                >
                                  打开已有会话
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={quotaReached}
                                onClick={() => {
                                  onProvision(h.id, false);
                                  setActiveTab('workbench');
                                }}
                                className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                              >
                                制备沙箱
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredAuthorizedHospitals.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-10 text-center text-slate-500 dark:text-slate-400"
                        >
                          未找到匹配的授权医院节点
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Remote Machine Sidebar */}
          {!isFullscreenStage && (
            <aside
              className={`${
                sidebarCollapsed ? 'w-12' : 'w-[300px]'
              } shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] flex flex-col transition-all duration-150`}
            >
              {sidebarCollapsed ? (
                <div className="flex flex-col items-center py-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setSidebarCollapsed(false)}
                    className="p-2 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    title="展开左侧远程节点栏"
                    aria-label="展开左侧远程节点栏"
                  >
                    <PanelLeftOpen className="w-4 h-4" />
                  </button>
                  <div className="w-6 border-t border-slate-200 dark:border-slate-800" />
                  {sessions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onSelectSession(s.id)}
                      title={`${s.hospitalName} (${s.status})`}
                      className={`w-8 h-8 rounded-md flex items-center justify-center border text-xs font-mono cursor-pointer ${
                        s.id === activeSessionId
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {s.hospitalName.slice(0, 1)}
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  {/* Sidebar Header */}
                  <div className="h-11 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      远程节点与会话
                    </span>
                    <button
                      type="button"
                      onClick={() => setSidebarCollapsed(true)}
                      className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      title="收起侧栏"
                      aria-label="收起侧栏"
                    >
                      <PanelLeftClose className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Provisioning Box */}
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="hospital-select"
                        className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                      >
                        选择医院制备沙箱
                      </label>
                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        配额 {sessions.length} / {user.maxSessions}
                      </span>
                    </div>

                    <select
                      id="hospital-select"
                      value={selectedProvisionHospital?.id ?? ''}
                      onChange={(e) => setSelectedHospitalId(e.target.value)}
                      className="w-full h-9 px-2.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 dark:focus:border-blue-400"
                    >
                      {authorizedHospitals.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>

                    {selectedProvisionHospital && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between gap-2">
                        <span className="truncate">{selectedProvisionHospital.region}</span>
                        <span className="font-mono shrink-0">
                          {selectedProvisionHospital.packageSizeMb.toFixed(1)} MB
                        </span>
                      </div>
                    )}

                    <label className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={simulateFailure}
                        onChange={(e) => setSimulateFailure(e.target.checked)}
                        className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span>模拟拉包校验异常（测试 FAILED 态）</span>
                    </label>

                    <button
                      type="button"
                      disabled={quotaReached || !selectedProvisionHospital}
                      onClick={handleProvisionClick}
                      className="w-full h-9 inline-flex items-center justify-center gap-1.5 px-4 rounded-md bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-medium transition-colors disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{quotaReached ? '已达会话上限 (2/2)' : '制备远程会话'}</span>
                    </button>
                  </div>

                  {/* Active Sessions Tree */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    <div className="px-1 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                      <span>我的沙箱会话</span>
                      <span className="font-mono text-[11px]">{sessions.length}</span>
                    </div>

                    {sessions.length === 0 ? (
                      <div className="mt-4 p-4 rounded-md border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1.5">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          暂无运行中的会话
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                          在上方选择医院节点后点击「制备远程会话」，即可拉起专属远程前端。
                        </p>
                      </div>
                    ) : (
                      sessions.map((session) => {
                        const isSelected = session.id === activeSessionId;
                        const idleRem = Math.max(
                          0,
                          session.idleTtlMs - (now - session.lastActiveAt)
                        );
                        const isConfirming = confirmDestroyId === session.id;

                        return (
                          <div
                            key={session.id}
                            onClick={() => onSelectSession(session.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onSelectSession(session.id);
                              }
                            }}
                            className={`p-3 rounded-md border transition-colors cursor-pointer space-y-2 ${
                              isSelected
                                ? 'border-blue-600/60 dark:border-blue-500/60 bg-blue-50/70 dark:bg-blue-950/30'
                                : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0b0f17]/60 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {session.hospitalName}
                              </span>
                              {renderStatusLabel(session.status)}
                            </div>

                            <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              <span className="truncate">{session.id}</span>
                              {session.status === SessionStatus.READY && (
                                <span className="shrink-0">
                                  {formatRemainingDuration(idleRem)}
                                </span>
                              )}
                            </div>

                            {session.status === SessionStatus.PROVISIONING && (
                              <div className="space-y-1">
                                <div className="h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-amber-500 transition-all duration-300"
                                    style={{ width: `${session.provisionProgress}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-[11px] text-amber-700 dark:text-amber-400">
                                  <span>
                                    {session.provisionStep === ProvisionStep.FETCHING &&
                                      '下载前端构建包...'}
                                    {session.provisionStep === ProvisionStep.EXTRACTING &&
                                      '解压静态资源...'}
                                    {session.provisionStep === ProvisionStep.ROUTING &&
                                      '绑定 MQ 与隔离域...'}
                                  </span>
                                  <span className="font-mono">{session.provisionProgress}%</span>
                                </div>
                              </div>
                            )}

                            {session.status === SessionStatus.FAILED && session.errorMessage && (
                              <p className="text-[11px] text-red-600 dark:text-red-400 line-clamp-2 leading-snug">
                                {session.errorMessage}
                              </p>
                            )}

                            {/* Actions row */}
                            <div
                              className="pt-1 flex items-center justify-between gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {isConfirming ? (
                                <div className="flex items-center gap-1.5 w-full">
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmDestroy(session.id)}
                                    className="flex-1 py-1 px-2 rounded bg-red-600 hover:bg-red-700 text-white text-[11px] font-medium cursor-pointer whitespace-nowrap"
                                  >
                                    确认销毁
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDestroyId(null)}
                                    className="py-1 px-2 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] cursor-pointer whitespace-nowrap"
                                  >
                                    取消
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2">
                                    {session.status === SessionStatus.FAILED && (
                                      <button
                                        type="button"
                                        onClick={() => onRetrySession(session)}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-[11px] font-medium cursor-pointer whitespace-nowrap"
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                        <span>重试</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      disabled={session.status === SessionStatus.DESTROYING}
                                      onClick={() => setConfirmDestroyId(session.id)}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-[11px] font-medium disabled:opacity-40 cursor-pointer whitespace-nowrap"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>销毁</span>
                                    </button>
                                  </div>
                                  {isSelected && (
                                    <span className="inline-flex items-center text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                                      <span>当前</span>
                                      <ChevronRight className="w-3 h-3" />
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </aside>
          )}

          {/* Right Viewport Stage */}
          <section className="flex-1 min-w-0 flex flex-col bg-slate-100/80 dark:bg-[#080b12]">
            {/* Stage Workspace Toolbar */}
            <div className="h-11 px-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] flex items-center justify-between gap-4 shrink-0">
              {/* Left Breadcrumb / Target Context */}
              <div className="flex items-center gap-2.5 min-w-0 text-xs">
                {activeSession ? (
                  <>
                    <Monitor className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {activeSession.hospitalName}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                      /
                    </span>
                    <span className="font-mono text-slate-500 dark:text-slate-400 truncate">
                      {activeSession.id}
                    </span>
                    {activeSession.status === SessionStatus.READY && (
                      <>
                        <span
                          className="hidden lg:inline text-slate-300 dark:text-slate-700"
                          aria-hidden="true"
                        >
                          ·
                        </span>
                        <span className="hidden lg:inline text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {activeBusinessState?.isHospitalLoggedIn
                            ? `院内账号: ${activeBusinessState.hospitalUsername}`
                            : 'Cookie 已隔离 · 待登录院内账号'}
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400">
                    远程视口就绪 · 请在左侧选择或制备医院沙箱
                  </span>
                )}
              </div>

              {/* Right Stage Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {activeSession && (
                  <>
                    <div className="hidden xl:flex items-center gap-1.5 px-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      <Clock className="w-3.5 h-3.5" />
                      <span>闲置 {formatRemainingDuration(activeIdleRemaining)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDetailOpen((prev) => !prev)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        detailOpen
                          ? 'border-blue-600/50 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>详情</span>
                    </button>

                    {activeSession.status === SessionStatus.READY && (
                      <>
                        <button
                          type="button"
                          onClick={handleRefreshStage}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${isRefreshingIframe ? 'animate-spin' : ''}`}
                          />
                          <span>刷新画面</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsFullscreenStage((prev) => !prev)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          {isFullscreenStage ? (
                            <>
                              <Minimize2 className="w-3.5 h-3.5" />
                              <span>退出全屏</span>
                            </>
                          ) : (
                            <>
                              <Maximize2 className="w-3.5 h-3.5" />
                              <span>独立视口</span>
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </>
                )}

                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  aria-label="切换主题模式"
                >
                  {theme === ThemeMode.DARK ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline">浅色</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-slate-600" />
                      <span className="hidden sm:inline">深色</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Stage Canvas + Optional Detail Drawer */}
            <div className="flex-1 min-h-0 flex overflow-hidden">
              <div className="flex-1 min-w-0 relative flex flex-col">
                {!activeSession ? (
                  /* Empty State */
                  <div className="flex-1 overflow-y-auto flex items-center justify-center p-8">
                    <div className="w-full max-w-[720px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-8 space-y-6">
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          远程医院工作台 · 空闲状态
                        </p>
                        <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-50">
                          在院外临时启动某医院前端，连通院内真实后端，用于远程查看与排查。
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          每个沙箱会话均为私有实例（上限 {user.maxSessions} 个），前端包独立解压，院内系统 Cookie 完全隔离；闲置约 2 小时或总存活满 24 小时将自动销毁。
                        </p>
                      </div>

                      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            快速制备已授权医院（{authorizedHospitals.length}）
                          </span>
                          <span className="font-mono text-slate-500 dark:text-slate-400">
                            当前配额 {sessions.length} / {user.maxSessions}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {authorizedHospitals.map((h) => (
                            <div
                              key={h.id}
                              className="p-3.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0b0f17]/70 flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                                  {h.name}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                  {h.region} · {h.code}
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={quotaReached}
                                onClick={() => onProvision(h.id, false)}
                                className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium disabled:opacity-40 cursor-pointer whitespace-nowrap shrink-0"
                              >
                                制备
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : activeSession.status === SessionStatus.PROVISIONING ? (
                  /* Provisioning State */
                  <div className="flex-1 flex items-center justify-center p-8">
                    <div className="w-full max-w-[540px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-7 space-y-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="inline-flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400 mb-1.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>正在制备远程沙箱（制备期间暂不可嵌入访问）</span>
                          </div>
                          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-50">
                            {activeSession.hospitalName}
                          </h2>
                          <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {activeSession.id}
                          </p>
                        </div>
                        <span className="font-mono text-lg font-semibold text-slate-900 dark:text-slate-100">
                          {activeSession.provisionProgress}%
                        </span>
                      </div>

                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
                          style={{ width: `${activeSession.provisionProgress}%` }}
                        />
                      </div>

                      <div className="space-y-2.5 pt-2 text-xs">
                        {[
                          {
                            step: ProvisionStep.FETCHING,
                            label: `拉取前端资源包 ${activeHospital?.packageName ?? ''}`,
                          },
                          {
                            step: ProvisionStep.EXTRACTING,
                            label: `解压静态资源至私有沙箱目录 /sandboxes/${activeSession.id}`,
                          },
                          {
                            step: ProvisionStep.ROUTING,
                            label: `绑定消息队列路由 ${activeHospital?.mqRoute ?? ''} 与独立 Cookie 域`,
                          },
                        ].map((item, idx) => {
                          const order = [
                            ProvisionStep.FETCHING,
                            ProvisionStep.EXTRACTING,
                            ProvisionStep.ROUTING,
                            ProvisionStep.DONE,
                          ];
                          const currentIdx = order.indexOf(activeSession.provisionStep);
                          const isDone = currentIdx > idx;
                          const isCurrent = currentIdx === idx;
                          return (
                            <div
                              key={item.step}
                              className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300"
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              ) : isCurrent ? (
                                <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 shrink-0" />
                              )}
                              <span
                                className={
                                  isDone
                                    ? 'text-slate-900 dark:text-slate-100'
                                    : isCurrent
                                      ? 'font-medium text-blue-700 dark:text-blue-300'
                                      : 'text-slate-400 dark:text-slate-500'
                                }
                              >
                                {item.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : activeSession.status === SessionStatus.FAILED ? (
                  /* Failed State */
                  <div className="flex-1 flex items-center justify-center p-8">
                    <div className="w-full max-w-[560px] rounded-lg border border-red-200 dark:border-red-900/60 bg-white dark:bg-[#111827] p-7 space-y-5">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-50">
                            沙箱制备失败 · {activeSession.hospitalName}
                          </h2>
                          <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            会话 ID: {activeSession.id}
                          </p>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-md border border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/30 font-mono text-xs text-red-700 dark:text-red-300 leading-relaxed break-all">
                        {activeSession.errorMessage || '未知制备异常，请销毁后重新制备'}
                      </div>

                      <div className="flex items-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => onRetrySession(activeSession)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>销毁并重新制备</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmDestroy(activeSession.id)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>销毁此会话</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : activeSession.status === SessionStatus.DESTROYING ? (
                  /* Destroying State */
                  <div className="flex-1 flex items-center justify-center p-8">
                    <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-xs font-medium text-slate-700 dark:text-slate-200">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                      <span>正在销毁沙箱实例与隔离 Cookie 域...</span>
                    </div>
                  </div>
                ) : (
                  /* READY: Embedded Hospital SPA Iframe Stage with Production Red Glow */
                  <div className="flex-1 flex flex-col min-h-0 p-3 sm:p-4">
                    <div className="flex-1 min-h-0 rounded-md border-2 border-red-500/85 dark:border-red-500/80 ring-2 ring-red-500/20 dark:ring-red-500/25 shadow-[0_0_22px_rgba(239,68,68,0.28)] dark:shadow-[0_0_28px_rgba(239,68,68,0.38)] bg-white overflow-hidden flex flex-col">
                      {/* Production Environment Safety Banner */}
                      <div
                        role="status"
                        className="px-3.5 py-1.5 bg-red-50 dark:bg-red-950/90 border-b border-red-200 dark:border-red-900/80 flex items-center justify-between gap-4 text-xs shrink-0"
                      >
                        <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-medium min-w-0">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
                          <span className="truncate">
                            生产环境直连提醒：当前院内视图已连通真实医院后端，请勿随意执行新增、修改、审核或删除等写操作。
                          </span>
                        </div>
                        <span className="hidden md:inline-block font-mono text-[11px] text-red-600/90 dark:text-red-400/90 whitespace-nowrap shrink-0">
                          {activeHospital?.mqRoute}
                        </span>
                      </div>

                      {/* Simulated Detached Browser Address Bar inside Independent Viewport */}
                      {isFullscreenStage && (
                        <div className="h-9 px-3 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 text-[11px] shrink-0">
                          <div className="flex items-center gap-2 font-mono text-slate-600 dark:text-slate-300 truncate">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="truncate">
                              https://sandbox.internal/{activeSession.id}/{activeSession.hospitalCode}/
                            </span>
                          </div>
                          <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0 flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            <span>独立沙箱视口</span>
                          </span>
                        </div>
                      )}

                      <div className="flex-1 relative min-h-0">
                        {isRefreshingIframe && (
                          <div className="absolute inset-0 z-10 bg-white/80 dark:bg-slate-950/75 flex items-center justify-center">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                              <span>正在刷新医院前端画面...</span>
                            </div>
                          </div>
                        )}

                        <iframe
                          key={`${activeSession.id}-${iframeReloadNonce[activeSession.id] ?? 0}`}
                          title={`${activeSession.hospitalName} 远程前端`}
                          srcDoc={iframeSrcDoc}
                          className="w-full h-full border-0 block bg-white"
                          sandbox="allow-scripts allow-forms allow-same-origin"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Optional Session Detail & TTL Drawer */}
              {detailOpen && activeSession && (
                <SessionDetailDrawer
                  session={activeSession}
                  hospital={activeHospital}
                  now={now}
                  onClose={() => setDetailOpen(false)}
                  onDestroy={handleConfirmDestroy}
                  onRetry={onRetrySession}
                />
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
