import { ReactNode, useEffect, useState } from "react";
import { Link, useRouterState, useRouter, useNavigate } from "@tanstack/react-router";
import { Activity, Bell, Home, ListChecks, LogOut, RefreshCw, UserPlus, Wifi } from "lucide-react";
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

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
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

  return (
    <div className={cn(
      "min-h-screen flex flex-col",
      isMobile ? "bg-background" : "items-center justify-center p-4 sm:p-8"
    )} style={!isMobile ? { background: "var(--gradient-hero)" } : undefined}>
      
      {!isMobile && (
        <div className="hidden lg:flex flex-col items-start mr-8 max-w-xs text-foreground/80">
          <div className="flex items-center gap-3 mb-4">
            <div className="grid place-items-center h-10 w-10 rounded-xl text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold tracking-tight text-foreground text-lg">CHW Field App</div>
              <div className="text-xs text-muted-foreground">Android · iOS · Offline-first</div>
            </div>
          </div>
          <p className="text-sm leading-relaxed mb-4">
            Community Health Workers use the mobile app to register under-five children, 
            screen them with MUAC, and sync data when connectivity is available.
          </p>
          <Link to="/" className="text-xs text-primary hover:underline flex items-center gap-1">
            ← Back to sign in
          </Link>
        </div>
      )}

      <div className={cn(
        "relative w-full bg-background flex flex-col",
        isMobile ? "h-screen" : "max-w-md w-full h-[780px] sm:h-[820px] sm:rounded-[2.5rem] sm:border-[12px] sm:border-foreground/90 sm:shadow-[0_35px_80px_-25px_rgba(0,0,0,0.4)]"
      )}>
        {/* Status Bar (Desktop Only) */}
        {!isMobile && (
          <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-medium text-foreground select-none">
            <span>9:41</span>
            <div className="absolute left-1/2 -translate-x-1/2 top-2.5 h-6 w-32 rounded-full bg-foreground/95" />
            <div className="flex items-center gap-1.5">
              <Wifi className="h-3.5 w-3.5" />
              <span>100%</span>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm sticky top-0 z-10 shrink-0">
          <div className="flex flex-col">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">E-Nutrition · CHW</div>
            <div className="text-lg font-semibold leading-tight text-foreground">{title}</div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate({ to: "/mobile/notifications" })}
              className="relative grid place-items-center h-10 w-10 rounded-full bg-muted/70 hover:bg-muted transition-all duration-200"
            >
              <Bell className="h-4.5 w-4.5 text-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5.5 w-5.5 rounded-full bg-destructive text-white text-[11px] flex items-center justify-center font-bold shadow-sm">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="grid place-items-center h-10 w-10 rounded-full bg-muted/70 hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-all duration-200"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto pb-24 scroll-smooth">
          {children}
        </div>

        {/* Bottom Navigation - Sticky at very bottom */}
        <nav className="sticky bottom-0 left-0 right-0 bg-card border-t border-border pb-3 pt-2 px-3 backdrop-blur-xl bg-card/80 z-20 shrink-0">
          <div className="grid grid-cols-5">
            {tabs.map((t) => {
              const active = location.pathname === t.to;
              const Icon = t.icon;
              return (
                <Link key={t.to} to={t.to} className={cn(
                  "flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all duration-200",
                  active ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}>
                  <Icon className={cn("h-5.5 w-5.5 transition-transform duration-200", active && "scale-115")} />
                  <span className="text-[11px] font-medium">{t.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
