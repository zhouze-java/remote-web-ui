import { useCallback, useEffect, useState } from 'react';
import { LoginView } from './components/LoginView';
import { SandboxConsole } from './components/SandboxConsole';
import {
  createInitialSessionsForUser,
  generateSessionId,
  HOSPITALS,
  IDLE_TTL_MS,
  MAX_TTL_MS,
} from './data/mockConfig';
import {
  HospitalBusinessState,
  ProvisionStep,
  SandboxSession,
  SandboxUser,
  SessionStatus,
  ThemeMode,
} from './types/sandbox';

const THEME_STORAGE_KEY = 'sandbox_console_theme';

function createDefaultBusinessState(hospitalUsername: string | null = null): HospitalBusinessState {
  return {
    isHospitalLoggedIn: false,
    hospitalUsername,
    activeNav: '设备中心库',
    period: 'month',
    expiryBucket: '12m',
    searchKeyword: '',
  };
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === ThemeMode.LIGHT || saved === ThemeMode.DARK) {
        return saved;
      }
    } catch {
      // Ignore storage access failures
    }
    return ThemeMode.DARK;
  });

  const [currentUser, setCurrentUser] = useState<SandboxUser | null>(null);
  const [sessions, setSessions] = useState<SandboxSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [businessStates, setBusinessStates] = useState<Record<string, HospitalBusinessState>>({});
  const [now, setNow] = useState<number>(() => Date.now());

  // Sync Tailwind .dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === ThemeMode.DARK) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  // 1-second tick for TTL countdowns and auto-expiration cleanup
  useEffect(() => {
    const timer = window.setInterval(() => {
      const tick = Date.now();
      setNow(tick);
      setSessions((prev) =>
        prev.filter((s) => {
          const idleExpired = tick - s.lastActiveAt >= s.idleTtlMs;
          const maxExpired = tick - s.createdAt >= s.maxTtlMs;
          return !idleExpired && !maxExpired;
        })
      );
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Poll/advance PROVISIONING sessions
  useEffect(() => {
    const hasProvisioning = sessions.some((s) => s.status === SessionStatus.PROVISIONING);
    if (!hasProvisioning) return;

    const poller = window.setInterval(() => {
      setSessions((prev) =>
        prev.map((session) => {
          if (session.status !== SessionStatus.PROVISIONING) return session;
          const isSimulatedFail = session.logs.some((l) => l.includes('[故障演练]'));
          const nextProgress = Math.min(100, session.provisionProgress + 20);

          if (isSimulatedFail && nextProgress >= 60) {
            const hospital = HOSPITALS.find((h) => h.id === session.hospitalId);
            const pkg = hospital?.packageName ?? 'hospital-frontend.tar.gz';
            const errMsg = `ERR_ARCHIVE_CHECKSUM: 前端压缩包 ${pkg} SHA-256 校验不匹配（远端镜像可能正在同步中），请销毁后重试`;
            return {
              ...session,
              status: SessionStatus.FAILED,
              provisionStep: ProvisionStep.ERROR,
              provisionProgress: 60,
              errorMessage: errMsg,
              logs: [...session.logs, `异常中断：${errMsg}`],
            };
          }

          if (nextProgress < 40) {
            return {
              ...session,
              provisionStep: ProvisionStep.FETCHING,
              provisionProgress: nextProgress,
            };
          }
          if (nextProgress < 80) {
            return {
              ...session,
              provisionStep: ProvisionStep.EXTRACTING,
              provisionProgress: nextProgress,
              logs:
                session.provisionStep === ProvisionStep.FETCHING
                  ? [...session.logs, '前端构建包下载完成，开始解压至私有沙箱目录...']
                  : session.logs,
            };
          }
          if (nextProgress < 100) {
            return {
              ...session,
              provisionStep: ProvisionStep.ROUTING,
              provisionProgress: nextProgress,
              logs:
                session.provisionStep === ProvisionStep.EXTRACTING
                  ? [
                      ...session.logs,
                      '解压完成，正在绑定消息队列代理通道与会话级 Cookie 隔离域...',
                    ]
                  : session.logs,
            };
          }

          return {
            ...session,
            status: SessionStatus.READY,
            provisionStep: ProvisionStep.DONE,
            provisionProgress: 100,
            lastActiveAt: Date.now(),
            logs: [...session.logs, '沙箱实例状态变更：READY，可安全嵌入或新视口打开'],
          };
        })
      );
    }, 600);

    return () => window.clearInterval(poller);
  }, [sessions]);

  // Listen to postMessage events from embedded hospital SPA iframes
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object' || !data.sessionId) return;
      const sid: string = data.sessionId;

      if (data.type === 'HOSPITAL_ACTIVITY') {
        setSessions((prev) =>
          prev.map((s) => (s.id === sid ? { ...s, lastActiveAt: Date.now() } : s))
        );
      } else if (data.type === 'HOSPITAL_LOGIN') {
        setSessions((prev) =>
          prev.map((s) => (s.id === sid ? { ...s, lastActiveAt: Date.now() } : s))
        );
        setBusinessStates((prev) => ({
          ...prev,
          [sid]: {
            ...(prev[sid] ?? createDefaultBusinessState()),
            isHospitalLoggedIn: true,
            hospitalUsername: String(data.username || 'his_admin'),
          },
        }));
      } else if (data.type === 'HOSPITAL_LOGOUT') {
        setBusinessStates((prev) => ({
          ...prev,
          [sid]: {
            ...(prev[sid] ?? createDefaultBusinessState()),
            isHospitalLoggedIn: false,
            hospitalUsername: null,
          },
        }));
      } else if (data.type === 'HOSPITAL_STATE_UPDATE' && data.patch) {
        setSessions((prev) =>
          prev.map((s) => (s.id === sid ? { ...s, lastActiveAt: Date.now() } : s))
        );
        setBusinessStates((prev) => ({
          ...prev,
          [sid]: {
            ...(prev[sid] ?? createDefaultBusinessState()),
            ...data.patch,
          },
        }));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === ThemeMode.DARK ? ThemeMode.LIGHT : ThemeMode.DARK));
  }, []);

  const handleLoginSuccess = useCallback((user: SandboxUser) => {
    const initial = createInitialSessionsForUser(user.username);
    const initialBiz: Record<string, HospitalBusinessState> = {};
    for (const sess of initial) {
      const hosp = HOSPITALS.find((h) => h.id === sess.hospitalId);
      initialBiz[sess.id] = {
        ...createDefaultBusinessState(hosp?.businessSeed.defaultHisAccount ?? 'his_admin'),
        isHospitalLoggedIn: true,
        hospitalUsername: hosp?.businessSeed.defaultHisAccount ?? 'his_admin',
      };
    }
    setCurrentUser(user);
    setSessions(initial);
    setBusinessStates(initialBiz);
    setActiveSessionId(initial[0]?.id ?? null);
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setSessions([]);
    setBusinessStates({});
    setActiveSessionId(null);
  }, []);

  const handleProvision = useCallback(
    (hospitalId: string, simulateFailure = false) => {
      if (!currentUser) return;
      if (sessions.length >= currentUser.maxSessions) return;
      const hospital = HOSPITALS.find((h) => h.id === hospitalId);
      if (!hospital) return;

      const created = Date.now();
      const id = generateSessionId();
      const newSession: SandboxSession = {
        id,
        ownerUsername: currentUser.username,
        hospitalId: hospital.id,
        hospitalName: hospital.name,
        hospitalCode: hospital.code,
        status: SessionStatus.PROVISIONING,
        provisionStep: ProvisionStep.FETCHING,
        provisionProgress: 15,
        createdAt: created,
        lastActiveAt: created,
        idleTtlMs: IDLE_TTL_MS,
        maxTtlMs: MAX_TTL_MS,
        cookieNamespace: `sandbox_ck_${id}`,
        mqChannelId: `mq-ch-${id.slice(2, 8).toLowerCase()}`,
        logs: [
          `收到制备请求：目标医院 ${hospital.name} (${hospital.code})`,
          `开始拉取前端构建包 ${hospital.packageName} (${hospital.packageSizeMb} MB)...`,
          ...(simulateFailure ? ['[故障演练] 已注入压缩包校验异常标记'] : []),
        ],
      };

      setSessions((prev) => [newSession, ...prev]);
      setBusinessStates((prev) => ({
        ...prev,
        [id]: createDefaultBusinessState(),
      }));
      setActiveSessionId(id);
    },
    [currentUser, sessions.length]
  );

  const handleDestroySession = useCallback((sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              status: SessionStatus.DESTROYING,
              logs: [...s.logs, '正在释放沙箱工作目录与隔离 Cookie 域...'],
            }
          : s
      )
    );

    window.setTimeout(() => {
      setSessions((prev) => {
        const remaining = prev.filter((s) => s.id !== sessionId);
        setActiveSessionId((currActive) =>
          currActive === sessionId ? (remaining[0]?.id ?? null) : currActive
        );
        return remaining;
      });
      setBusinessStates((prev) => {
        const copy = { ...prev };
        delete copy[sessionId];
        return copy;
      });
    }, 550);
  }, []);

  const handleRetrySession = useCallback(
    (failedSession: SandboxSession) => {
      const targetHospitalId = failedSession.hospitalId;
      setSessions((prev) => prev.filter((s) => s.id !== failedSession.id));
      setBusinessStates((prev) => {
        const copy = { ...prev };
        delete copy[failedSession.id];
        return copy;
      });

      if (!currentUser) return;
      const hospital = HOSPITALS.find((h) => h.id === targetHospitalId);
      if (!hospital) return;

      const created = Date.now();
      const id = generateSessionId();
      const retried: SandboxSession = {
        id,
        ownerUsername: currentUser.username,
        hospitalId: hospital.id,
        hospitalName: hospital.name,
        hospitalCode: hospital.code,
        status: SessionStatus.PROVISIONING,
        provisionStep: ProvisionStep.FETCHING,
        provisionProgress: 20,
        createdAt: created,
        lastActiveAt: created,
        idleTtlMs: IDLE_TTL_MS,
        maxTtlMs: MAX_TTL_MS,
        cookieNamespace: `sandbox_ck_${id}`,
        mqChannelId: `mq-ch-${id.slice(2, 8).toLowerCase()}`,
        logs: [
          `已销毁失败会话 ${failedSession.id} 并发起重新制备`,
          `开始拉取前端构建包 ${hospital.packageName} (${hospital.packageSizeMb} MB)...`,
        ],
      };

      setSessions((prev) => [retried, ...prev]);
      setBusinessStates((prev) => ({
        ...prev,
        [id]: createDefaultBusinessState(),
      }));
      setActiveSessionId(id);
    },
    [currentUser]
  );

  if (!currentUser) {
    return (
      <LoginView
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <SandboxConsole
      user={currentUser}
      hospitals={HOSPITALS}
      sessions={sessions}
      activeSessionId={activeSessionId}
      businessStates={businessStates}
      theme={theme}
      now={now}
      onToggleTheme={handleToggleTheme}
      onLogout={handleLogout}
      onSelectSession={(sid) => {
        setActiveSessionId(sid);
        setSessions((prev) =>
          prev.map((s) => (s.id === sid ? { ...s, lastActiveAt: Date.now() } : s))
        );
      }}
      onProvision={handleProvision}
      onDestroySession={handleDestroySession}
      onRetrySession={handleRetrySession}
    />
  );
}
