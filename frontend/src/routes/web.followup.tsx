import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/web/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, CheckCircle2, AlertTriangle, Clock, Loader2, List } from "lucide-react";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { statusColor } from "@/lib/utils";
import { useState, useMemo, useEffect } from "react";
import { api, type FollowUp, type PaginatedResponse } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/web/followup")({
  head: () => ({ meta: [{ title: "Follow-up — E-Nutrition Rwanda" }] }),
  component: FollowupPage,
});

function FollowupPage() {
  const [todayFollowups, setTodayFollowups] = useState<FollowUp[]>([]);
  const [upcomingFollowups, setUpcomingFollowups] = useState<FollowUp[]>([]);
  const [allFollowups, setAllFollowups] = useState<PaginatedResponse<FollowUp>>({
    data: [],
    meta: { total: 0, page: 1, limit: 10, totalPages: 1 }
  });
  const [loading, setLoading] = useState(true);
  
  // Helper to get most recent follow-up per child
  const getMostRecentPerChild = (followupsList: FollowUp[]) => {
    const childMap = new Map<string, FollowUp>();
    for (const f of followupsList) {
      const existing = childMap.get(f.child.id);
      if (!existing || new Date(f.scheduledDate) > new Date(existing.scheduledDate)) {
        childMap.set(f.child.id, f);
      }
    }
    return Array.from(childMap.values());
  };
  
  // Helper to filter follow-ups: only keep if child still needs follow-up (SAM/MAM)
  const filterActiveFollowUps = (followupsList: FollowUp[]) => {
    return followupsList.filter(f => {
      // If follow-up is already completed, keep it for history
      if (f.status === "Completed") return true;
      // Otherwise, check if child's current status is still SAM or MAM
      return f.child.currentStatus === "SAM" || f.child.currentStatus === "MAM";
    });
  };
  
  // Pagination state
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [upcomingPageSize, setUpcomingPageSize] = useState(10);
  const [allPage, setAllPage] = useState(1);
  const [allPageSize, setAllPageSize] = useState(10);

  useEffect(() => {
    fetchFollowups();
  }, []);

  const fetchFollowups = async () => {
    try {
      setLoading(true);
      
      // Fetch today's follow-ups
      const todayData = await api.getTodayFollowUps();
      setTodayFollowups(todayData);

      // Fetch upcoming follow-ups
      const upcomingData = await api.getUpcomingFollowUps();
      setUpcomingFollowups(upcomingData);
      
      // Fetch all follow-ups
      const allData = await api.getFollowUps({ page: allPage, limit: allPageSize });
      setAllFollowups(allData);
      
    } catch (error) {
      console.error("Failed to fetch follow-ups:", error);
      toast.error("Failed to load follow-up schedule.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartVisit = async (followUpId: string) => {
    try {
      await api.updateFollowUp(followUpId, { status: "Completed" });
      toast.success("Follow-up visit completed");
      fetchFollowups(); // Refresh data
    } catch (error) {
      console.error("Failed to complete visit:", error);
      toast.error("Failed to complete visit");
    }
  };

  // Deduplicated AND filtered follow-up lists (most recent per child, active only)
  const dedupedToday = useMemo(() => 
    filterActiveFollowUps(getMostRecentPerChild(todayFollowups)), 
    [todayFollowups]
  );
  const dedupedUpcoming = useMemo(() => 
    filterActiveFollowUps(getMostRecentPerChild(upcomingFollowups)), 
    [upcomingFollowups]
  );
  const dedupedAll = useMemo(() => 
    getMostRecentPerChild(allFollowups.data), 
    [allFollowups.data]
  );
  
  // Paginated upcoming follow-ups (deduplicated and filtered)
  const paginatedUpcoming = useMemo(() => {
    const start = (upcomingPage - 1) * upcomingPageSize;
    return dedupedUpcoming.slice(start, start + upcomingPageSize);
  }, [dedupedUpcoming, upcomingPage, upcomingPageSize]);
  
  // Paginated all follow-ups (deduplicated)
  const paginatedAll = useMemo(() => {
    const start = (allPage - 1) * allPageSize;
    return dedupedAll.slice(start, start + allPageSize);
  }, [dedupedAll, allPage, allPageSize]);

  const completedCount = dedupedToday.filter(f => f.status === "Completed").length;
  const pendingCount = dedupedToday.filter(f => f.status === "Scheduled").length;

  if (loading) {
    return (
      <>
        <TopBar title="Follow-up Schedule" subtitle="Manage scheduled follow-up visits and track child progress" />
        <div className="p-8 flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading follow-up schedule...</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Follow-up Schedule" subtitle="Manage scheduled follow-up visits and track child progress" />
      <div className="p-8 space-y-6 bg-gradient-to-br from-slate-50 to-white min-h-screen">
        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-5 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Follow-ups</p>
                <p className="text-3xl font-bold text-slate-900">{dedupedToday.length}</p>
              </div>
              <div className="grid place-items-center h-12 w-12 rounded-xl bg-emerald-50">
                <Calendar className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </Card>
          
          <Card className="p-5 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed Today</p>
                <p className="text-3xl font-bold text-slate-900">{completedCount}</p>
              </div>
              <div className="grid place-items-center h-12 w-12 rounded-xl bg-blue-50">
                <CheckCircle2 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-5 border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Today</p>
                <p className="text-3xl font-bold text-slate-900">{pendingCount}</p>
              </div>
              <div className="grid place-items-center h-12 w-12 rounded-xl bg-amber-50">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid w-full md:w-[400px] grid-cols-3">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="mt-4">
            {/* Today's Follow-ups */}
            <Card>
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Today's Schedule</h2>
                    <p className="text-sm text-slate-600 mt-1">Follow-up visits scheduled for {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    {pendingCount} pending
                  </Badge>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Time</TableHead>
                    <TableHead>Child ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Caregiver</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dedupedToday.map((f) => (
                    <TableRow key={f.id} className={f.status === "Completed" ? "opacity-60" : ""}>
                      <TableCell className="font-medium">
                        {new Date(f.scheduledDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{f.child.code}</TableCell>
                      <TableCell className="font-medium">{f.child.name}</TableCell>
                      <TableCell className="text-sm">{f.child.ageMonths} mo</TableCell>
                      <TableCell>
                        <span className={`text-[10px] px-2 py-1 rounded-full border ${statusColor(f.child.currentStatus)}`}>
                          {f.child.currentStatus}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{f.reason || 'Routine check-up'}</TableCell>
                      <TableCell className="text-sm">{f.child.caregiverName || 'N/A'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{f.child.caregiverPhone || 'N/A'}</TableCell>
                      <TableCell>
                        {f.status === "Completed" ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => handleStartVisit(f.id)}>
                            Complete Visit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {dedupedToday.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                        No follow-ups scheduled for today
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="upcoming" className="mt-4">
            {/* Upcoming Follow-ups */}
            <Card>
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-slate-900">Upcoming Follow-ups</h2>
                <p className="text-sm text-slate-600 mt-1">Scheduled visits for the next 7 days</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Date</TableHead>
                    <TableHead>Child ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Contact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUpcoming.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">
                        {new Date(f.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{f.child.code}</TableCell>
                      <TableCell className="font-medium">{f.child.name}</TableCell>
                      <TableCell className="text-sm">{f.child.ageMonths} mo</TableCell>
                      <TableCell>
                        <span className={`text-[10px] px-2 py-1 rounded-full border ${statusColor(f.child.currentStatus)}`}>
                          {f.child.currentStatus}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{f.reason || 'Routine check-up'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {f.child.village}, {f.child.sector}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{f.child.caregiverPhone || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                  {paginatedUpcoming.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                        No upcoming follow-ups scheduled
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {dedupedUpcoming.length > 0 && (
                <DataTablePagination
                  currentPage={upcomingPage}
                  totalPages={Math.ceil(dedupedUpcoming.length / upcomingPageSize)}
                  pageSize={upcomingPageSize}
                  totalItems={dedupedUpcoming.length}
                  onPageChange={setUpcomingPage}
                  onPageSizeChange={setUpcomingPageSize}
                />
              )}
            </Card>
          </TabsContent>

          <TabsContent value="all" className="mt-4">
            {/* All Follow-ups */}
            <Card>
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">All Follow-ups</h2>
                  <Button size="sm" onClick={fetchFollowups}>
                    <List className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Date</TableHead>
                    <TableHead>Child ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Facility</TableHead>
                    <TableHead>Contact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAll.map((f) => (
                    <TableRow key={f.id} className={f.status === "Completed" ? "opacity-60" : ""}>
                      <TableCell className="font-medium">
                        {new Date(f.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{f.child.code}</TableCell>
                      <TableCell className="font-medium">{f.child.name}</TableCell>
                      <TableCell className="text-sm">{f.child.ageMonths} mo</TableCell>
                      <TableCell>
                        <Badge variant={f.status === "Completed" ? "default" : "outline"} className={f.status === "Completed" ? "bg-green-100 text-green-800" : ""}>
                          {f.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{f.reason || 'Routine check-up'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{f.child.facility.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{f.child.caregiverPhone || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                  {paginatedAll.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                        No follow-ups found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {dedupedAll.length > 0 && (
                <DataTablePagination
                  currentPage={allPage}
                  totalPages={Math.ceil(dedupedAll.length / allPageSize)}
                  pageSize={allPageSize}
                  totalItems={dedupedAll.length}
                  onPageChange={setAllPage}
                  onPageSizeChange={(size) => {
                    setAllPageSize(size);
                    setAllPage(1);
                  }}
                />
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
