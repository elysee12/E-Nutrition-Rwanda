import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Save, UserPlus, Loader2, User, RefreshCw, Search } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LocationPicker, type LocationValue } from "@/components/LocationPicker";
import { useRole, ROLE_PROFILE } from "@/lib/role";
import { api, type Child } from "@/lib/api";
import { handleError } from "@/lib/error-handler";

interface CHW {
  id: string; code: string; name: string;
  phone?: string | null; village?: string | null; sector?: string | null;
}

const EMPTY_FORM = {
  applicationNumber: "",
  name: "", sex: "", dob: "",
  fatherName: "", motherName: "",
  caregiverName: "", phone: "",
  caregiverNationalId: "", others: "",
};

export function RegisterChildDialog({
  open, onOpenChange, onSuccess,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; onSuccess?: () => void;
}) {
  const role = useRole();
  const userFacility = ROLE_PROFILE[role].facility;

  const [loc, setLoc] = useState<LocationValue>({});
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);

  // Update mode — set when existing child is loaded
  const [existingChild, setExistingChild] = useState<Child | null>(null);
  const isUpdateMode = !!existingChild;

  // CHW assignment
  const [selectedCHWId, setSelectedCHWId] = useState<string>("");
  const [chws, setCHWs] = useState<CHW[]>([]);
  const [chwsLoading, setCHWsLoading] = useState(false);

  // Name search/autocomplete
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Application number lookup state
  const [appNumLooking, setAppNumLooking] = useState(false);
  const appNumTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref for handling clicks outside suggestions
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load CHWs when dialog opens
  useEffect(() => {
    if (!open) return;
    api.getProfile().then((profile) => {
      if (profile.facilityId) {
        setCHWsLoading(true);
        api.getCHWsByFacility(profile.facilityId)
          .then((list) => setCHWs(list as CHW[]))
          .catch(console.error)
          .finally(() => setCHWsLoading(false));
      }
    }).catch(console.error);
  }, [open]);

  // Handle clicks outside suggestions to close them
  useEffect(() => {
    if (!showSuggestions) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSuggestions]);

  // Debounced application number lookup
  useEffect(() => {
    if (appNumTimer.current) clearTimeout(appNumTimer.current);
    const appNum = form.applicationNumber.trim();
    if (appNum.length < 2) { setExistingChild(null); return; }

    appNumTimer.current = setTimeout(async () => {
      setAppNumLooking(true);
      try {
        const found = await api.findChildByApplicationNumber(appNum);
        // Only consider a valid child if it has an id and name
        if (found && found.id) {
          populateFromChild(found);
          setExistingChild(found);
          const label = found.name ?? found.code ?? found.applicationNumber ?? 'matching child';
          toast.info(`Found: ${label} — form pre-filled. Submit to update.`, { duration: 4000 });
        } else {
          setExistingChild(null);
        }
      } catch {
        setExistingChild(null);
      } finally {
        setAppNumLooking(false);
      }
    }, 600);
  }, [form.applicationNumber]);

  // Debounced name search for autocomplete
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm({ ...form, name: value });
    setShowSuggestions(true);

    if (nameSearchTimer.current) clearTimeout(nameSearchTimer.current);

    if (value.length < 1) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    nameSearchTimer.current = setTimeout(async () => {
      try {
        const results = await api.searchChildrenByName(value);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const populateFromChild = (child: Child) => {
    setForm({
      applicationNumber: child.applicationNumber || "",
      name: child.name,
      sex: child.sex,
      dob: child.dateOfBirth ? child.dateOfBirth.split("T")[0] : "",
      fatherName: child.fatherName || "",
      motherName: child.motherName || "",
      caregiverName: child.caregiverName || "",
      phone: child.caregiverPhone || "",
      caregiverNationalId: child.caregiverNationalId || "",
      others: child.otherInfo || "",
    });
    setLoc({
      province: child.province, district: child.district,
      sector: child.sector, cell: child.cell, village: child.village,
    });
    if (child.assignedCHWId) {
      setSelectedCHWId(child.assignedCHWId);
    }
  };

  const selectFromSearch = (child: any) => {
    populateFromChild(child);
    setExistingChild(child);
    setSearchResults([]);
    setShowSuggestions(false);
    toast.info(`Loaded: ${child.name}. Submit to update.`);
  };

  const calcAge = (dob: string) => {
    if (!dob) return 0;
    const b = new Date(dob), t = new Date();
    return (t.getFullYear() - b.getFullYear()) * 12 + (t.getMonth() - b.getMonth());
  };

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setLoc({});
    setSearchResults([]);
    setShowSuggestions(false);
    setSelectedCHWId("");
    setExistingChild(null);
  };

  const submit = async () => {
    if (!form.name || !form.sex || !form.dob) { toast.error("Please complete required fields"); return; }
    const age = calcAge(form.dob);
    if (role === "chw" && age < 6) { toast.error("Registration blocked: Child must be at least 6 months old"); return; }
    if (age >= 60) { toast.error("Child must be under 60 months"); return; }
    if (!loc.village) { toast.error("Please select location down to village level"); return; }

    try {
      setSubmitting(true);
      const profile = await api.getProfile();
      if (!profile.facilityId) { toast.error("Your account is not linked to a facility."); return; }

      const payload: any = {
        applicationNumber: form.applicationNumber.trim() || undefined,
        name: form.name, sex: form.sex as "M" | "F",
        dateOfBirth: form.dob,
        fatherName: form.fatherName || undefined,
        motherName: form.motherName || undefined,
        caregiverName: form.caregiverName || undefined,
        caregiverPhone: form.phone || undefined,
        caregiverNationalId: form.caregiverNationalId || undefined,
        otherInfo: form.others || undefined,
        province: loc.province!, district: loc.district!,
        sector: loc.sector!, cell: loc.cell!, village: loc.village!,
        facilityId: profile.facilityId,
        ...(selectedCHWId && selectedCHWId !== "none" ? { assignedCHWId: selectedCHWId } : {}),
      };

      if (isUpdateMode && existingChild) {
        await api.updateChild(existingChild.id, payload);
        toast.success(`${form.name} updated successfully`);
      } else {
        const result = await api.createChild(payload);
        const chw = (result as any).assignedCHW;
        toast.success(`${form.name} registered successfully`, {
          description: chw
            ? `Assigned to CHW: ${chw.name} (${chw.code})`
            : `Registered at ${profile.facility?.name || userFacility}`,
        });
      }

      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (error: any) {
      const errorMessage = handleError(error, isUpdateMode ? "Failed to update child" : "Failed to register child");
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCHW = chws.find((c) => c.id === selectedCHWId && selectedCHWId !== "none");

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="grid place-items-center h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600">
              {isUpdateMode ? <RefreshCw className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            </div>
            {isUpdateMode ? (
              <span>Update child — <span className="font-mono text-sm text-muted-foreground">{existingChild?.code}</span></span>
            ) : "Register a new child"}
            {isUpdateMode && (
              <Badge variant="outline" className="ml-auto text-amber-600 border-amber-300 bg-amber-50">
                Update mode
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* ── Application Number (FIRST, top of form) ── */}
          <Section
            title="Application Number"
            hint="Enter the hospital/health center application number to auto-populate existing records"
          >
            <div className="relative">
              <Field label="Application Number">
                <div className="relative">
                  <Input
                    value={form.applicationNumber}
                    onChange={(e) => setForm({ ...form, applicationNumber: e.target.value })}
                    placeholder="e.g. APP-2026-001"
                    className="pr-8"
                  />
                  {appNumLooking && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  )}
                </div>
              </Field>
              {isUpdateMode && (
                <p className="text-[11px] text-amber-600 mt-1 font-medium">
                  ✓ Existing record found — editing {existingChild?.name} ({existingChild?.code})
                </p>
              )}
            </div>
          </Section>

          {/* ── Child info ── */}
          <Section title="Child information">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Full name *">
                <div className="relative" ref={suggestionsRef}>
                  <div className="flex items-center gap-2 rounded-lg border border-input bg-card px-3">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      ref={inputRef}
                      value={form.name}
                      onChange={handleNameChange}
                      onFocus={() => form.name.length >= 1 && setShowSuggestions(true)}
                      placeholder="Iradukunda Aline"
                      className="border-0 shadow-none focus-visible:ring-0 px-0 h-9 bg-transparent"
                    />
                    {isSearching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  </div>
                  {showSuggestions && searchResults.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {searchResults.map((child) => (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => selectFromSearch(child)}
                          className="w-full px-4 py-2 text-left hover:bg-slate-50 border-b last:border-0 text-sm"
                        >
                          <div className="font-medium">{child.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {child.code}
                            {child.applicationNumber && <span> · App# {child.applicationNumber}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {showSuggestions && form.name.length >=1 && searchResults.length === 0 && !isSearching && (
                    <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg p-3 text-xs text-muted-foreground">
                      No existing children found.
                    </div>
                  )}
                </div>
              </Field>
              <Field label="Sex *">
                <Select value={form.sex} onValueChange={(v) => setForm({ ...form, sex: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="F">Female</SelectItem>
                    <SelectItem value="M">Male</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Date of birth *">
                <Input type="date" value={form.dob}
                  onChange={(e) => {
                    setForm({ ...form, dob: e.target.value });
                    if (e.target.value) {
                      const age = calcAge(e.target.value);
                      if (role === "chw" && age < 6) {
                        toast.error("Registration blocked: Child must be at least 6 months old");
                      } else if (age > 59) {
                        toast.error("Child is over 59 months — check date of birth");
                      }
                    }
                  }}
                  max={new Date().toISOString().split("T")[0]} />
              </Field>
            </div>
          </Section>

          {/* ── Location ── */}
          <Section title="Location" hint="Province → District → Sector → Cell → Village">
            <LocationPicker value={loc} onChange={setLoc} maxLevel="village" />
          </Section>

          {/* ── CHW assignment ── */}
          <Section title="Community Health Worker" hint="Select the CHW responsible for this child's village">
            <div className="space-y-2">
              <Field label="Assign CHW (optional)">
                <Select value={selectedCHWId} onValueChange={setSelectedCHWId} disabled={chwsLoading}>
                  <SelectTrigger className="w-full">
                    {chwsLoading
                      ? <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Loading CHWs…</span>
                      : <SelectValue placeholder="Select a CHW…" />}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none"><span className="text-muted-foreground italic">Auto-assign by village</span></SelectItem>
                    {chws.length === 0 && !chwsLoading && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">No active CHWs at this facility</div>
                    )}
                    {chws.map((chw) => (
                      <SelectItem key={chw.id} value={chw.id}>
                        <div className="flex items-center gap-2">
                          <div className="grid place-items-center h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold shrink-0">
                            {chw.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                          </div>
                          <div className="leading-tight">
                            <span className="font-medium text-sm">{chw.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground">({chw.code})</span>
                            {chw.village && <div className="text-[11px] text-muted-foreground">📍 {chw.village}{chw.sector ? `, ${chw.sector}` : ""}</div>}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {selectedCHW && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm">
                  <User className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-semibold text-emerald-800">{selectedCHW.name}</span>
                    <span className="text-emerald-600 ml-1">({selectedCHW.code})</span>
                    {selectedCHW.village && <span className="text-emerald-600 text-xs ml-1">· 📍 {selectedCHW.village}</span>}
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* ── Parent / Guardian ── */}
          <Section title="Parent / Guardian information">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Father name">
                <Input value={form.fatherName} onChange={(e) => setForm({ ...form, fatherName: e.target.value })} placeholder="Father's full name" />
              </Field>
              <Field label="Mother name">
                <Input value={form.motherName} onChange={(e) => setForm({ ...form, motherName: e.target.value })} placeholder="Mother's full name" />
              </Field>
              <Field label="Caregiver name">
                <Input value={form.caregiverName} onChange={(e) => setForm({ ...form, caregiverName: e.target.value })} placeholder="Primary caregiver's name" />
              </Field>
              <Field label="Phone">
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+250 7…" />
              </Field>
              <Field label="Caregiver national ID">
                <Input value={form.caregiverNationalId} onChange={(e) => setForm({ ...form, caregiverNationalId: e.target.value })} placeholder="1 1990 8 …" />
              </Field>
              <div className="md:col-span-2">
                <Field label="Others (optional)">
                  <Input value={form.others} onChange={(e) => setForm({ ...form, others: e.target.value })} placeholder="Additional notes" />
                </Field>
              </div>
            </div>
          </Section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }} disabled={submitting}>Cancel</Button>
          <Button
            onClick={submit}
            className={`gap-2 ${isUpdateMode ? "bg-gradient-to-r from-blue-500 to-indigo-600" : "bg-gradient-to-r from-emerald-500 to-teal-600"}`}
            disabled={submitting}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {submitting ? (isUpdateMode ? "Updating…" : "Registering…") : (isUpdateMode ? "Update child" : "Register child")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="border-b border-border pb-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
