import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Save, Pencil, Loader2, User } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationPicker, type LocationValue } from "@/components/LocationPicker";
import { api, type Child } from "@/lib/api";

interface CHW {
  id: string;
  code: string;
  name: string;
  phone?: string | null;
  village?: string | null;
  sector?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  child: Child;
  onSuccess?: () => void;
}

export function EditChildDialog({ open, onOpenChange, child, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [chws, setCHWs] = useState<CHW[]>([]);
  const [chwsLoading, setCHWsLoading] = useState(false);
  const [selectedCHWId, setSelectedCHWId] = useState<string>("");

  const [form, setForm] = useState({
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

  const [loc, setLoc] = useState<LocationValue>({
    province: child.province,
    district: child.district,
    sector: child.sector,
    cell: child.cell,
    village: child.village,
  });

  // Sync form when child prop changes
  useEffect(() => {
    setForm({
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
      province: child.province,
      district: child.district,
      sector: child.sector,
      cell: child.cell,
      village: child.village,
    });
    setSelectedCHWId((child as any).assignedCHW?.id || "none");
  }, [child]);

  // Load CHWs when dialog opens
  useEffect(() => {
    if (!open) return;
    const loadCHWs = async () => {
      try {
        setCHWsLoading(true);
        const list = await api.getCHWsByFacility(child.facilityId);
        setCHWs(list as CHW[]);
      } catch (err) {
        console.error("Failed to load CHWs:", err);
      } finally {
        setCHWsLoading(false);
      }
    };
    loadCHWs();
  }, [open, child.facilityId]);

  const submit = async () => {
    if (!form.name || !form.sex || !form.dob) {
      toast.error("Please complete required fields");
      return;
    }
    if (!loc.village) {
      toast.error("Please select location down to village level");
      return;
    }

    try {
      setSubmitting(true);

      await api.updateChild(child.id, {
        name: form.name,
        sex: form.sex as "M" | "F",
        dateOfBirth: new Date(form.dob).toISOString(),
        fatherName: form.fatherName || undefined,
        motherName: form.motherName || undefined,
        caregiverName: form.caregiverName || undefined,
        caregiverPhone: form.phone || undefined,
        caregiverNationalId: form.caregiverNationalId || undefined,
        otherInfo: form.others || undefined,
        province: loc.province!,
        district: loc.district!,
        sector: loc.sector!,
        cell: loc.cell!,
        village: loc.village!,
        assignedCHWId: selectedCHWId && selectedCHWId !== "none" ? selectedCHWId : undefined,
      });

      toast.success(`${form.name} updated successfully!`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error("Failed to update child", {
        description: error.message || "Please try again",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCHW = chws.find((c) => c.id === selectedCHWId && selectedCHWId !== "none");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="grid place-items-center h-8 w-8 rounded-lg bg-blue-50 text-blue-600">
              <Pencil className="h-4 w-4" />
            </div>
            Edit child — <span className="font-mono text-sm text-muted-foreground">{child.code}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Child info */}
          <Section title="Child information">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Full name *">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Sex *">
                <Select value={form.sex} onValueChange={(v) => setForm({ ...form, sex: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="F">Female</SelectItem>
                    <SelectItem value="M">Male</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Date of birth *">
                <Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })}
                  max={new Date().toISOString().split("T")[0]} />
              </Field>
            </div>
          </Section>

          {/* Location */}
          <Section title="Location" hint="Province → District → Sector → Cell → Village">
            <LocationPicker value={loc} onChange={setLoc} maxLevel="village" />
          </Section>

          {/* CHW assignment */}
          <Section title="Community Health Worker" hint="Reassign CHW responsible for this child">
            <div className="space-y-2">
              <Field label="Assigned CHW">
                <Select value={selectedCHWId} onValueChange={setSelectedCHWId} disabled={chwsLoading}>
                  <SelectTrigger className="w-full">
                    {chwsLoading
                      ? <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Loading CHWs…</span>
                      : <SelectValue placeholder="Select a CHW…" />
                    }
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground italic">Keep existing / no CHW</span>
                    </SelectItem>
                    {chws.length === 0 && !chwsLoading && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">No active CHWs at this facility</div>
                    )}
                    {chws.map((chw) => (
                      <SelectItem key={chw.id} value={chw.id}>
                        <div className="flex items-center gap-2">
                          <div className="grid place-items-center h-6 w-6 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold shrink-0">
                            {chw.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                          </div>
                          <div className="leading-tight">
                            <span className="font-medium text-sm">{chw.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground">({chw.code})</span>
                            {chw.village && (
                              <div className="text-[11px] text-muted-foreground">📍 {chw.village}{chw.sector ? `, ${chw.sector}` : ""}</div>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {selectedCHW && (
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-sm">
                  <User className="h-4 w-4 text-blue-600 shrink-0" />
                  <div>
                    <span className="font-semibold text-blue-800">{selectedCHW.name}</span>
                    <span className="text-blue-600 ml-1">({selectedCHW.code})</span>
                    {selectedCHW.village && (
                      <span className="text-blue-600 text-xs ml-1">· 📍 {selectedCHW.village}</span>
                    )}
                    {selectedCHW.phone && (
                      <span className="text-blue-600 text-xs ml-1">· {selectedCHW.phone}</span>
                    )}
                  </div>
                </div>
              )}
              {!selectedCHWId && child.caregiverRelation?.startsWith("CHW:") && (
                <p className="text-xs text-muted-foreground">
                  Currently assigned: <strong>{child.caregiverRelation.replace("CHW: ", "")}</strong>
                </p>
              )}
            </div>
          </Section>

          {/* Parent / Guardian */}
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
                <Input value={form.caregiverNationalId} onChange={(e) => setForm({ ...form, caregiverNationalId: e.target.value })} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Others (optional)">
                  <Input value={form.others} onChange={(e) => setForm({ ...form, others: e.target.value })} />
                </Field>
              </div>
            </div>
          </Section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {submitting ? "Saving…" : "Save changes"}
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
