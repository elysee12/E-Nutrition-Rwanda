import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/web/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { statusColor } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Activity, AlertTriangle, Ruler, Scale, TrendingUp, Loader2, CheckCircle2 } from "lucide-react";
import { api, type Child, type Assessment } from "@/lib/api";
import { getWHOWeightForAgePercentiles } from "@/lib/nutrition-classification";
import { toast } from "sonner";
import { useRole } from "@/lib/role";

export const Route = createFileRoute("/web/growth")({
  head: () => ({ meta: [{ title: "Growth Monitoring — E-Nutrition Rwanda" }] }),
  component: Growth,
});

function Growth() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selected, setSelected] = useState<Child | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const role = useRole();
  const navigate = useNavigate();

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (selected) {
      fetchAssessments(selected.id);
    }
  }, [selected]);

  const fetchChildren = async () => {
    try {
      const response = await api.getChildren({ limit: 50 });
      setChildren(response.data);
      if (response.data.length > 0) {
        setSelected(response.data[0]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load children");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssessments = async (childId: string) => {
    try {
      const assessmentList = await api.getChildAssessments(childId);
      setAssessments(assessmentList);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load assessments");
    }
  };

  if (loading) {
    return (
      <>
        <TopBar title="Growth Monitoring" subtitle="WHO z-score tracking · weight-for-age · height-for-age · weight-for-height" />
        <div className="p-10 flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading growth monitoring data...</span>
          </div>
        </div>
      </>
    );
  }

  // Get latest assessment
  const latestA = assessments.length > 0 ? assessments[0] : null;

  // Calculate age at each assessment (estimate using child's ageMonths now and assessment dates)
  // Simplified approach: use assessment's child's age, but for graph, we can use assessmentDate difference
  // For simplicity here, we'll use the child's ageMonths as reference point

  // Build graph data
  const buildGraphData = () => {
    if (!selected || assessments.length === 0) return [];

    return assessments.slice().reverse().map((assessment) => {
      // Estimate age at assessment (simplified for now)
      const ageAtAssessment = selected.ageMonths;
      const whoPerc = getWHOWeightForAgePercentiles(ageAtAssessment, selected.sex);
      return {
        age: ageAtAssessment,
        child: assessment.weightKg,
        p3: whoPerc.p3,
        p50: whoPerc.p50,
        p97: whoPerc.p97,
      };
    });
  };

  const graphData = buildGraphData();

  // Get recommendations from latest assessment
  const getRecommendations = () => {
    if (!latestA || !latestA.recommendations) return [];
    return latestA.recommendations.split("; ").filter(Boolean);
  };

  const recommendations = getRecommendations();

  return (
    <>
      <TopBar title="Growth Monitoring" subtitle="WHO z-score tracking · weight-for-age · height-for-age · weight-for-height" />
      <div className="p-6 grid gap-5 lg:grid-cols-[320px_1fr]">
        <Card className="p-0 overflow-hidden h-fit">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-sm">Children cohort</h3>
            <p className="text-xs text-muted-foreground">Pick a child to inspect</p>
          </div>
          <div className="max-h-[640px] overflow-auto">
            {children.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full text-left px-4 py-3 border-b border-border flex items-center gap-3 hover:bg-accent/40 transition ${selected?.id === c.id ? "bg-[color:var(--primary-soft)]/60" : ""}`}
              >
                <div className="grid place-items-center h-9 w-9 rounded-full bg-primary/15 text-primary text-xs font-semibold">
                  {c.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{c.code} · {c.ageMonths}mo</div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColor(c.currentStatus)}`}>{c.currentStatus}</span>
              </button>
            ))}
          </div>
        </Card>

        {selected ? (
          <div className="space-y-5">
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">{selected.name}</h2>
                  <p className="text-xs text-muted-foreground">{selected.code} · {selected.sex === "F" ? "Female" : "Male"} · {selected.ageMonths} months · {selected.facility?.name ?? ""}</p>
                </div>
                <div className="flex gap-2">
                  {role !== "data-manager" && (
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate({ to: "/web/assessments" })}>
                      Add measurement
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-4 mt-5">
                <Metric icon={Scale}       label="Weight"     value={latestA ? `${latestA.weightKg} kg`          : "N/A"} />
                <Metric icon={Ruler}       label="Height"     value={latestA ? `${latestA.heightCm} cm`          : "N/A"} />
                <Metric icon={Activity}    label="MUAC"       value={latestA ? `${latestA.muacCm} cm`            : "N/A"} />
                <Metric icon={TrendingUp}  label="W/A z-score" value={latestA?.zScoreWFA != null ? latestA.zScoreWFA.toFixed(2) : "N/A"} tone="warning" />
              </div>
              {latestA && recommendations.length > 0 && (
                <div className={`mt-4 rounded-lg border px-4 py-3 text-sm flex items-start gap-3 ${
                  latestA.nutritionStatus === "SAM" 
                    ? "border-red-300 bg-red-50 text-red-800" 
                    : latestA.nutritionStatus === "MAM" 
                    ? "border-orange-300 bg-orange-50 text-orange-800" 
                    : latestA.nutritionStatus === "Normal" 
                    ? "border-green-300 bg-green-50 text-green-800" 
                    : "border-yellow-300 bg-yellow-50 text-yellow-800"
                }`}>
                  {latestA.nutritionStatus === "SAM" ? (
                    <AlertTriangle className="h-4 w-4 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">Status: {latestA.nutritionStatus}</div>
                    <div className="text-xs mt-1 space-y-1">
                      {recommendations.map((rec, idx) => (
                        <div key={idx}>{rec}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-sm">Weight for Age (WHO Growth Standard)</h3>
                  <p className="text-xs text-muted-foreground">Shows child's weight compared to healthy children of same age & sex</p>
                </div>
                <Badge variant="outline" className="text-[10px]">{selected.sex === 'F' ? 'Girls' : 'Boys'} 0–59 months</Badge>
              </div>
              {graphData.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={graphData} margin={{ left: 10, right: 18, top: 8, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis 
                        dataKey="age" 
                        stroke="var(--muted-foreground)" 
                        fontSize={11} 
                        label={{ value: "Age (months)", position: "insideBottom", offset: -10, fontSize: 11, fill: "var(--muted-foreground)" }} 
                      />
                      <YAxis 
                        stroke="var(--muted-foreground)" 
                        fontSize={11} 
                        label={{ value: "Weight (kg)", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "var(--muted-foreground)" }} 
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: "var(--card)", 
                          border: "1px solid var(--border)", 
                          borderRadius: 8, 
                          fontSize: 12,
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                        }} 
                        formatter={(value: number) => [`${value.toFixed(1)} kg`, '']}
                        labelFormatter={(value: number) => `${value} months`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="p3" 
                        stroke="#ef4444" 
                        strokeWidth={1.5} 
                        strokeDasharray="5 5" 
                        name="Below normal" 
                        dot={false} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="p50" 
                        stroke="#10b981" 
                        strokeWidth={1.5} 
                        strokeDasharray="5 5" 
                        name="Average" 
                        dot={false} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="p97" 
                        stroke="#3b82f6" 
                        strokeWidth={1.5} 
                        strokeDasharray="5 5" 
                        name="Above normal" 
                        dot={false} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="child" 
                        stroke="#8b5cf6" 
                        strokeWidth={3} 
                        name="Child's Weight" 
                        dot={{ r: 5, fill: "#8b5cf6", strokeWidth: 2, stroke: "white" }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap items-center justify-center gap-4 mt-2 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-red-500" style={{ borderTopStyle: "dashed", borderTopWidth: 2 }} />
                      Below normal
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-green-500" style={{ borderTopStyle: "dashed", borderTopWidth: 2 }} />
                      Average
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-blue-500" style={{ borderTopStyle: "dashed", borderTopWidth: 2 }} />
                      Above normal
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-purple-500" />
                      Child's Weight
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground text-sm">No growth data available yet</div>
              )}
            </Card>
          </div>
        ) : (
          <div className="flex items-center justify-center p-10">
            <div className="text-center text-muted-foreground">
              <div className="text-sm">Select a child to view growth monitoring</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone?: "warning" }) {
  return (
    <div className="rounded-lg border border-border p-3 bg-card">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</div>
      <div className={`text-lg font-semibold mt-1 ${tone === "warning" ? "text-[color:var(--warning)]" : ""}`}>{value}</div>
    </div>
  );
}
