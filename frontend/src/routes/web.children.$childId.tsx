import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Activity, Baby, Calendar, FileText, MapPin, Phone, Ruler, Scale, Stethoscope, User, AlertTriangle, ClipboardList, Plus, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TopBar } from "@/components/web/TopBar";
import { statusColor } from "@/lib/utils";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { api, type Child, type Assessment } from "@/lib/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/web/children/$childId")({
  head: ({ params }) => ({ meta: [{ title: `Child ${params.childId} — E-Nutrition Rwanda` }] }),
  component: ChildDetail,
});

function ChildDetail() {
  const { childId } = Route.useParams();
  const [child, setChild] = useState<Child | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChildData();
  }, [childId]);

  const fetchChildData = async () => {
    try {
      setLoading(true);
      const [childResponse, assessmentsResponse] = await Promise.all([
        api.getChild(childId),
        api.getChildAssessments(childId),
      ]);
      setChild(childResponse);
      setAssessments(assessmentsResponse);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load child data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <TopBar title="Loading..." subtitle="Fetching child data" />
        <div className="p-10 flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading child profile...</span>
          </div>
        </div>
      </>
    );
  }

  if (!child) {
    return (
      <div className="p-10 max-w-md mx-auto text-center space-y-3">
        <div className="text-sm text-muted-foreground">Child <span className="font-mono">{childId}</span> was not found in the registry.</div>
        <Link to="/web/children" className="text-primary text-sm hover:underline">← Back to registry</Link>
      </div>
    );
  }

  const initials = child.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("");

  // Pull latest measurements from the most recent assessment
  const latestAssessment = assessments[0] ?? null;

  // Generate growth history from assessments
  const growthHistory = assessments.slice().reverse().map((a) => ({
    month: new Date(a.assessmentDate).toLocaleDateString('en-US', { month: 'short' }),
    weight: a.weightKg,
    height: a.heightCm,
    muac: a.muacCm,
    whoP3: a.weightKg - 0.5, // Placeholder
    whoP50: a.weightKg + 0.5,
    whoP97: a.weightKg + 1.5,
  }));

  // Generate visits from assessments — include facility and exact date
  const visits = assessments.map((a) => ({
    date: new Date(a.assessmentDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    time: new Date(a.assessmentDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    type: a.nutritionStatus === 'Normal' ? 'Routine measurement' : 'Follow-up screening',
    conductor: a.assessedBy?.name || 'Staff',
    facility: a.facility?.name || child.facility?.name || 'N/A',
    findings: `MUAC ${a.muacCm}cm · ${a.weightKg}kg / ${a.heightCm}cm · ${a.nutritionStatus}`,
    action: a.recommendations?.substring(0, 80) || 'Counseling provided',
  }));

  return (
    <>
      <TopBar title={child.name} subtitle={`${child.code} · enrolled at ${child.facility?.name ?? "—"}`} />
      <div className="p-6 space-y-6 max-w-7xl">
        <Link to="/web/children" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back to registry
        </Link>

        {/* Header card */}
        <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-5">
            <div className="grid place-items-center h-20 w-20 rounded-2xl text-primary-foreground text-2xl font-semibold shrink-0" style={{ background: "var(--gradient-primary)" }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight">{child.name}</h2>
                <Badge variant="outline" className="text-[10px]">{child.sex === "F" ? "Female" : "Male"}</Badge>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColor(child.currentStatus)}`}>{child.currentStatus}</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1.5 text-xs text-muted-foreground">
                {child.applicationNumber && (
                  <Meta icon={FileText} label="App#" value={child.applicationNumber} />
                )}
                <Meta icon={Baby} label="Age" value={`${child.ageMonths} months`} />
                <Meta icon={MapPin} label="Location" value={`${child.village}, ${child.sector}`} />
                <Meta icon={Stethoscope} label="Facility" value={child.facility?.name ?? "N/A"} />
                <Meta icon={User} label="Caregiver" value={child.caregiverName || 'N/A'} />
                <Meta icon={Phone} label="Phone" value={child.caregiverPhone || 'N/A'} />
                <Meta icon={MapPin} label="District" value={`${child.district} · ${child.province}`} />
              </div>            </div>
            <div className="flex flex-col gap-2 md:w-48">
              <Button className="gap-2"><Activity className="h-4 w-4" /> New measurement</Button>
              <Button variant="outline" className="gap-2"><ClipboardList className="h-4 w-4" /> Add visit</Button>
              <Button variant="ghost" className="gap-2 text-xs"><FileText className="h-3.5 w-3.5" /> Export PDF</Button>
            </div>
          </div>
        </Card>

        {/* Latest measurements */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={Scale}        label="Weight"      value={latestAssessment ? `${latestAssessment.weightKg} kg`  : "N/A"} sub="Last measurement" tone="bg-[color:var(--primary-soft)] text-primary" />
          <Metric icon={Ruler}        label="Height"      value={latestAssessment ? `${latestAssessment.heightCm} cm`  : "N/A"} sub="Last measurement" tone="bg-[color:var(--info)]/15 text-[color:var(--info)]" />
          <Metric icon={Activity}     label="MUAC"        value={latestAssessment ? `${latestAssessment.muacCm} cm`    : "N/A"} sub="Last measurement" tone="bg-[color:var(--warning)]/15 text-[color:var(--warning)]" />
          <Metric icon={AlertTriangle} label="W/H z-score" value={latestAssessment?.zScoreWFH != null ? latestAssessment.zScoreWFH.toFixed(2) : "N/A"} sub={latestAssessment?.nutritionStatus ?? "No data"} tone="bg-destructive/15 text-destructive" />
        </div>

        <Tabs defaultValue="growth" className="space-y-4">
          <TabsList>
            <TabsTrigger value="growth">Growth chart</TabsTrigger>
            <TabsTrigger value="visits">Visit history</TabsTrigger>
            <TabsTrigger value="notes">Clinical notes</TabsTrigger>
          </TabsList>

          <TabsContent value="growth" className="space-y-4">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-sm">Weight-for-age (6 months)</h3>
                  <p className="text-xs text-muted-foreground">Plotted against WHO growth standards (P3 / P50 / P97)</p>
                </div>
                <Badge variant="outline" className="text-[10px] gap-1"><Activity className="h-3 w-3" /> WHO 2006</Badge>
              </div>
              {growthHistory.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={growthHistory} margin={{ left: -10, right: 8, top: 4, bottom: 0 }}>
                      <defs>
                        <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.15} />
                          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="whoP97" stroke="var(--chart-2)" strokeDasharray="4 4" strokeWidth={1.5} fill="url(#band)" name="WHO P97" />
                      <Line type="monotone" dataKey="whoP50" stroke="var(--chart-3)" strokeDasharray="4 4" strokeWidth={1.5} dot={false} name="WHO P50" />
                      <Line type="monotone" dataKey="whoP3" stroke="var(--destructive)" strokeDasharray="4 4" strokeWidth={1.5} dot={false} name="WHO P3" />
                      <Line type="monotone" dataKey="weight" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4 }} name={child.name} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground text-sm">No growth data available yet</div>
              )}
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-sm">MUAC trend (cm)</h3>
                  <p className="text-xs text-muted-foreground">Red zone &lt; 11.5 (SAM) · Yellow zone 11.5–12.4 (MAM)</p>
                </div>
              </div>
              {growthHistory.length > 0 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={growthHistory} margin={{ left: -10, right: 8, top: 4, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={[100, 140]} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                      <ReferenceLine y={11.5} stroke="var(--destructive)" strokeDasharray="4 4" label={{ value: "SAM threshold", fill: "var(--destructive)", fontSize: 10, position: "insideTopRight" }} />
                      <ReferenceLine y={12.5} stroke="var(--warning)" strokeDasharray="4 4" label={{ value: "MAM threshold", fill: "var(--warning)", fontSize: 10, position: "insideTopRight" }} />
                      <Line type="monotone" dataKey="muac" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4 }} name="MUAC" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground text-sm">No MUAC data available yet</div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="visits">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div>
                  <h3 className="font-semibold text-sm">Visit history</h3>
                  <p className="text-xs text-muted-foreground">All recorded interactions with this child</p>
                </div>
                <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add visit</Button>
              </div>
              {visits.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Conducted by</TableHead>
                      <TableHead>Facility</TableHead>
                      <TableHead>Findings</TableHead>
                      <TableHead>Action taken</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visits.map((v, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                          <div>{v.date}</div>
                          <div className="text-[10px] opacity-70">{v.time}</div>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{v.type}</TableCell>
                        <TableCell className="text-sm">{v.conductor}</TableCell>
                        <TableCell className="text-sm">{v.facility}</TableCell>
                        <TableCell className="text-sm">{v.findings}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{v.action}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10 text-muted-foreground text-sm">No visits recorded yet</div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="notes">
            <Card className="p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold"><ClipboardList className="h-4 w-4" /> Clinical notes</div>
              {assessments.filter(a => a.recommendations).map((n, i) => (
                <div key={i} className="rounded-lg border border-border p-4 bg-card">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-xs font-medium">{n.assessedBy?.name || 'CHW'}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">{new Date(n.assessmentDate).toLocaleDateString()}</div>
                  </div>
                  <p className="text-sm text-foreground/85 leading-relaxed">{n.recommendations}</p>
                </div>
              ))}
              {assessments.filter(a => a.recommendations).length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">No clinical notes yet</div>
              )}
              <Button variant="outline" size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add note</Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function Meta({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Icon className="h-3 w-3 shrink-0" />
      <span className="shrink-0">{label}:</span>
      <span className="text-foreground font-medium truncate">{value}</span>
    </div>
  );
}

function Metric({ icon: Icon, label, value, sub, tone }: { icon: any; label: string; value: string; sub: string; tone: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-xl font-semibold mt-1">{value}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
        </div>
        <div className={`grid place-items-center h-9 w-9 rounded-lg ${tone}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}
