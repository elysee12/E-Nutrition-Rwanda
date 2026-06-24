import { ReactNode, useEffect, useState } from "react";
import { Link, useRouterState, useRouter, useNavigate } from "@tanstack/react-router";
import {
  Activity, Bell, Home, ListChecks, LogOut, RefreshCw, UserPlus, Wifi, WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { clearAuth } from "@/lib/role";
import { toast } from "sonner";
import { offlineSync } from "@/lib/offline-sync";

const tabs = [
  { to: "/mobile/home",     label: "Home",     icon: Home },
  { to: "/mobile/register", label: "Register", icon: UserPlus },
  { to: "/mobile/measure",  label: "Screen",   icon: Activity },
  { to: "/mobile/visits",   label: "Visits",   icon: ListChecks },
  { to: "/mobile/sync",     label: "Sync",     icon: RefreshCw },
];

export function PhoneFrame({ title, children }: { title: string; children: ReactNode }) {
  const { location } = useRouterState();
  const router   = useRouter();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobile,    setIsMobile]    = useState(false);
  const [isOnline,    setIsOnline]    = useState(navigator.onLine);

  useEffect(() => {
    const up   = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener("online",  up);
    window.addEventListener("offline", down);
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("online",  up);
      window.removeEventListener("offline", down);
      window.removeEventListener("resize",  check);
    };
  }, []);

  useEffect(() => { fetchUnreadCount(); }, []);

  const fetchUnreadCount = async () => {
    try {
      const r = await api.getNotifications({ limit: 1 });
      setUnreadCount(r.unreadCount);
    } catch {}
  };

  const handleLogout = () => {
    api.logout();
    clearAuth();
    offlineSync.refreshUserContext();
    toast.success("Logged out successfully!");
    router.navigate({ to: "/" });
  };

  /* ══════════════════════════════════════════════════════
     REAL DEVICE  (viewport < 768 px)
  ══════════════════════════════════════════════════════ */
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {!isOnline && (
          <div className="bg-amber-500 text-white text-[11px] py-1.5 px-4 text-center font-semibold flex items-center justify-center gap-2">
            <WifiOff className="h-3.5 w-3.5" /> WORKING OFFLINE · DATA WILL SYNC LATER
          </div>
        )}
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
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto pb-20">{children}</div>
        <nav className="fixed bottom-0 left-0 right-0 bg-card/95 border-t border-border backdrop-blur-xl z-20">
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

  /* ══════════════════════════════════════════════════════
     DESKTOP SIMULATOR

     Sizing strategy
     ───────────────
     • The phone shell is a fixed 375 × 780 px — close to an iPhone 14
       Pro rendered at 80 % of its logical resolution. This looks crisp
       and proportional on a typical 1280–1920 px laptop at 100 % zoom.
     • The outer page is NOT h-screen / overflow-hidden, so when the
       user zooms in the browser's own scroll-bar appears naturally.
     • Internal chrome (status bar, header, nav) uses fixed px sizes
       that match real iOS metrics. Only the content area scrolls.
  ══════════════════════════════════════════════════════ */
  return (
    <div
      className="min-h-screen flex items-center justify-center py-10 px-6"
      style={{ background: "linear-gradient(145deg, #e8fdf2 0%, #d0f5e8 50%, #c5f0e2 100%)" }}
    >
      <div className="flex items-center gap-14">

        {/* ── Left description panel ── */}
        <div className="hidden xl:flex flex-col gap-5 w-64 flex-shrink-0">
          {/* App identity */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-emerald-600 grid place-items-center shadow-lg shadow-emerald-200">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-base leading-tight">CHW Field App</p>
              <p className="text-xs text-slate-500 mt-0.5">Android · iOS · Offline-first</p>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-600 leading-relaxed">
            Community Health Workers use the mobile app to register under-five
            children, screen them with MUAC, and sync data when connectivity
            is available.
          </p>

          {/* Feature badges */}
          <div className="flex flex-col gap-2">
            {[
              { dot: "bg-emerald-500", text: "Offline-first with local sync" },
              { dot: "bg-blue-500",    text: "WHO z-score classification" },
              { dot: "bg-purple-500",  text: "Instant SAM/MAM referrals" },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-2.5">
                <div className={`h-2 w-2 rounded-full flex-shrink-0 ${f.dot}`} />
                <span className="text-xs text-slate-600">{f.text}</span>
              </div>
            ))}
          </div>

          <Link to="/" className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 transition-colors">
            ← Back to sign in
          </Link>
        </div>

        {/* ── Phone shell ── */}
        <div className="relative flex-shrink-0" style={{ width: 375, height: 780 }}>

          {/* Physical side buttons */}
          {/* Silent switch */}
          <div className="absolute -left-[10px] top-[96px] w-[4px] h-[32px] bg-neutral-700 rounded-l-[3px] shadow-sm" />
          {/* Volume up */}
          <div className="absolute -left-[10px] top-[148px] w-[4px] h-[56px] bg-neutral-700 rounded-l-[3px] shadow-sm" />
          {/* Volume down */}
          <div className="absolute -left-[10px] top-[220px] w-[4px] h-[56px] bg-neutral-700 rounded-l-[3px] shadow-sm" />
          {/* Power */}
          <div className="absolute -right-[10px] top-[160px] w-[4px] h-[80px] bg-neutral-700 rounded-r-[3px] shadow-sm" />

          {/* Outer bezel */}
          <div
            className="absolute inset-0 rounded-[48px] border-[10px] border-neutral-900"
            style={{
              boxShadow: [
                "0 0 0 1px rgba(255,255,255,0.06)",          /* rim highlight */
                "0 2px 4px rgba(0,0,0,0.3)",                 /* tight inner shadow */
                "0 20px 60px -10px rgba(15,23,42,0.50)",     /* soft lift */
                "0 50px 100px -30px rgba(15,23,42,0.35)",    /* long ambient */
                "inset 0 1px 0 rgba(255,255,255,0.10)",      /* glass top */
              ].join(", "),
            }}
          />

          {/* Screen — inset by the bezel */}
          <div className="absolute inset-[10px] rounded-[38px] bg-slate-50 flex flex-col overflow-hidden">

            {/* ── iOS status bar ── */}
            <div className="relative flex items-center justify-between px-6 pt-3 pb-1 select-none shrink-0">
              <span className="text-[13px] font-semibold text-slate-900">9:41</span>
              {/* Dynamic island */}
              <div className="absolute left-1/2 -translate-x-1/2 top-2 h-[28px] w-[120px] rounded-full bg-neutral-900" />
              <div className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-900">
                {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4 text-red-500" />}
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
            <div className="px-5 pt-3 pb-2.5 border-b border-slate-200/70 flex items-center justify-between bg-white/80 backdrop-blur-md shrink-0">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400 font-bold">
                  E-Nutrition · CHW
                </p>
                <p className="text-[18px] font-bold leading-tight text-slate-900 mt-0.5">{title}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate({ to: "/mobile/notifications" })}
                  className="relative grid place-items-center h-9 w-9 rounded-full bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-colors"
                >
                  <Bell className="h-[17px] w-[17px] text-slate-700" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-[18px] w-[18px] rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold shadow">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={handleLogout}
                  className="grid place-items-center h-9 w-9 rounded-full bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-colors"
                >
                  <LogOut className="h-[15px] w-[15px] text-slate-500" />
                </button>
              </div>
            </div>

            {/* ── Scrollable page content ── */}
            <div className="flex-1 overflow-y-auto overscroll-contain bg-slate-50">
              {children}
            </div>

            {/* ── Bottom tab bar ── */}
            <nav className="shrink-0 bg-white/95 border-t border-slate-200/80 backdrop-blur-xl px-3 pt-2 pb-5">
              <div className="grid grid-cols-5">
                {tabs.map((t) => {
                  const active = location.pathname === t.to;
                  const Icon = t.icon;
                  return (
                    <Link
                      key={t.to}
                      to={t.to}
                      className={cn(
                        "flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all duration-150",
                        active
                          ? "text-emerald-600"
                          : "text-slate-400 hover:text-slate-600",
                      )}
                    >
                      <div className="relative">
                        <Icon
                          className={cn(
                            "h-[22px] w-[22px] transition-all",
                            active ? "stroke-[2.5px]" : "stroke-[1.75px]",
                          )}
                        />
                        {t.to === "/mobile/sync" && offlineSync.getPendingCount() > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 border-2 border-white" />
                        )}
                      </div>
                      <span className={cn("text-[10.5px]", active ? "font-bold" : "font-medium")}>
                        {t.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
              {/* Home indicator pill */}
              <div className="flex justify-center mt-2.5">
                <div className="h-[5px] w-32 rounded-full bg-slate-900/15" />
              </div>
            </nav>
          </div>
        </div>

      </div>
    </div>
  );
}
