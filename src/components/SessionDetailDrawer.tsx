import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  RotateCcw,
  Shield,
  Trash2,
  X,
} from 'lucide-react';
import { HospitalNode, SandboxSession, SessionStatus } from '../types/sandbox';

interface SessionDetailDrawerProps {
  session: SandboxSession;
  hospital: HospitalNode | undefined;
  now: number;
  onClose: () => void;
  onDestroy: (sessionId: string) => void;
  onRetry: (session: SandboxSession) => void;
}

export function formatRemainingDuration(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':');
}

export const SessionDetailDrawer: React.FC<SessionDetailDrawerProps> = ({
  session,
  hospital,
  now,
  onClose,
  onDestroy,
  onRetry,
}) => {
  const idleElapsed = now - session.lastActiveAt;
  const idleRemaining = Math.max(0, session.idleTtlMs - idleElapsed);
  const maxElapsed = now - session.createdAt;
  const maxRemaining = Math.max(0, session.maxTtlMs - maxElapsed);

  const idlePct = Math.max(0, Math.min(100, (idleRemaining / session.idleTtlMs) * 100));
  const maxPct = Math.max(0, Math.min(100, (maxRemaining / session.maxTtlMs) * 100));
  const isExpiringSoon = idleRemaining < 15 * 60 * 1000 || maxRemaining < 60 * 60 * 1000;

  return (
    <aside className="w-[340px] shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] flex flex-col h-full overflow-hidden">
      <div className="h-11 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
          会话详情与 TTL 诊断
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer"
          aria-label="关闭详情面板"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* Identity & Status */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">当前状态</span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              {session.status === SessionStatus.READY && (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-700 dark:text-emerald-400">READY · 就绪可用</span>
                </>
              )}
              {session.status === SessionStatus.PROVISIONING && (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-spin" />
                  <span className="text-amber-700 dark:text-amber-400">PROVISIONING · 制备中</span>
                </>
              )}
              {session.status === SessionStatus.FAILED && (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                  <span className="text-red-700 dark:text-red-400">FAILED · 制备失败</span>
                </>
              )}
              {session.status === SessionStatus.DESTROYING && (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin" />
                  <span className="text-slate-600 dark:text-slate-400">DESTROYING · 销毁中</span>
                </>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 dark:text-slate-400 shrink-0">会话 ID</span>
            <span className="font-mono text-slate-900 dark:text-slate-100 truncate">
              {session.id}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 dark:text-slate-400 shrink-0">目标医院</span>
            <span className="text-slate-900 dark:text-slate-100 font-medium truncate">
              {session.hospitalName}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 dark:text-slate-400 shrink-0">归属账号</span>
            <span className="font-mono text-slate-800 dark:text-slate-200">
              {session.ownerUsername}（私有不可分享）
            </span>
          </div>
        </section>

        {/* Failure Diagnostics */}
        {session.status === SessionStatus.FAILED && session.errorMessage && (
          <section className="p-3 rounded-md border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 space-y-2.5">
            <div className="font-semibold text-red-700 dark:text-red-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>制备异常详情 (errorMessage)</span>
            </div>
            <p className="font-mono text-[11px] leading-relaxed text-red-700 dark:text-red-300 break-all">
              {session.errorMessage}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => onRetry(session)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white font-medium transition-colors cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>销毁并重试</span>
              </button>
            </div>
          </section>
        )}

        {/* TTL & Auto-Cleanup Timers */}
        <section className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>自动清理倒计时 (TTL)</span>
            </span>
            {isExpiringSoon && (
              <span className="text-amber-600 dark:text-amber-400 font-medium">即将过期</span>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">闲置自动清理（约 2h）</span>
              <span className="font-mono text-slate-900 dark:text-slate-100">
                {formatRemainingDuration(idleRemaining)}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-blue-600 dark:bg-blue-500 transition-all"
                style={{ width: `${idlePct}%` }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">最长存活上限（约 24h）</span>
              <span className="font-mono text-slate-900 dark:text-slate-100">
                {formatRemainingDuration(maxRemaining)}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-600 dark:bg-emerald-500 transition-all"
                style={{ width: `${maxPct}%` }}
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            在医院视口内点击操作会自动刷新闲置计时；超过闲置上限或总存活 24h 后沙箱将自动销毁释放。
          </p>
        </section>

        {/* Isolation & Tunnel Context */}
        <section className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-slate-500" />
            <span>网络转发与 Cookie 隔离</span>
          </div>
          <div className="space-y-2 text-[11px]">
            <div className="flex justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400 shrink-0">前端构建包</span>
              <span className="font-mono text-slate-700 dark:text-slate-300 truncate">
                {hospital?.packageName ?? '-'}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400 shrink-0">MQ 路由</span>
              <span className="font-mono text-slate-700 dark:text-slate-300 truncate">
                {hospital?.mqRoute ?? '-'}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500 dark:text-slate-400 shrink-0">Cookie 域</span>
              <span className="font-mono text-slate-700 dark:text-slate-300 truncate">
                {session.cookieNamespace}
              </span>
            </div>
          </div>
        </section>

        {/* Provisioning Logs */}
        <section className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <div className="font-semibold text-slate-800 dark:text-slate-200">生命周期事件日志</div>
          <div className="p-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0b0f17] font-mono text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 space-y-1">
            {session.logs.map((line, i) => (
              <div key={i} className="break-all">
                <span className="text-slate-400 dark:text-slate-500 mr-1.5">[{i + 1}]</span>
                {line}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Footer Action */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <button
          type="button"
          disabled={session.status === SessionStatus.DESTROYING}
          onClick={() => onDestroy(session.id)}
          className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/60 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>销毁该沙箱会话</span>
        </button>
      </div>
    </aside>
  );
};
