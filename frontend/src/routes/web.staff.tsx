import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { TopBar } from "@/components/web/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, UserCog, Edit2, Trash2, Loader2 } from "lucide-react";
import { LocationPicker, type LocationValue } from "@/components/LocationPicker";
import { api, type User as ApiUser, type UserRole, type UserStatus, type Facility } from "@/lib/api";
import { useRole, getStoredUser } from "@/lib/role";

export const Route = createFileRoute("/web/staff")({
  head: () => ({ meta: [{ title: "Staff Register — E-Nutrition Rwanda" }] }),
  component: Staff,
});

type RoleOption = "NURSE" | "CHW" | "DATA_MANAGER" | "ADMIN";
type FormState = {
  role: RoleOption;
  name: string;
  email: string;
  phone: string;
  facilityId: string;
  loc: LocationValue;
};

const empty: FormState = { 
  role: "NURSE", 
  name: "", 
  email: "", 
  phone: "", 
  facilityId: "", 
  loc: {} 
};

function Staff() {
  const role = useRole();
  const isAdmin = role === "admin";
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiUser | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) setCurrentUser(storedUser);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersResponse, facilitiesResponse] = await Promise.all([
        api.getUsers({ limit: 1000 }), // Request a large limit to get all staff for tab counts
        api.getFacilities({ limit: 1000 }), // Request a large limit for the facility dropdown
      ]);
      setUsers(usersResponse.data);
      setFacilities(facilitiesResponse.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const availableRoles: RoleOption[] = useMemo(
    () => (isAdmin ? ["NURSE", "CHW", "DATA_MANAGER", "ADMIN"] : ["NURSE", "CHW"]),
    [isAdmin],
  );

  const openNew = () => {
    setEditing(null);
    const defaultForm = { ...empty };
    if (currentUser?.facilityId && defaultForm.role !== "ADMIN") {
      defaultForm.facilityId = currentUser.facilityId;
    } else {
      defaultForm.facilityId = "";
    }
    setForm(defaultForm);
    setOpen(true);
  };
  
  const openEdit = (u: ApiUser) => {
    setEditing(u);
    setForm({
      role: u.role as RoleOption,
      name: u.name,
      email: u.email,
      phone: u.phone ?? "",
      facilityId: u.facilityId ?? "",
      loc: { 
        province: u.province, 
        district: u.district, 
        sector: u.sector, 
        cell: u.cell, 
        village: u.village 
      },
    });
    setOpen(true);
  };

  const needsFacility = form.role !== "ADMIN" && !currentUser?.facilityId; // Only show if no auto-assigned facility
  const needsVillage = form.role === "CHW";
  // All roles need location; CHW goes all the way to village level
  const locationMaxLevel = form.role === "CHW" ? "village" as const : "sector" as const;

  const submit = async () => {
    try {
      if (!form.name || !form.email) { 
        toast.error("Name and email are required"); 
        return; 
      }
      if (needsVillage && !form.loc.village) { 
        toast.error("Pick the CHW village"); 
        return; 
      }

      const assignedFacilityId = currentUser?.facilityId || form.facilityId;
      if (form.role !== "ADMIN" && !assignedFacilityId) { 
        toast.error("Facility assignment required"); 
        return; 
      }

      const payload: any = {
        name: form.name,
        email: form.email,
        role: form.role,
        phone: form.phone,
        province: form.loc.province,
        district: form.loc.district,
        sector: form.loc.sector,
        cell: form.loc.cell,
        village: form.loc.village,
      };
      
      if (form.role !== "ADMIN") {
        const assignedFacilityId = currentUser?.facilityId || form.facilityId;
        if (!assignedFacilityId) { 
          toast.error("Facility assignment required"); 
          return; 
        }
        payload.facilityId = assignedFacilityId;
      }

      if (!editing) {
        payload.password = "temp1234"; // Temporary password for new users
      }

      if (editing) {
        await api.updateUser(editing.id, payload);
        toast.success(`${form.role} updated`);
      } else {
        await api.createUser(payload);
        toast.success(`${form.role} registered`);
      }
      setOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save user");
    }
  };

  const handleToggleStatus = async (u: ApiUser) => {
    try {
      await api.toggleUserStatus(u.id);
      toast.success(`${u.name} ${u.status === "Active" ? "suspended" : "activated"}`);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (u: ApiUser) => {
    if (confirm(`Remove ${u.name}?`)) {
      try {
        await api.deleteUser(u.id);
        toast.success("Account removed");
        fetchData();
      } catch (err) {
        console.error(err);
        toast.error("Failed to delete account");
      }
    }
  };

  const nurses = users.filter((u) => u.role === "NURSE");
  const chws = users.filter((u) => u.role === "CHW");
  const dataManagers = users.filter((u) => u.role === "DATA_MANAGER");
  const admins = users.filter((u) => u.role === "ADMIN");

  if (loading) {
    return (
      <>
        <TopBar title="Staff register" subtitle="Loading staff..." />
        <div className="p-6 flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar
        title="Staff register"
        subtitle={isAdmin
          ? "Admin · create and manage every system account (Nurse, CHW, Data Manager, Admin)"
          : "Register and manage nurses and CHWs in your catchment"}
      />
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><UserCog className="h-4 w-4 text-[#16a34a]" /><h2 className="text-sm font-semibold">Facility staff</h2></div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" className="gap-1.5 bg-gradient-to-r from-[#16a34a] to-[#059669] hover:from-[#15803d] hover:to-[#047857]" onClick={openNew}>
              <Plus className="h-3.5 w-3.5" /> Add User
            </Button>
          </div>
        </div>

        <Tabs defaultValue="nurses">
          <TabsList>
            <TabsTrigger value="nurses">Nurses & Nutritionists ({nurses.length})</TabsTrigger>
            <TabsTrigger value="chws">CHWs ({chws.length})</TabsTrigger>
            {isAdmin && <TabsTrigger value="dm">Data Managers ({dataManagers.length})</TabsTrigger>}
            {isAdmin && <TabsTrigger value="admins">Admins ({admins.length})</TabsTrigger>}
          </TabsList>
          <TabsContent value="nurses"><StaffTable list={nurses} columnLabel="Hospital" onEdit={openEdit} onToggleStatus={handleToggleStatus} onDelete={handleDelete} /></TabsContent>
          <TabsContent value="chws"><StaffTable list={chws} columnLabel="Village · Sector" onEdit={openEdit} onToggleStatus={handleToggleStatus} onDelete={handleDelete} /></TabsContent>
          {isAdmin && <TabsContent value="dm"><StaffTable list={dataManagers} columnLabel="Health center" onEdit={openEdit} onToggleStatus={handleToggleStatus} onDelete={handleDelete} /></TabsContent>}
          {isAdmin && <TabsContent value="admins"><StaffTable list={admins} columnLabel="Office" onEdit={openEdit} onToggleStatus={handleToggleStatus} onDelete={handleDelete} /></TabsContent>}
        </Tabs>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${form.role}` : `Add New User`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Role *">
                <Select value={form.role} onValueChange={(v) => {
                  const newRole = v as RoleOption;
                  setForm((prev) => ({
                    ...prev,
                    role: newRole,
                    facilityId: newRole === "ADMIN" ? "" : (currentUser?.facilityId || prev.facilityId),
                  }));
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((r) => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Full name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mukamana Esther" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email *"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@moh.gov.rw" /></Field>
              <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+250 7…" /></Field>
            </div>
            {currentUser?.facilityId && form.role !== "ADMIN" && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="text-xs font-medium text-emerald-900">Assigned Hospital</div>
                <div className="text-sm font-semibold text-emerald-700 mt-0.5">{currentUser.facility?.name}</div>
                <div className="text-[11px] text-emerald-600 mt-1">Automatically inherited from your account</div>
              </div>
            )}
            {needsFacility && (
              <Field label={form.role === "DATA_MANAGER" ? "Assigned health center *" : "Assigned hospital *"}>
                <Select value={form.facilityId} onValueChange={(v) => setForm({ ...form, facilityId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select hospital / health center" /></SelectTrigger>
                  <SelectContent>
                    {facilities.map((f) => <SelectItem key={f.id} value={f.id}>{f.name} — {f.type.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {needsVillage
                  ? "Village assignment (Province → District → Sector → Cell → Village)"
                  : "Location (Province → District → Sector)"}
              </div>
              <LocationPicker
                key={`loc-${editing?.id ?? "new"}-${form.role}`}
                value={form.loc}
                onChange={(loc) => setForm((prev) => ({ ...prev, loc }))}
                maxLevel={locationMaxLevel}
              />
            </div>
            {!editing && (
              <p className="text-[11px] text-muted-foreground border-t border-border pt-2">
                A temporary password will be set. They will be prompted to change it on first login.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>{editing ? "Save changes" : "Create account"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StaffTable({ 
  list, 
  columnLabel, 
  onEdit, 
  onToggleStatus, 
  onDelete 
}: { 
  list: ApiUser[]; 
  columnLabel: string; 
  onEdit: (u: ApiUser) => void; 
  onToggleStatus: (u: ApiUser) => void; 
  onDelete: (u: ApiUser) => void; 
}) {
  return (
    <Card className="overflow-hidden mt-3">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>{columnLabel}</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((u) => (
            <TableRow key={u.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8"><AvatarFallback className="bg-[color:var(--primary-soft)] text-primary text-xs">{u.name.split(" ").map((n: string) => n[0]).slice(0,2).join("")}</AvatarFallback></Avatar>
                  <div>
                    <div className="font-medium text-sm">{u.name}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">{u.code}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
              <TableCell><Badge variant="outline">{u.role.replace(/_/g, " ")}</Badge></TableCell>
              <TableCell className="text-sm">
                {u.role === "CHW" ? `${u.village ?? "—"} · ${u.sector ?? "—"}` : u.facility?.name}
              </TableCell>
              <TableCell>
                <button onClick={() => onToggleStatus(u)}
                  className={`text-[10px] px-2 py-1 rounded-full border ${u.status === "Active" ? "bg-[color:var(--success)]/15 text-[color:var(--success)] border-[color:var(--success)]/30" : "bg-destructive/15 text-destructive border-destructive/30"}`}>{u.status}</button>
              </TableCell>
              <TableCell className="text-right">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(u)}><Edit2 className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onDelete(u)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </TableCell>
            </TableRow>
          ))}
          {list.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">No accounts yet.</TableCell></TableRow>}
        </TableBody>
      </Table>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}
