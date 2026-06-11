import { createFileRoute } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/mobile/PhoneFrame";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Search, X, ChevronLeft, ChevronRight, Loader2, Activity } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { statusColor } from "@/lib/utils";
import { api, type Child, type Assessment } from "@/lib/api";
import { toast } from "sonner";
import { offlineSync } from "@/lib/offline-sync";
import { CloudOff } from "lucide-react";

export const Route = createFileRoute("/mobile/measure")({ component: Measure });

function Measure() {
  const [measurements, setMeasurements] = useState({ weight: "", height: "", muac: "" });
  const [saved, setSaved] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);

  // All recent assessments — loaded once on mount
  const [allHistory, setAllHistory] = useState<Assessment[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchChildren, setSearchChildren] = useState<Child[]>([]);
  const itemsPerPage = 5;

  // Load all recent assessments on mount (no child selected required)
  useEffect(() => {
    fetchAllHistory();
  }, []);

  const fetchAllHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await api.getAssessments({ limit: 50 });
      setAllHistory(response.data);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // When a child is selected, also load their specific history
  const fetchChildHistory = async (childId: string) => {
    try {
      const assessments = await api.getChildAssessments(childId);
      // Merge: put child's assessments first, then others (de-duplicate by id)
      setAllHistory((prev) => {
        const existingIds = new Set(assessments.map((a) => a.id));
        const others = prev.filter((a) => !existingIds.has(a.id));
        return [...assessments, ...others];
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Search children by query
  useEffect(() => {
    if (!searchQuery) { setSearchChildren([]); return; }
    const t = setTimeout(() => {
      api.getChildren({ search: searchQuery, limit: 10 })
        .then((r) => setSearchChildren(r.data))
        .catch(console.error);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Helper to get most recent assessment per child
  const getMostRecentPerChild = (assessmentList: Assessment[]) => {
    const childMap = new Map<string, Assessment>();
    for (const a of assessmentList) {
      const childId = a.child?.id || a.childId;
      const existing = childMap.get(childId);
      if (!existing || new Date(a.assessmentDate) > new Date(existing.assessmentDate)) {
        childMap.set(childId, a);
      }
    }
    return Array.from(childMap.values());
  };

  // History shown in the list:
  // - if a child is selected → show all their assessments (for history)
  // - otherwise → show only most recent per child
  const displayedHistory = useMemo(() => {
    if (selectedChild) {
      return allHistory.filter((a) => a.child?.id === selectedChild.id || a.childId === selectedChild.id);
    }
    return getMostRecentPerChild(allHistory);
  }, [allHistory, selectedChild]);

  const totalPages = Math.ceil(displayedHistory.length / itemsPerPage);
  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return displayedHistory.slice(start, start + itemsPerPage);
  }, [displayedHistory, currentPage]);

  const filteredSearchChildren = useMemo(() => {
    if (!searchQuery) return searchChildren;
    const q = searchQuery.toLowerCase();
    return searchChildren.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [searchQuery, searchChildren]);

  const handleChildSelect = (child: Child) => {
    setSelectedChild(child);
    setShowSearch(false);
    setSearchQuery("");
    setCurrentPage(1);
    fetchChildHistory(child.id);
  };

  const isUnder6Months = selectedChild ? selectedChild.ageMonths <= 6 : false;

  const handleSave = async () => {
    if (!measurements.weight || !measurements.height || !selectedChild) {
      toast.error("Please fill all fields and select a child");
      return;
    }
    if (!isUnder6Months && !measurements.muac) {
      toast.error("Please fill MUAC field");
      return;
    }

    // Validate measurements before saving
    const weightNum = parseFloat(measurements.weight);
    const heightNum = parseFloat(measurements.height);
    
    if (weightNum <= 0 || weightNum > 30) {
      toast.error("Invalid weight: must be between 0 and 30 kg");
      return;
    }

    if (heightNum < 40 || heightNum > 120) {
      toast.error("Invalid height: must be between 40 and 120 cm");
      return;
    }

    if (!isUnder6Months) {
      const muacNum = parseFloat(measurements.muac);
      if (muacNum < 5 || muacNum > 20) {
        toast.error("Invalid MUAC: must be between 5 and 20 cm");
        return;
      }
    }
    
    try {
      setSubmitLoading(true);
      const assessmentData: any = {
        childId: selectedChild.id,
        facilityId: selectedChild.facilityId,
        weightKg: parseFloat(measurements.weight),
        heightCm: parseFloat(measurements.height),
      };
      if (!isUnder6Months) {
        assessmentData.muacCm = parseFloat(measurements.muac);
      }

      // Handle offline case
      if (!navigator.onLine) {
        offlineSync.addAction(
          'assessment',
          `Measurement: ${selectedChild.name}`,
          assessmentData
        );
        toast.info("Offline: Measurement saved locally", { 
          description: "Data will sync when connection is restored.",
          icon: <CloudOff className="h-4 w-4" />
        });
        setSaved(true);
        setTimeout(() => {
          setMeasurements({ weight: "", height: "", muac: "" });
          setSaved(false);
        }, 2500);
        return;
      }

      await api.createAssessment(assessmentData);
      // Refresh history to include the new record
      await fetchAllHistory();
      setCurrentPage(1);
      setSaved(true);
      setTimeout(() => {
        setMeasurements({ weight: "", height: "", muac: "" });
        setSaved(false);
      }, 2500);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save measurement");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <PhoneFrame title="Quick screening">
      <div className="p-5 space-y-5">

        {/* ── Child picker ─────────────────────────────── */}
        {!showSearch ? (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-xs text-muted-foreground font-semibold">Selected child</div>
                <div className="text-base font-semibold">{selectedChild?.name || "No child selected"}</div>
                {selectedChild ? (
                  <div className="text-xs text-muted-foreground mt-1">
                    {selectedChild.code} · {selectedChild.ageMonths}mo · {selectedChild.sex === "M" ? "Male" : "Female"} · {selectedChild.village}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground mt-1">Tap 🔍 to select a child before screening</div>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowSearch(true)} className="h-10 w-10 p-0">
                <Search className="h-5 w-5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-3 rounded-2xl border border-input bg-card px-4 h-12 shadow-sm">
                <Search className="h-5 w-5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, code or App#…"
                  className="border-0 shadow-none focus-visible:ring-0 px-0 h-10 bg-transparent text-sm"
                  autoFocus
                />
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setShowSearch(false); setSearchQuery(""); }} className="h-12 w-12 p-0">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="max-h-[200px] overflow-y-auto space-y-2">
              {filteredSearchChildren.length > 0 ? (
                filteredSearchChildren.map((child) => (
                  <button key={child.id} onClick={() => handleChildSelect(child)}
                    className="w-full text-left p-4 rounded-2xl hover:bg-slate-50 border border-border bg-card shadow-sm">
                    <div className="text-sm font-semibold">{child.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {child.code}{child.applicationNumber ? ` · App# ${child.applicationNumber}` : ""} · {child.ageMonths}mo · {child.sex === "M" ? "Male" : "Female"} · {child.village}
                    </div>
                  </button>
                ))
              ) : searchQuery.length > 1 ? (
                <div className="p-5 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl">No children found for "{searchQuery}"</div>
              ) : (
                <div className="p-5 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl">Type at least 2 characters to search</div>
              )}
            </div>
          </div>
        )}

        {/* ── Measurement form ─────────────────────────── */}
        {saved ? (
          <div className="rounded-2xl p-5 border border-emerald-300 bg-emerald-50 shadow-sm">
            <div className="flex items-center gap-3 text-emerald-700 text-sm font-semibold">
              <CheckCircle2 className="h-6 w-6" /> Measurement saved successfully
            </div>
            <p className="text-xs text-emerald-600 mt-2">Record added. History updated below.</p>
          </div>
        ) : (
          <>
            <div className={`grid gap-4 ${isUnder6Months ? "grid-cols-2" : "grid-cols-3"}`}>
              <Field label="Weight (kg)">
                <Input type="number" step="0.1" placeholder="7.2" value={measurements.weight} className="h-12 rounded-xl"
                  onChange={(e) => setMeasurements({ ...measurements, weight: e.target.value })} />
              </Field>
              <Field label="Height (cm)">
                <Input type="number" step="0.1" placeholder="71" value={measurements.height} className="h-12 rounded-xl"
                  onChange={(e) => setMeasurements({ ...measurements, height: e.target.value })} />
              </Field>
              {!isUnder6Months && (
                <Field label="MUAC (cm)">
                  <Input type="number" step="0.1" placeholder="11.8" value={measurements.muac} className="h-12 rounded-xl"
                    onChange={(e) => setMeasurements({ ...measurements, muac: e.target.value })} />
                </Field>
              )}
            </div>
            <Button className="w-full gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 h-12 text-base font-semibold shadow-md" onClick={handleSave}
              disabled={!measurements.weight || !measurements.height || (!isUnder6Months && !measurements.muac) || !selectedChild || submitLoading}>
              {submitLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
              {submitLoading ? "Saving…" : "Save measurement"}
            </Button>
          </>
        )}

        {/* ── Measurement History ──────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Clock className="h-4 w-4" />
              {selectedChild ? `${selectedChild.name}'s history` : "Recent measurements"}
            </div>
            <div className="flex items-center gap-2">
              {selectedChild && (
                <button onClick={() => { setSelectedChild(null); setCurrentPage(1); }}
                  className="text-xs text-primary underline font-medium">Show all</button>
              )}
              {displayedHistory.length > 0 && (
                <span className="text-xs text-muted-foreground">{displayedHistory.length} record{displayedHistory.length !== 1 ? "s" : ""}</span>
              )}
            </div>
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : displayedHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground border border-dashed border-border rounded-2xl">
              <Activity className="h-10 w-10 opacity-30" />
              <p className="text-xs text-center">
                {selectedChild ? `No assessments yet for ${selectedChild.name}` : "No assessments recorded yet"}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {paginatedHistory.map((entry) => {
                  const childName = entry.child?.name ?? selectedChild?.name ?? "—";
                  const childCode = entry.child?.code ?? selectedChild?.code ?? "";
                  const date = new Date(entry.assessmentDate).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                  });
                  return (
                    <Card key={entry.id} className="p-4 bg-slate-50 border-slate-200 shadow-sm rounded-2xl">
                      <div className="space-y-2">
                        {/* Row 1: child name + date */}
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-slate-900 truncate flex-1">{childName}</div>
                          <div className="text-xs text-slate-500 shrink-0 ml-3">{date}</div>
                        </div>
                        {/* Row 2: code + measurements */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-muted-foreground">{childCode}</span>
                          <div className="flex gap-4 text-xs text-slate-700">
                            <span><span className="text-muted-foreground font-medium">W:</span> {entry.weightKg}kg</span>
                            <span><span className="text-muted-foreground font-medium">H:</span> {entry.heightCm}cm</span>
                            <span><span className="text-muted-foreground font-medium">M:</span> {entry.muacCm}cm</span>
                          </div>
                        </div>
                        {/* Row 3: nutrition status badge */}
                        <div className="flex items-center justify-between">
                          <span className={`text-xs px-3 py-1 rounded-full font-semibold ${statusColor(entry.nutritionStatus)}`}>
                            {entry.nutritionStatus}
                          </span>
                          {entry.isSAM && (
                            <Badge variant="destructive" className="text-xs h-5 px-2">SAM — urgent</Badge>
                          )}
                          {entry.isMAM && !entry.isSAM && (
                            <Badge className="text-xs h-5 px-2 bg-amber-500">MAM</Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-3">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1} className="h-10 px-4 text-xs gap-2">
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </Button>
                  <span className="text-xs text-muted-foreground font-medium">{currentPage} / {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages} className="h-10 px-4 text-xs gap-2">
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
