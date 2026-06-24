import { ReactNode, useEffect, useState } from "react";
import { Link, useRouterState, useRouter, useNavigate } from "@tanstack/react-router";
import { Activity, Bell, Home, ListChecks, LogOut, RefreshCw, UserPlus, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { clearAuth } from "@/lib/role";
import { toast } from "sonner";
import { offlineSync } from "@/lib/offline-sync";

const tabs = [
  { to: "/mobile/home", label: "Home", icon: Home },
  { to: "/mobile/register", label: "Register", icon: UserPlus },
  { to: "/mobile/measure", label: "Screen", icon: Activity },
  { to: "/mobile/visits", label: "Visits", icon: ListChecks },
  { to: "/mobile/sync", label: "Sync", icon: RefreshCw },
];

export function PhoneFrame({ title, children }: { title: string; children: ReactNode }) {
  const { location } = useRouterState();
  const router = useRouter();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await api.getNotifications({ limit: 1 });
      setUnreadCount(response.unreadCount);
    } catch (err) {
      console.error("Failed to fetch unread count", err);
    }
  };

  const handleLogout = () => {
    api.logout();
    clearAuth();
    offlineSync.refreshUserContext();
    toast.success("Logged out successfully!");
    router.navigate({ to: "/" });
  };

  /* ─── Real-device view (width < 768px) ─── */
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Offline Banner */}
        {!isOnline && (
          <div className="bg-amber-500 text-white text-[11px] py-1.5 px-4 text-center font-semibold flex items-center justify-center gap-2">
            <WifiOff className="h-3.5 w-3.5" /> WORKING OFFLINE · DATA WILL SYNC LATER
          </div>
        )}
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-border flex items-center justify-between bg-card/80 sticky top-0 z-10">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">E-Nutrition · CHW</div>
            <div className="text-lg font-semibold leading-tight">{title}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate({ to: "/mobile/notifications" })} className="relative grid place-items-center h-10 w-10 rounded-full bg-muted/50 border border-border">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-white text-[10px] flex items-center justify-center font-bold">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            <button onClick={handleLogout} className="grid place-items-center h-10 w-10 rounded-full bg-muted/50 border border-border">
              <LogOut className="h-4.5 w-4.5 text-muted-foreground" />
            </button>
          </div>
        </div>
        {/* Scrollable content */}
        <div className="flex-1 overflow-auto pb-20">{children}</div>
        {/* Bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 bg-card/95 border-t border-border backdrop-blur-xl z-20 pb-safe">
          <div className="grid grid-cols-5 px-2 py-1.5">
            {tabs.map((t) => {
              const active = location.pathname === t.to;
              const Icon = t.icon;
              return (
                <Link key={t.to} to={t.to} className={cn("flex flex-col items-center gap-0.5 py-2 rounded-xl", active ? "text-primary" : "text-muted-foreground")}>
                  <div className="relative">
                    <Icon className="h-5 w-5" />
                    {t.to === "/mobile/sync" && offlineSync.getPendingCount() > 0 && (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-500 border border-card" />
                    )}
                  </div>
                  <span className="text-[10px] font-medium">{t.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    );
  }

  /* ─── Desktop simulator view ─── */
  /*
   * The phone frame is 390px wide (iPhone 14 standard).
   * Height is clamped: we want ~844px (iPhone 14) but never exceed viewport - padding.
   * We use CSS custom properties to keep width/height in sync.
   */
  const PHONE_W = 390;
  const PHONE_H = 844;

  return (
    <div
      className="h-screen flex items-center justify-center overflow-hidden"
      style={{ background: "var(--gradient-hero, linear-gradient(135deg,#d1fae5,#a7f3d0))" }}
    >
      {/* Outer centering wrapper */}
      <div className="flex items-center justify-center gap-10 w-full max-w-5xl px-6 h-full">

        {/* ── Left info panel ── */}
        <div className="hidden xl:flex flex-col items-start w-56 flex-shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="grid place-items-center h-10 w-10 rounded-xl bg-emerald-600 text-white shadow-md">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-foreground text-sm leading-tight">CHW Field App</div>
              <div className="text-xs text-muted-foreground">Android · iOS · Offline-first</div>
            </div>
          </div>
          <p className="text-xs leading-relaxed mb-4 text-foreground/70">
            Community Health Workers use the mobile app to register under-five children,
            screen them with MUAC, and sync data when connectivity is available.
          </p>
          <Link to="/" className="text-xs text-emerald-700 hover:underline font-medium">
            ← Back to sign in
          </Link>
        </div>

        {/* ── Phone shell ── */}
        {/*
         * Strategy: render the phone at its native 390×844 resolution, then
         * CSS-scale it down from the CENTER so it always fits the viewport
         * without clipping the top.  The outer div is sized to the *scaled*
         * dimensions so the layout doesn't reserve extra space.
         */}
        <div
          className="relative flex-shrink-0 flex items-center justify-center"
          ref={(el) => {
            if (!el) return;
            // Available height = viewport minus some breathing room
            const availH = window.innerHeight - 32;
            const availW = window.innerWidth - 520; // leave room for the info panel + gap
            const scaleH = availH / PHONE_H;
            const scaleW = availW / PHONE_W;
            const scale = Math.min(1, scaleH, scaleW);
            el.style.width = `${PHONE_W * scale}px`;
            el.style.height = `${PHONE_H * scale}px`;
            // Store on dataset so the child can read it
            el.dataset.scale = String(scale);
          }}
        >
          {/* The actual phone sized at native resolution, then CSS-scaled down */}
          <div
            className="absolute"
            style={{
              width: PHONE_W,
              height: PHONE_H,
              transformOrigin: "center center",
            }}
            ref={(el) => {
              if (!el) return;
              const parent = el.parentElement as HTMLElement;
              const availH = window.innerHeight - 32;
              const availW = window.innerWidth - 520;
              const scale = Math.min(1, availH / PHONE_H, availW / PHONE_W);
              el.style.transform = `scale(${scale})`;
              parent.style.width = `${PHONE_W * scale}px`;
              parent.style.height = `${PHONE_H * scale}px`;
            }}
          >
            {/* Side buttons */}
            <div className="absolute -left-[11px] top-[18%] w-[5px] h-[26px] bg-neutral-700 rounded-l-[3px]" />
            <div className="absolute -left-[11px] top-[26%] w-[5px] h-[42px] bg-neutral-700 rounded-l-[3px]" />
            <div className="absolute -left-[11px] top-[36%] w-[5px] h-[42px] bg-neutral-700 rounded-l-[3px]" />
            <div className="absolute -right-[11px] top-[28%] w-[5px] h-[68px] bg-neutral-700 rounded-r-[3px]" />

            {/* Phone body */}
            <div
              className="w-full h-full rounded-[52px] border-[12px] border-neutral-900 flex flex-col overflow-hidden"
              style={{
                boxShadow:
                  "0 0 0 1.5px rgba(255,255,255,0.07), 0 60px 120px -30px rgba(15,23,42,0.65), inset 0 1px 0 rgba(255,255,255,0.12)",
                background: "#f8fafc",
              }}
            >
              {/* ── Status bar ── */}
              <div className="relative flex items-center justify-between px-7 pt-3.5 pb-1 text-[12px] font-semibold text-foreground select-none shrink-0">
                <span>9:41</span>
                {/* Dynamic island */}
                <div className="absolute left-1/2 -translate-x-1/2 top-2.5 h-[28px] w-[110px] rounded-full bg-neutral-900" />
                <div className="flex items-center gap-1.5">
                  {isOnline ? (
                    <Wifi className="h-[14px] w-[14px]" />
                  ) : (
                    <WifiOff className="h-[14px] w-[14px] text-red-500" />
                  )}
                  <span>100%</span>
                </div>
              </div>

              {/* Offline banner */}
              {!isOnline && (
                <div className="bg-amber-500 text-white text-[11px] py-1.5 px-4 text-center font-semibold flex items-center justify-center gap-2 shrink-0">
                  <WifiOff className="h-3 w-3" /> WORKING OFFLINE · WILL SYNC LATER
                </div>
              )}

              {/* ── App header ── */}
              <div className="px-5 pt-3 pb-2.5 border-b border-border/60 flex items-center justify-between bg-white/70 backdrop-blur-sm shrink-0">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
                    E-Nutrition · CHW
                  </div>
                  <div className="text-[17px] font-bold leading-tight text-foreground">{title}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate({ to: "/mobile/notifications" })}
                    className="relative grid place-items-center h-9 w-9 rounded-full bg-slate-100 border border-slate-200"
                  >
                    <Bell className="h-[17px] w-[17px] text-foreground" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-[18px] w-[18px] rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="grid place-items-center h-9 w-9 rounded-full bg-slate-100 border border-slate-200"
                  >
                    <LogOut className="h-[15px] w-[15px] text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* ── Page content — scrollable so dense pages don't clip ── */}
              <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>

              {/* ── Bottom tab bar ── */}
              <nav className="shrink-0 bg-white/90 border-t border-border/60 backdrop-blur-xl px-2 pt-2 pb-4">
                <div className="grid grid-cols-5">
                  {tabs.map((t) => {
                    const active = location.pathname === t.to;
                    const Icon = t.icon;
                    return (
                      <Link
                        key={t.to}
                        to={t.to}
                        className={cn(
                          "flex flex-col items-center gap-[3px] py-1.5 rounded-xl transition-colors",
                          active ? "text-emerald-600" : "text-slate-400 hover:text-slate-600",
                        )}
                      >
                        <div className="relative">
                          <Icon className={cn("h-[22px] w-[22px]", active && "stroke-[2.5px]")} />
                          {t.to === "/mobile/sync" && offlineSync.getPendingCount() > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 border-2 border-white" />
                          )}
                        </div>
                        <span className={cn("text-[10px] font-medium", active && "font-bold")}>{t.label}</span>
                      </Link>
                    );
                  })}
                </div>
                {/* Home indicator bar */}
                <div className="flex justify-center mt-2">
                  <div className="h-[5px] w-[130px] rounded-full bg-neutral-900/20" />
                </div>
              </nav>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
