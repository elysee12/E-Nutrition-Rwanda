import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Filter, Plus, Search, Loader2, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TopBar } from "@/components/web/TopBar";
import { RegisterChildDialog } from "@/components/web/RegisterChildDialog";
import { EditChildDialog } from "@/components/web/EditChildDialog";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useRole } from "@/lib/role";
import { api, type Child, type NutritionStatus } from "@/lib/api";
import { toast } from "sonner";
import { handleError } from "@/lib/error-handler";

export const Route = createFileRoute("/web/children")({
  head: () => ({ meta: [{ title: "Children Registry — E-Nutrition Rwanda" }] }),
  component: ChildrenPage,
});

function ChildrenPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | NutritionStatus>("all");
  const [regOpen, setRegOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [children, setChildren] = useState<Child[]>([]);
  const [totalChildren, setTotalChildren] = useState(0);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editChild, setEditChild] = useState<Child | null>(null);

  // Delete state
  const [deleteChild, setDeleteChild] = useState<Child | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const role = useRole();
  const normalizedRole = role?.toLowerCase();
  const canRegister = normalizedRole === "nutritionist" || normalizedRole === "chw";
  const canDelete = normalizedRole === "admin" || normalizedRole === "data-manager";

  useEffect(() => {
    fetchChildren();
  }, [currentPage, pageSize, q, status]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const response = await api.getChildren({
        page: currentPage,
        limit: pageSize,
        search: q || undefined,
        status: status === "all" ? undefined : status,
      });
      setChildren(response.data);
      setTotalChildren(response.meta.total);
    } catch (error) {
      const errorMessage = handleError(error, "Failed to load children");
      toast.error(errorMessage);
      setChildren([]);
      setTotalChildren(0);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteChild) return;
    try {
      setDeleteLoading(true);
      await api.deleteChild(deleteChild.id);
      toast.success(`${deleteChild.name} has been removed from the registry`);
      setDeleteChild(null);
      fetchChildren();
    } catch (error: any) {
      const errorMessage = handleError(error, "Failed to remove child");
      toast.error(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const totalPages = Math.ceil(totalChildren / pageSize);

  return (
    <>
      <TopBar
        title="Children Registry"
        subtitle={`${totalChildren} under-five children enrolled · ${canRegister ? "Full access" : "View only"}`}
      />
      <div className="p-6 space-y-5">
        {/* Toolbar */}
        <Card className="p-4 flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 rounded-lg border border-input bg-card px-3 flex-1 min-w-[220px]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => { setQ(e.target.value); setCurrentPage(1); }}
              placeholder="Search by name, code (ENR-…), caregiver…"
              className="border-0 shadow-none focus-visible:ring-0 px-0 h-9 bg-transparent"
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Normal">Normal</SelectItem>
              <SelectItem value="MAM">MAM</SelectItem>
              <SelectItem value="SAM">SAM</SelectItem>
              <SelectItem value="Stunting">Stunting</SelectItem>
              <SelectItem value="Underweight">Underweight</SelectItem>
              <SelectItem value="Wasting">Wasting</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2"><Filter className="h-4 w-4" /> More filters</Button>
          {canRegister ? (
            <Button
              className="gap-2 bg-gradient-to-r from-[#16a34a] to-[#059669] hover:from-[#15803d] hover:to-[#047857] shadow-md"
              onClick={() => setRegOpen(true)}
            >
              <Plus className="h-4 w-4" /> Register child
            </Button>
          ) : (
            <Button className="gap-2" disabled>
              <Plus className="h-4 w-4" /> Register child
            </Button>
          )}
        </Card>

        <RegisterChildDialog open={regOpen} onOpenChange={setRegOpen} onSuccess={fetchChildren} />

        {editChild && (
          <EditChildDialog
            open={!!editChild}
            onOpenChange={(v) => { if (!v) setEditChild(null); }}
            child={editChild}
            onSuccess={() => { setEditChild(null); fetchChildren(); }}
          />
        )}

        {/* Table */}
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-28">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-16">Sex</TableHead>
                <TableHead className="w-20">Age</TableHead>
                <TableHead>Caregiver</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead className="w-16 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Loading children…</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : children.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">
                    No children match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                children.map((c) => (
                  <TableRow key={c.id} className="group">
                    <TableCell className="font-mono text-xs font-semibold text-emerald-700">
                      <Link to="/web/children/$childId" params={{ childId: c.id }} className="hover:underline">
                        {c.code}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link to="/web/children/$childId" params={{ childId: c.id }} className="hover:text-primary group-hover:underline">
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{c.sex}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{c.ageMonths} mo</TableCell>
                    <TableCell className="text-sm">
                      {c.caregiverName || "N/A"}
                      {c.caregiverPhone && (
                        <div className="text-[11px] text-muted-foreground">{c.caregiverPhone}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.village}, {c.sector}
                      <div>{c.district} · {c.province}</div>
                    </TableCell>
                    <TableCell className="text-sm">{c.facility?.name || "N/A"}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer"
                            onClick={() => setEditChild(c)}
                          >
                            <Pencil className="h-4 w-4 text-blue-500" />
                            Edit
                          </DropdownMenuItem>
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="gap-2 text-red-600 focus:text-red-600 cursor-pointer"
                                onClick={() => setDeleteChild(c)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {totalChildren > 0 && (
            <DataTablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={totalChildren}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </Card>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteChild} onOpenChange={(v) => { if (!v) setDeleteChild(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove child from registry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate{" "}
              <strong>{deleteChild?.name}</strong>{" "}
              (<span className="font-mono">{deleteChild?.code}</span>) from the system.
              Their records are preserved but they will no longer appear in active lists.
              This action can be reversed by an administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Removing…
                </span>
              ) : (
                "Yes, remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
