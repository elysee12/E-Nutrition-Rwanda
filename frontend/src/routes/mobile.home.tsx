import { createFileRoute, Link } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/mobile/PhoneFrame";
import {
  Activity,
  AlertTriangle,
  Calendar,
  ChevronRight,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  UserPlus,
  Users,
} from "lucide-react";
import { statusColor } from "@/lib/utils";
import { api, type Child, type User, type Assessment, type FollowUp } from "@/lib/api";
import { offlineSync } from "@/lib/offline-sync";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/mobile/home")({ component: Home });

// ─────────────────────────────────────────────────────────────────────────────

function Home() {
  const [children, setChildren] = useState<Child[]>([]);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(offlineSync.getPendingCount());
  const [showSAMModal, setShowSAMModal] = useState(false);
  const [samFollowUps, setSamFollowUps] = useState<
    Array<{ followUp: FollowUp; child: Child; assessment: Assessment }>
  >([]);
  const [loadingSAM, setLoadingSAM] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    screenedToday: 0,
    samAlerts: 0,
    totalCHWs: 0,
    chwFacilityName: null as string | null,
  });
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  useEffect(() => {
    fetchData();
    const handleUpdate = () => setPendingCount(offlineSync.getPendingCount());
    window.addEventListener("enr-sync-updated", handleUpdate);
    return () => window.removeEventListener("enr-sync-updated", handleUpdate);
  }, []);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const { unreadCount } = await api.getUnreadMessageCount();
        setUnreadMessageCount(unreadCount);
      } catch {}
    };
    fetchUnreadCount();
    const id = setInterval(fetchUnreadCount, 30_000);
    return () => clearInterval(id);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const prof = await api.getProfile();
      const [childrenRes, dash] = await Promise.all([
        api.getChildren({ limit: 3 }),
        api.getDashboardStats(),
      ]);
      setChildren(childrenRes.data);
      setProfile(prof);
      setStats({
        total: dash.totalChildren || 0,
        screenedToday: dash.screenedToday || 0,
        samAlerts: dash.samCount || 0,
        totalCHWs: dash.chwTotalAssessments || 0,
        chwFacilityName: dash.chwFacilityName || null,
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load home data");
    } finally {
      setLoading(false);
    }
  };

  const fetchSAMFollowUps = async () => {
    try {
      setLoadingSAM(true);
      const followUps = await api.getTodayFollowUps();
      const samCases = await Promise.all(
        followUps
          .filter((f) => f.status === "Scheduled" || f.status === "Missed")
          .map(async (followUp) => {
            try {
              const [child, assessment] = await Promise.all([
                api.getChild(followUp.childId),
                followUp.assessmentId ? api.getAssessment(followUp.assessmentId) : null,
              ]);
              if (child.currentStatus === "SAM" || (assessment && assessment.isSAM)) {
                return { followUp, child, assessment };
              }
              return null;
            } catch {
              return null;
            }
          }),
      );
      setSamFollowUps(
        samCases.filter(
          (x): x is { followUp: FollowUp; child: Child; assessment: Assessment } => x !== null,
        ),
      );
    } catch {
      toast.error("Failed to load SAM cases");
    } finally {
      setLoadingSAM(false);
    }
  };

  const handleOpenSAMModal = () => {
    setShowSAMModal(true);
    fetchSAMFollowUps();
  };

  // ── loading state ──
  if (loading) {
    return (
      <PhoneFrame title="Muraho 👋">
        <div className="h-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <span className="text-xs text-muted-foreground font-medium">Loading…</span>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame title="Muraho 👋">
      {/*
       * SINGLE-SCREEN layout — no overflow, no scroll.
       * Uses a flex-col that fills the phone's content area (flex-1 overflow-hidden).
       * Every section gets a proportional flex share.
       */}
      <div className="h-full flex flex-col px-4 py-3 gap-3 overflow-hidden">

        {/* ── 1. Stats hero card ── */}
        <div className="shrink-0 rounded-2xl px-4 py-3 text-white bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 shadow-lg">
          {/* Location pill */}
          <div className="flex items-center gap-1.5 mb-3">
            <MapPin className="h-3 w-3 opacity-80 shrink-0" />
            <span className="text-[10px] uppercase tracking-[0.18em] opacity-90 font-semibold truncate">
              {profile?.sector
                ? `${profile.sector} Sector · ${profile.district || ""}`
                : "Community Health"}
            </span>
          </div>

          {/* Top numbers */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <StatCell value={stats.total} label="Children" />
            <StatCell value={stats.totalCHWs} label="Assessments" />
            <StatCell
              value={stats.chwFacilityName ?? "N/A"}
              label="Facility"
              small
            />
          </div>

          {/* Bottom metric pills */}
          <div className="grid grid-cols-3 gap-2">
            <MetricPill value={stats.screenedToday} label="Screened today" />
            <MetricPill value={stats.samAlerts} label="SAM alerts" alert={stats.samAlerts > 0} />
            <MetricPill value={pendingCount} label="To sync" />
          </div>
        </div>

        {/* ── 2. Quick actions — horizontal icon row ── */}
        <div className="shrink-0">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2 px-0.5">
            Quick actions
          </p>
          <div className="grid grid-cols-4 gap-2">
            <QuickAction
              to="/mobile/register"
              icon={<UserPlus className="h-5 w-5" />}
              label="Register"
              color="emerald"
            />
            <QuickAction
              to="/mobile/measure"
              icon={<Activity className="h-5 w-5" />}
              label="Screen"
              color="blue"
            />
            <QuickAction
              to="/mobile/chat"
              search={{ view: "list" }}
              icon={<MessageCircle className="h-5 w-5" />}
              label="Messages"
              color="purple"
              badge={unreadMessageCount}
            />
            <QuickAction
              to="/mobile/visits"
              icon={<Calendar className="h-5 w-5" />}
              label="Visits"
              color="orange"
            />
          </div>
        </div>

        {/* ── 3. Today task ── */}
        <div className="shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold px-0.5">
              Today's task
            </p>
            <Link to="/mobile/visits" className="text-[10px] text-emerald-600 font-semibold">
              See all
            </Link>
          </div>
          <button
            onClick={handleOpenSAMModal}
            className="w-full flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50/60 px-3.5 py-3 hover:bg-red-50 transition-colors"
          >
            <div className="h-9 w-9 rounded-xl grid place-items-center bg-red-100 text-red-600 shrink-0">
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-[13px] font-semibold text-foreground">Check SAM cases</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Follow up · Today</div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        </div>

        {/* ── 4. Recent children — flex-1 so it fills remaining space ── */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-1.5 shrink-0">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold px-0.5 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Recent children
            </p>
          </div>

          {/* Children list fills remaining height, with scroll only here if needed */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5">
            {children.length === 0 ? (
              <div className="h-full flex items-center justify-center border border-dashed border-border rounded-2xl">
                <span className="text-xs text-muted-foreground">No children registered yet</span>
              </div>
            ) : (
              children.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-white px-3.5 py-2.5 shadow-sm"
                >
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-700 grid place-items-center text-[11px] font-bold shrink-0">
                    {c.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-foreground truncate">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {c.ageMonths}mo · {c.village}
                    </div>
                  </div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold shrink-0 ${statusColor(c.currentStatus)}`}>
                    {c.currentStatus}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ── SAM Cases Modal ── */}
      <Dialog open={showSAMModal} onOpenChange={setShowSAMModal}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              SAM Cases — Today's Follow-ups
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {loadingSAM ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Loading SAM cases…</span>
              </div>
            ) : samFollowUps.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-14 w-14 rounded-full bg-emerald-50 text-emerald-600 grid place-items-center mx-auto mb-3">
                  <AlertTriangle className="h-7 w-7" />
                </div>
                <p className="text-sm font-semibold text-foreground">No SAM cases today</p>
                <p className="text-xs text-muted-foreground mt-1">
                  All follow-ups complete or no SAM cases scheduled
                </p>
              </div>
            ) : (
              samFollowUps.map(({ followUp, child, assessment }) => (
                <div key={followUp.id} className="rounded-xl border border-red-200 bg-red-50/40 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-red-100 text-red-700 grid place-items-center text-xs font-bold shrink-0">
                      {child.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold truncate">{child.name}</h4>
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">SAM</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {child.ageMonths}mo · {child.sex === "M" ? "Male" : "Female"}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {child.village}, {child.sector}
                      </div>
                    </div>
                  </div>

                  {assessment && (
                    <div className="rounded-lg bg-white/80 p-3 space-y-1.5 border border-red-100">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                        Last Assessment
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {[
                          { label: "Weight", val: `${assessment.weightKg} kg` },
                          { label: "Height", val: `${assessment.heightCm} cm` },
                          { label: "MUAC", val: `${assessment.muacCm} cm` },
                        ].map((m) => (
                          <div key={m.label}>
                            <div className="text-muted-foreground">{m.label}</div>
                            <div className="font-semibold">{m.val}</div>
                          </div>
                        ))}
                      </div>
                      {assessment.diagnosis && (
                        <div className="pt-1.5 border-t border-red-100">
                          <div className="text-[10px] text-muted-foreground">Diagnosis</div>
                          <div className="text-xs mt-0.5">{assessment.diagnosis}</div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="rounded-lg bg-white/80 p-3 border border-red-100 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                        Follow-up
                      </div>
                      <div className="text-xs mt-0.5 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(followUp.scheduledDate).toLocaleDateString()}
                      </div>
                      {followUp.reason && (
                        <div className="text-xs text-muted-foreground mt-0.5">{followUp.reason}</div>
                      )}
                    </div>
                    <Badge
                      variant={followUp.status === "Missed" ? "destructive" : "outline"}
                      className="text-[10px]"
                    >
                      {followUp.status}
                    </Badge>
                  </div>

                  {child.caregiverPhone && (
                    <div className="flex items-center gap-2 pt-1 border-t border-red-100">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Caregiver:</span>
                      <a href={`tel:${child.caregiverPhone}`} className="text-xs font-medium text-primary hover:underline">
                        {child.caregiverPhone}
                      </a>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Link
                      to={`/mobile/children/${child.id}`}
                      className="flex-1 text-center text-xs font-semibold py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      View Details
                    </Link>
                    <Link
                      to="/mobile/measure"
                      state={{ childId: child.id }}
                      className="flex-1 text-center text-xs font-semibold py-2 rounded-lg border border-primary text-primary hover:bg-primary/10 transition-colors"
                    >
                      New Assessment
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setShowSAMModal(false)} className="flex-1">
              Close
            </Button>
            <Link to="/mobile/visits" className="flex-1" onClick={() => setShowSAMModal(false)}>
              <Button className="w-full">All Follow-ups</Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </PhoneFrame>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCell({
  value,
  label,
  small,
}: {
  value: string | number;
  label: string;
  small?: boolean;
}) {
  return (
    <div className="text-center">
      <div
        className={
          small
            ? "text-[13px] font-bold leading-tight line-clamp-2 break-words"
            : "text-[28px] font-extrabold tracking-tight leading-none"
        }
      >
        {value}
      </div>
      <div className="text-[9px] opacity-80 mt-1 font-semibold uppercase tracking-wide">{label}</div>
    </div>
  );
}

function MetricPill({
  value,
  label,
  alert,
}: {
  value: number;
  label: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-xl py-2 px-1 text-center ${
        alert ? "bg-red-400/30 ring-1 ring-red-300/50" : "bg-white/15"
      }`}
    >
      <div className="text-[18px] font-extrabold leading-none">{value}</div>
      <div className="text-[8px] opacity-90 font-semibold mt-0.5 uppercase tracking-wide leading-tight">
        {label}
      </div>
    </div>
  );
}

const colorMap: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-600",
  blue: "bg-blue-50 text-blue-600",
  purple: "bg-purple-50 text-purple-600",
  orange: "bg-orange-50 text-orange-600",
};

function QuickAction({
  to,
  icon,
  label,
  color,
  badge,
  search,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  color: string;
  badge?: number;
  search?: Record<string, unknown>;
}) {
  return (
    <Link
      to={to}
      search={search as any}
      className="relative flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-white px-2 py-3 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className={`grid place-items-center h-10 w-10 rounded-xl ${colorMap[color] ?? colorMap.emerald}`}>
        {icon}
      </div>
      <span className="text-[11px] font-semibold text-foreground">{label}</span>
      {badge != null && badge > 0 && (
        <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shadow">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}
