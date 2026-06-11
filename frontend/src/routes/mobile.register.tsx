import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { PhoneFrame } from "@/components/mobile/PhoneFrame";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationPicker, type LocationValue } from "@/components/LocationPicker";
import { statusColor } from "@/lib/utils";
import { Save, Loader2, Plus, ArrowLeft, Search, Baby, ChevronRight, RefreshCw, User, CloudOff } from "lucide-react";
import { toast } from "sonner";
import { api, type Child, type Assessment } from "@/lib/api";
import { offlineSync } from "@/lib/offline-sync";

export const Route = createFileRoute("/mobile/register")({ component: Register });

type View = "list" | "form" | "detail";

const EMPTY_FORM = {
  applicationNumber: "", childName: "", sex: "", dob: "",
  fatherName: "", motherName: "", caregiverName: "", phone: "", caregiverNationalId: "", others: "",
};

function Register() {
  const [view, setView] = useState<View>("list");
  const [children, setChildren] = useState<Child[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");

  // Detail view
  const [detailChild, setDetailChild] = useState<Child | null>(null);
  const [detailAssessments, setDetailAssessments] = useState<Assessment[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Form state
  const [loc, setLoc] = useState<LocationValue>({});
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formLoading, setFormLoading] = useState(false);
  const [existingChild, setExistingChild] = useState<Child | null>(null);
  const isUpdate = !!existingChild;
  const [appNumLooking, setAppNumLooking] = useState(false);
  const appNumTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [nameResults, setNameResults] = useState<Child[]>([]);

  const loadChildren = async () => {
    try {
      setListLoading(true);
      const params = { limit: 50 };
      const res = await api.getChildren(params);
      setChildren(res.data);
      setTotal(res.meta.total);
    } catch { toast.error("Failed to load children"); }
    finally { setListLoading(false); }
  };

  useEffect(() => { loadChildren(); }, []);

  // Live search in form by name
  useEffect(() => {
    const nameQuery = (form.childName ?? "").trim();
    if (nameQuery.length < 2) { setNameResults([]); return; }
    const t = setTimeout(async () => {
      const res = await api.searchChildrenByName(nameQuery).catch(() => []);
      setNameResults(res);
    }, 300);
    return () => clearTimeout(t);
  }, [form.childName]);

  // App number auto-lookup
  useEffect(() => {
    if (appNumTimer.current) clearTimeout(appNumTimer.current);
    const appNum = (form.applicationNumber ?? "").trim();
    if (appNum.length < 2) { setExistingChild(null); return; }
    appNumTimer.current = setTimeout(async () => {
      setAppNumLooking(true);
      const found = await api.findChildByApplicationNumber(appNum).catch(() => null);
      if (found) {
        populateFrom(found);
        setExistingChild(found);
        const label = found.name ?? found.code ?? found.applicationNumber ?? 'matching child';
        toast.info(`Found: ${label} — form pre-filled`, { duration: 3000 });
      } else {
        setExistingChild(null);
      }
      setAppNumLooking(false);
    }, 600);
  }, [form.applicationNumber]);

  const populateFrom = (child: Child) => {
    setForm({
      applicationNumber: child.applicationNumber || "",
      childName: child.name, sex: child.sex,
      dob: child.dateOfBirth ? child.dateOfBirth.split("T")[0] : "",
      fatherName: child.fatherName || "", motherName: child.motherName || "",
      caregiverName: child.caregiverName || "",
      phone: child.caregiverPhone || "", caregiverNationalId: child.caregiverNationalId || "",
      others: child.otherInfo || "",
    });
    setLoc({ province: child.province, district: child.district, sector: child.sector, cell: child.cell, village: child.village });
    setNameResults([]);
  };

  const filteredChildren = useMemo(() => {
    if (!searchQ) return children;
    const q = searchQ.toLowerCase();
    return children.filter(
      (c) => c.name.toLowerCase().includes(q)
        || c.code.toLowerCase().includes(q)
        || (c.applicationNumber || "").toLowerCase().includes(q)
    );
  }, [children, searchQ]);

  const calcAge = (dob: string) => {
    if (!dob) return 0;
    const b = new Date(dob), t = new Date();
    return (t.getFullYear() - b.getFullYear()) * 12 + (t.getMonth() - b.getMonth());
  };

  const resetForm = () => {
    setForm({ ...EMPTY_FORM }); setLoc({});
    setNameResults([]); setExistingChild(null);
  };

  const openDetail = async (child: Child) => {
    setDetailChild(child);
    setDetailLoading(true);
    setView("detail");
    try {
      const assessments = await api.getChildAssessments(child.id);
      setDetailAssessments(assessments);
    } catch { toast.error("Failed to load assessments"); }
    finally { setDetailLoading(false); }
  };

  const submit = async () => {
    if (!form.childName || !form.sex || !form.dob) { toast.error("Please complete required fields"); return; }
    const age = calcAge(form.dob);
    if (age < 6) { toast.error("Registration blocked: Child must be at least 6 months old"); return; }
    if (age >= 60) { toast.error("Child must be under 60 months"); return; }
    if (!loc.village) { toast.error("Please select location down to village level"); return; }
    try {
      setFormLoading(true);
      
      const payload: any = {
        applicationNumber: form.applicationNumber.trim() || undefined,
        name: form.childName, sex: form.sex as "M" | "F", dateOfBirth: form.dob,
        fatherName: form.fatherName || undefined, motherName: form.motherName || undefined,
        caregiverName: form.caregiverName || undefined,
        caregiverPhone: form.phone || undefined, caregiverNationalId: form.caregiverNationalId || undefined,
        otherInfo: form.others || undefined,
        province: loc.province!, district: loc.district!, sector: loc.sector!, cell: loc.cell!, village: loc.village!,
      };

      // Handle offline case
      if (!navigator.onLine) {
        offlineSync.addAction(
          'registration',
          `New registration: ${form.childName}`,
          payload
        );
        toast.info("Offline: Registration saved locally", { 
          description: "Data will sync when connection is restored.",
          icon: <CloudOff className="h-4 w-4" />
        });
        resetForm(); setView("list");
        return;
      }

      const profile = await api.getProfile();
      if (!profile.facilityId) { toast.error("Account not linked to a facility"); return; }
      payload.facilityId = profile.facilityId;
      
      if (isUpdate && existingChild) {
        await api.updateChild(existingChild.id, payload);
        toast.success(`${form.childName} updated successfully`);
      } else {
        await api.createChild(payload);
        toast.success(`${form.childName} registered successfully`);
      }
      resetForm(); setView("list"); loadChildren();
    } catch (err: any) {
      toast.error(isUpdate ? "Failed to update" : "Failed to register", { description: err.message });
    } finally { setFormLoading(false); }
  };

  // ── DETAIL VIEW ────────────────────────────────────────────────────────────
  if (view === "detail" && detailChild) {
    return (
      <PhoneFrame title="Child Profile">
        <div className="p-4 space-y-3">
          <button onClick={() => setView("list")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-medium">
            <ArrowLeft className="h-4 w-4" /> Back to list
          </button>

          {/* Header */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-700 grid place-items-center text-base font-bold shrink-0 shadow-sm">
                {detailChild.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-bold truncate">{detailChild.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{detailChild.code} · {detailChild.ageMonths}mo</div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusColor(detailChild.currentStatus)}`}>{detailChild.currentStatus}</span>
            </div>
            <div className="text-xs text-muted-foreground pt-2 border-t border-border space-y-1">
              <div className="flex flex-wrap gap-x-3">
                <span>📍 {detailChild.village}, {detailChild.sector}</span>
                <span>🏥 {detailChild.facility?.name || "N/A"}</span>
              </div>
              {detailChild.applicationNumber && <span>App# <span className="font-mono font-semibold text-foreground">{detailChild.applicationNumber}</span></span>}
            </div>
            <div className="pt-2">
              <Button size="sm" variant="outline" className="w-full h-9 text-xs gap-1"
                onClick={() => { populateFrom(detailChild); setExistingChild(detailChild); setView("form"); }}>
                <RefreshCw className="h-3.5 w-3.5" /> Edit
              </Button>
            </div>
          </div>

          {/* Assessment history */}
          <div>
            <div className="text-sm font-semibold text-foreground mb-2">Assessment History ({detailAssessments.length})</div>
            {detailLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : detailAssessments.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                No assessments recorded yet
              </div>
            ) : (
              <div className="space-y-2">
                {detailAssessments.map((a) => (
                <div key={a.id} className="rounded-xl border border-border bg-card p-3 space-y-1 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColor(a.nutritionStatus)}`}>{a.nutritionStatus}</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {new Date(a.assessmentDate).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <div className="flex gap-3 text-xs text-slate-700">
                    <span><span className="text-muted-foreground font-medium">W:</span> {a.weightKg}kg</span>
                    <span><span className="text-muted-foreground font-medium">H:</span> {a.heightCm}cm</span>
                    <span><span className="text-muted-foreground font-medium">M:</span> {a.muacCm}cm</span>
                  </div>
                </div>
              ))}
              </div>
            )}
          </div>
        </div>
      </PhoneFrame>
    );
  }

  // ── LIST VIEW ──────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <PhoneFrame title="Children">
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 rounded-xl border border-input bg-card px-3 h-10 shadow-sm">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search by name, code or App#…"
                className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground" />
            </div>
            <Button size="sm" className="h-10 gap-1 bg-gradient-to-r from-emerald-500 to-teal-600 shrink-0"
              onClick={() => { resetForm(); setView("form"); }}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          <div className="text-xs text-muted-foreground font-medium">
            {listLoading ? "Loading…" : `${total} registered · showing ${filteredChildren.length}`}
          </div>
          {listLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filteredChildren.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
              <Baby className="h-10 w-10 opacity-40" />
              <p className="text-xs">{searchQ ? "No match found" : "No children yet"}</p>
              {!searchQ && (
                <Button size="sm" variant="outline" className="mt-1 gap-1 h-8" onClick={() => { resetForm(); setView("form"); }}>
                  <Plus className="h-3.5 w-3.5" /> Register first child
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredChildren.map((c) => (
                <button key={c.id} onClick={() => openDetail(c)}
                  className="w-full flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left hover:border-emerald-300 transition-all hover:shadow-sm">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-700 grid place-items-center text-xs font-bold shrink-0 shadow-sm">
                    {c.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">{c.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {c.code} · {c.ageMonths}mo
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-semibold shrink-0 ${statusColor(c.currentStatus)}`}>{c.currentStatus}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </PhoneFrame>
    );
  }

  // ── FORM VIEW ──────────────────────────────────────────────────────────────
  return (
    <PhoneFrame title={isUpdate ? "Update child" : "Register child"}>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => { resetForm(); setView("list"); }} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to children list
          </button>
          {isUpdate && <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-[10px] font-semibold">Update mode</Badge>}
        </div>

        <div className="space-y-3">
          {/* Application Number — FIRST */}
          <div className="relative">
            <Field label="Application Number">
              <div className="relative">
                <Input value={form.applicationNumber} onChange={(e) => setForm({ ...form, applicationNumber: e.target.value })}
                  placeholder="e.g. APP-2026-001" className="pr-8 h-9 rounded-lg text-xs" />
                {appNumLooking && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>
            </Field>
            {isUpdate && <p className="text-xs text-amber-700 mt-1 font-medium">✓ Editing {existingChild?.name}</p>}
          </div>

          {/* Name with live search */}
          <div className="relative">
            <Field label="Child full name *">
              <Input value={form.childName} onChange={(e) => setForm({ ...form, childName: e.target.value })} placeholder="Iradukunda Aline" className="h-9 rounded-lg text-xs" />
            </Field>
            {nameResults.length > 0 && (
              <div className="absolute z-20 w-full mt-1.5 bg-white border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {nameResults.map((child) => (
                  <button key={child.id} type="button" onClick={() => { 
                    populateFrom(child); 
                    setExistingChild(child); 
                    const label = child.name ?? child.code ?? child.applicationNumber ?? 'matching child';
                    toast.info(`Child found: ${label} — form pre-filled`, { duration: 3000 });
                  }}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b last:border-0">
                    <div className="font-semibold text-xs">{child.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{child.code} · {child.ageMonths}mo</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Sex *">
              <Select value={form.sex} onValueChange={(v) => setForm({ ...form, sex: v })}>
                <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="F">Female</SelectItem>
                  <SelectItem value="M">Male</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date of birth *">
              <Input type="date" value={form.dob} max={new Date().toISOString().split("T")[0]}
                className="h-9 rounded-lg text-xs"
                onChange={(e) => { 
                  setForm({ ...form, dob: e.target.value }); 
                  if (e.target.value) {
                    const age = calcAge(e.target.value);
                    if (age < 6) {
                      toast.error("Registration blocked: Child must be at least 6 months old");
                    } else if (age >= 60) {
                      toast.error("Child must be under 60 months");
                    }
                  }
                }} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Father name"><Input value={form.fatherName} onChange={(e) => setForm({ ...form, fatherName: e.target.value })} placeholder="Father's name" className="h-9 rounded-lg text-xs" /></Field>
            <Field label="Mother name"><Input value={form.motherName} onChange={(e) => setForm({ ...form, motherName: e.target.value })} placeholder="Mother's name" className="h-9 rounded-lg text-xs" /></Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Caregiver name"><Input value={form.caregiverName} onChange={(e) => setForm({ ...form, caregiverName: e.target.value })} placeholder="Caregiver" className="h-9 rounded-lg text-xs" /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+250 7…" className="h-9 rounded-lg text-xs" /></Field>
          </div>

          <Field label="Caregiver national ID"><Input value={form.caregiverNationalId} onChange={(e) => setForm({ ...form, caregiverNationalId: e.target.value })} placeholder="1 1990 8 …" className="h-9 rounded-lg text-xs" /></Field>
          <Field label="Others (optional)"><Input value={form.others} onChange={(e) => setForm({ ...form, others: e.target.value })} placeholder="Additional notes" className="h-9 rounded-lg text-xs" /></Field>
        </div>

        <div className="space-y-2">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Location *</div>
          <LocationPicker value={loc} onChange={setLoc} maxLevel="village" />
        </div>

        <Button onClick={submit}
          className={`w-full gap-1.5 h-9 text-sm font-semibold shadow-sm ${isUpdate ? "bg-gradient-to-r from-blue-500 to-indigo-600" : "bg-gradient-to-r from-emerald-500 to-teal-600"}`}
          disabled={formLoading}>
          {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {formLoading ? (isUpdate ? "Updating…" : "Registering…") : (isUpdate ? "Update child" : "Register child")}
        </Button>
      </div>
    </PhoneFrame>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-semibold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
