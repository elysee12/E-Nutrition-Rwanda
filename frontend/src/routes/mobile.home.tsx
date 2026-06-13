import { createFileRoute, Link } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/mobile/PhoneFrame";
import { Activity, AlertTriangle, ChevronRight, MapPin, UserPlus, Users, Loader2, Plus, Stethoscope, X, Calendar, Phone, MessageCircle } from "lucide-react";
import { statusColor } from "@/lib/utils";
import { api, type Child, type User, type Assessment, type FollowUp } from "@/lib/api";
import { offlineSync } from "@/lib/offline-sync";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/mobile/home")({ component: Home });

function Home() {
  const [children, setChildren] = useState<Child[]>([]);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(offlineSync.getPendingCount());
  const [showSAMModal, setShowSAMModal] = useState(false);
  const [samFollowUps, setSamFollowUps] = useState<Array<{ followUp: FollowUp; child: Child; assessment: Assessment }>>([]);
  const [loadingSAM, setLoadingSAM] = useState(false);
  const [stats, setStats] = useState({ 
    total: 0, 
    screenedToday: 0, 
    samAlerts: 0, 
    toSync: 0, 
    totalCHWs: 0, 
    facilitiesCovered: 0,
    chwFacilityName: null as string | null 
  });
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  useEffect(() => {
    fetchData();

    // Listen for sync updates
    const handleUpdate = () => {
      setPendingCount(offlineSync.getPendingCount());
    };
    window.addEventListener("enr-sync-updated", handleUpdate);
    return () => window.removeEventListener("enr-sync-updated", handleUpdate);
  }, []);

  // Fetch unread message count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const { unreadCount } = await api.getUnreadMessageCount();
        setUnreadMessageCount(unreadCount);
      } catch (error) {
        console.error("Failed to fetch unread message count:", error);
      }
    };

    fetchUnreadCount();
    // Refresh count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const profile = await api.getProfile();
      const [childrenResponse, dashboardStats] = await Promise.all([
        api.getChildren({ limit: 20 }),
        api.getDashboardStats(),
      ]);

      setChildren(childrenResponse.data);
      setProfile(profile);
      setStats({
        total: dashboardStats.totalChildren || 0,
        screenedToday: dashboardStats.screenedToday || 0,
        samAlerts: dashboardStats.samCount || 0,
        toSync: 0,
        totalCHWs: dashboardStats.chwTotalAssessments || 0,
        facilitiesCovered: dashboardStats.facilitiesCovered || 0,
        chwFacilityName: dashboardStats.chwFacilityName || null,
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
      
      // Get today's follow-ups
      const followUps = await api.getTodayFollowUps();
      
      // Filter for SAM cases and get child + assessment details
      const samCases = await Promise.all(
        followUps
          .filter(f => f.status === 'Scheduled' || f.status === 'Missed')
          .map(async (followUp) => {
            try {
              const [child, assessment] = await Promise.all([
                api.getChild(followUp.childId),
                followUp.assessmentId ? api.getAssessment(followUp.assessmentId) : null,
              ]);
              
              // Only include if child has SAM status
              if (child.currentStatus === 'SAM' || (assessment && assessment.isSAM)) {
                return { followUp, child, assessment };
              }
              return null;
            } catch (err) {
              console.error('Error fetching SAM case details:', err);
              return null;
            }
          })
      );
      
      // Filter out null values and set the data
      const validSamCases = samCases.filter((item): item is { followUp: FollowUp; child: Child; assessment: Assessment } => item !== null);
      setSamFollowUps(validSamCases);
    } catch (err) {
      console.error('Error fetching SAM follow-ups:', err);
      toast.error("Failed to load SAM cases");
    } finally {
      setLoadingSAM(false);
    }
  };

  const handleOpenSAMModal = async () => {
    setShowSAMModal(true);
    await fetchSAMFollowUps();
  };

  if (loading) {
    return (
      <PhoneFrame title="Muraho 👋">
        <div className="p-6 flex items-center justify-center min-h-[350px]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground font-medium">Loading...</span>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame title="Muraho 👋">
      <div className="p-5 space-y-6">
        {/* Welcome Header */}
        <div className="rounded-3xl p-6 text-white bg-gradient-to-br from-[#16a34a] via-[#059669] to-[#047857] shadow-xl">
          <div className="text-[11px] uppercase tracking-[0.2em] opacity-90 flex items-center gap-2 font-semibold mb-4">
            <MapPin className="h-4 w-4" /> 
            {profile?.sector ? `${profile.sector} Sector · ${profile.district || ""}` : "Community Health"}
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-4xl font-extrabold tracking-tight">{stats.total}</div>
              <div className="text-xs opacity-90 mt-1 font-medium">All children covered</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-extrabold tracking-tight">{stats.totalCHWs}</div>
              <div className="text-xs opacity-90 mt-1 font-medium">Assessments completed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold tracking-tight leading-tight break-words">
                {stats.chwFacilityName || "N/A"}
              </div>
              <div className="text-xs opacity-90 mt-1 font-medium">Assigned facility</div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/25 backdrop-blur-md rounded-2xl py-4 px-3 text-center shadow-lg">
              <div className="text-2xl font-extrabold">{stats.screenedToday}</div>
              <div className="text-[10px] opacity-90 font-semibold mt-1">Screened today</div>
            </div>
            <div className="bg-white/25 backdrop-blur-md rounded-2xl py-4 px-3 text-center shadow-lg">
              <div className="text-2xl font-extrabold">{stats.samAlerts}</div>
              <div className="text-[10px] opacity-90 font-semibold mt-1">SAM alerts</div>
            </div>
            <div className="bg-white/25 backdrop-blur-md rounded-2xl py-4 px-3 text-center shadow-lg">
              <div className="text-2xl font-extrabold">{pendingCount}</div>
              <div className="text-[10px] opacity-90 font-semibold mt-1">To sync</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link to="/mobile/register" className="rounded-2xl border border-border p-5 bg-card hover:border-emerald-400/50 hover:shadow-xl transition-all duration-300 group">
            <div className="grid place-items-center h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600 mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300">
              <UserPlus className="h-6 w-6" />
            </div>
            <div className="text-base font-semibold text-foreground">Register child</div>
            <div className="text-xs text-muted-foreground mt-1">New under-five</div>
          </Link>
          <Link to="/mobile/measure" className="rounded-2xl border border-border p-5 bg-card hover:border-blue-400/50 hover:shadow-xl transition-all duration-300 group">
            <div className="grid place-items-center h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300">
              <Activity className="h-6 w-6" />
            </div>
            <div className="text-base font-semibold text-foreground">Screen / MUAC</div>
            <div className="text-xs text-muted-foreground mt-1">Quick measurement</div>
          </Link>
          <Link to="/mobile/chat" search={{ view: 'list' }} className="rounded-2xl border border-border p-5 bg-card hover:border-purple-400/50 hover:shadow-xl transition-all duration-300 group relative">
            <div className="grid place-items-center h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-50 text-purple-600 mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div className="text-base font-semibold text-foreground">Messages</div>
            <div className="text-xs text-muted-foreground mt-1">Chat with admin</div>
            {unreadMessageCount > 0 && (
              <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shadow-lg animate-pulse">
                {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
              </div>
            )}
          </Link>
          <Link to="/mobile/visits" className="rounded-2xl border border-border p-5 bg-card hover:border-orange-400/50 hover:shadow-xl transition-all duration-300 group">
            <div className="grid place-items-center h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-100 to-orange-50 text-orange-600 mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300">
              <Calendar className="h-6 w-6" />
            </div>
            <div className="text-base font-semibold text-foreground">Follow-ups</div>
            <div className="text-xs text-muted-foreground mt-1">Scheduled visits</div>
          </Link>
        </div>

        {/* Today's Tasks */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-foreground">Today's tasks</h3>
            <Link to="/mobile/visits" className="text-xs font-medium text-primary hover:text-emerald-700 transition-colors">See all</Link>
          </div>
          <div className="space-y-3">
            <button 
              onClick={handleOpenSAMModal}
              className="w-full flex items-center gap-4 rounded-2xl border border-border bg-card p-4 hover:shadow-lg hover:border-red-300 transition-all duration-200"
            >
              <div className="h-12 w-12 rounded-2xl grid place-items-center bg-red-50 text-red-600 shadow-sm">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-sm font-semibold text-foreground truncate">Check SAM cases</div>
                <div className="text-xs text-muted-foreground mt-1 truncate">Follow up · Today</div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </section>

        {/* Recent Children */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Recent children
            </h3>
          </div>
          <div className="space-y-3">
            {children.map((c) => (
              <div key={c.id} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 hover:shadow-lg transition-all duration-200">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-700 grid place-items-center text-sm font-bold shadow-sm">
                  {c.name.split(" ").map((n)=>n[0]).slice(0,2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{c.ageMonths}mo · {c.village}</div>
                </div>
                <span className={`text-[11px] px-3 py-1 rounded-full font-semibold ${statusColor(c.currentStatus)}`}>{c.currentStatus}</span>
              </div>
            ))}
            {children.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-2xl">
                No children yet
              </div>
            )}
          </div>
        </section>
      </div>

      {/* SAM Cases Modal */}
      <Dialog open={showSAMModal} onOpenChange={setShowSAMModal}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              SAM Cases - Today's Follow-ups
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {loadingSAM ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Loading SAM cases...</span>
              </div>
            ) : samFollowUps.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-16 w-16 rounded-full bg-emerald-50 text-emerald-600 grid place-items-center mx-auto mb-3">
                  <AlertTriangle className="h-8 w-8" />
                </div>
                <p className="text-sm font-medium text-foreground">No SAM cases today</p>
                <p className="text-xs text-muted-foreground mt-1">All follow-ups are complete or no SAM cases scheduled</p>
              </div>
            ) : (
              samFollowUps.map(({ followUp, child, assessment }) => (
                <div key={followUp.id} className="rounded-xl border border-red-200 bg-red-50/50 p-4 space-y-3">
                  {/* Child Info */}
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-red-100 to-red-50 text-red-700 grid place-items-center text-sm font-bold shadow-sm flex-shrink-0">
                      {child.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-foreground truncate">{child.name}</h4>
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">SAM</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {child.ageMonths} months · {child.sex === 'M' ? 'Male' : 'Female'}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {child.village}, {child.sector}
                      </div>
                    </div>
                  </div>

                  {/* Assessment Details */}
                  {assessment && (
                    <div className="rounded-lg bg-white/80 p-3 space-y-2 border border-red-100">
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Last Assessment</div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="text-muted-foreground">Weight</div>
                          <div className="font-semibold">{assessment.weightKg} kg</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Height</div>
                          <div className="font-semibold">{assessment.heightCm} cm</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">MUAC</div>
                          <div className="font-semibold">{assessment.muacCm} cm</div>
                        </div>
                      </div>
                      {assessment.diagnosis && (
                        <div className="pt-2 border-t border-red-100">
                          <div className="text-[11px] text-muted-foreground">Diagnosis</div>
                          <div className="text-xs mt-1">{assessment.diagnosis}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Follow-up Info */}
                  <div className="rounded-lg bg-white/80 p-3 border border-red-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Follow-up</div>
                        <div className="text-xs mt-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(followUp.scheduledDate).toLocaleDateString()}
                        </div>
                        {followUp.reason && (
                          <div className="text-xs text-muted-foreground mt-1">{followUp.reason}</div>
                        )}
                      </div>
                      <Badge 
                        variant={followUp.status === 'Missed' ? 'destructive' : 'outline'}
                        className="text-[10px]"
                      >
                        {followUp.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Caregiver Contact */}
                  {child.caregiverPhone && (
                    <div className="flex items-center gap-2 pt-2 border-t border-red-100">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Caregiver:</span>
                      <a 
                        href={`tel:${child.caregiverPhone}`} 
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        {child.caregiverPhone}
                      </a>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Link 
                      to={`/mobile/children/${child.id}`}
                      className="flex-1 text-center text-xs font-medium py-2 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      View Details
                    </Link>
                    <Link 
                      to="/mobile/measure"
                      state={{ childId: child.id }}
                      className="flex-1 text-center text-xs font-medium py-2 px-3 rounded-lg border border-primary text-primary hover:bg-primary/10 transition-colors"
                    >
                      New Assessment
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button 
              variant="outline" 
              onClick={() => setShowSAMModal(false)}
              className="flex-1"
            >
              Close
            </Button>
            <Link to="/mobile/visits" className="flex-1">
              <Button className="w-full">
                View All Follow-ups
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </PhoneFrame>
  );
}
