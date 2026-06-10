import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { TopBar } from "@/components/web/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LocationPicker, type LocationValue } from "@/components/LocationPicker";
import { Building2, Plus, Edit2, Trash2, Loader2 } from "lucide-react";
import { api, type Facility as ApiFacility, type FacilityType, type FacilityStatus } from "@/lib/api";

export const Route = createFileRoute("/web/hospitals")({
  head: () => ({ meta: [{ title: "Hospitals & Facilities — E-Nutrition Rwanda" }] }),
  component: Hospitals,
});

type FormState = { 
  name: string; 
  type: FacilityType; 
  directorName: string; 
  facilityPhone: string; 
  facilityEmail: string; 
  loc: LocationValue; 
  status: FacilityStatus 
};
const empty: FormState = { 
  name: "", 
  type: "HEALTH_CENTER", 
  directorName: "", 
  facilityPhone: "", 
  facilityEmail: "", 
  loc: {}, 
  status: "Active" 
};

function Hospitals() {
  const [facilities, setFacilities] = useState<ApiFacility[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiFacility | null>(null);
  const [form, setForm] = useState<FormState>(empty);

  useEffect(() => {
    fetchFacilities();
  }, []);

  const fetchFacilities = async () => {
    try {
      setLoading(true);
      const response = await api.getFacilities();
      setFacilities(response.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load facilities");
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (f: ApiFacility) => {
    setEditing(f);
    setForm({ 
      name: f.name, 
      type: f.type, 
      directorName: f.directorName || "", 
      facilityPhone: f.facilityPhone || "", 
      facilityEmail: f.facilityEmail || "", 
      loc: { province: f.province, district: f.district, sector: f.sector }, 
      status: f.status 
    });
    setOpen(true);
  };

  const submit = async () => {
    try {
      if (!form.name || !form.loc.province || !form.loc.district) { 
        toast.error("Name, province, and district are required"); 
        return; 
      }
      if (!form.directorName || !form.facilityPhone || !form.facilityEmail) {
        toast.error("Director name, phone, and email are required");
        return;
      }

      const payload = { 
        name: form.name, 
        type: form.type, 
        province: form.loc.province!, 
        district: form.loc.district!,
        sector: form.loc.sector,
        directorName: form.directorName,
        facilityPhone: form.facilityPhone,
        facilityEmail: form.facilityEmail,
        ...(editing ? { status: form.status } : {}),  // only send status on update
      };

      if (editing) {
        await api.updateFacility(editing.id, payload);
        toast.success("Facility updated");
      } else {
        await api.createFacility(payload);
        toast.success("Facility registered");
      }
      setOpen(false);
      fetchFacilities();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save facility");
    }
  };

  const handleDelete = async (f: ApiFacility) => {
    if (confirm(`Delete ${f.name}?`)) {
      try {
        await api.deleteFacility(f.id);
        toast.success("Facility deleted");
        fetchFacilities();
      } catch (err) {
        console.error(err);
        toast.error("Failed to delete facility");
      }
    }
  };

  const total = facilities.length;
  const hcs = facilities.filter((f) => f.type === "HEALTH_CENTER").length;
  const dhs = facilities.filter((f) => f.type === "DISTRICT_HOSPITAL").length;

  if (loading) {
    return (
      <>
        <TopBar title="Hospitals & facilities" subtitle="Loading facilities..." />
        <div className="p-6 flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Hospitals & facilities" subtitle="Register, edit and manage all health facilities in the system" />
      <div className="p-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Total facilities" value={String(total)} />
          <Stat label="Health centers" value={String(hcs)} />
          <Stat label="District hospitals" value={String(dhs)} />
        </div>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /><h3 className="font-semibold text-sm">All facilities</h3></div>
            <Button className="gap-2" onClick={openNew}><Plus className="h-4 w-4" /> Add facility</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Facility</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Children</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facilities.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{f.name}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">{f.code}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{f.type.replace(/_/g, " ")}</Badge></TableCell>
                  <TableCell className="text-sm">{f.district} · {f.province}</TableCell>
                  <TableCell className="text-sm">{f.staffCount}</TableCell>
                  <TableCell className="text-sm">{f.childrenCount.toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={`text-[10px] px-2 py-1 rounded-full border ${f.status === "Active" ? "bg-[color:var(--success)]/15 text-[color:var(--success)] border-[color:var(--success)]/30" : "bg-[color:var(--warning)]/15 text-[color:var(--warning)] border-[color:var(--warning)]/30"}`}>{f.status}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(f)}><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(f)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {facilities.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">No facilities yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Edit facility" : "Register new facility"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Facility name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Kabgayi DH" /></Field>
              <Field label="Type *">
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as FacilityType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HEALTH_CENTER">Health Center</SelectItem>
                    <SelectItem value="HEALTH_POST">Health Post</SelectItem>
                    <SelectItem value="DISTRICT_HOSPITAL">District Hospital</SelectItem>
                    <SelectItem value="REFERRAL_HOSPITAL">Referral Hospital</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Location (Province → District → Sector)</div>
              <LocationPicker
                key={`loc-${editing?.id ?? "new"}`}
                value={form.loc}
                onChange={(loc) => setForm((prev) => ({ ...prev, loc }))}
                maxLevel="sector"
              />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hospital Director & Contact Information</div>
              <div className="grid grid-cols-1 gap-3">
                <Field label="Director Full Name *"><Input value={form.directorName} onChange={(e) => setForm({ ...form, directorName: e.target.value })} placeholder="Dr. Jean Claude Nshimiyimana" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Hospital Phone *"><Input value={form.facilityPhone} onChange={(e) => setForm({ ...form, facilityPhone: e.target.value })} placeholder="+250 788 123 456" /></Field>
                <Field label="Hospital Email *"><Input type="email" value={form.facilityEmail} onChange={(e) => setForm({ ...form, facilityEmail: e.target.value })} placeholder="hospital@moh.gov.rw" /></Field>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <Field label="Status">
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as FacilityStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>{editing ? "Save changes" : "Register facility"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="p-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold mt-1.5 ${tone ?? ""}`}>{value}</div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}
