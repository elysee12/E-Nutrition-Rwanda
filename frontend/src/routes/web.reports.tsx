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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, FileSpreadsheet, Loader2, Building2 } from "lucide-react";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useRole, getStoredUser } from "@/lib/role";
import { api, type Assessment, type NutritionStatus, type Child } from "@/lib/api";

export const Route = createFileRoute("/web/reports")({
  head: () => ({ meta: [{ title: "Reports — E-Nutrition Rwanda" }] }),
  component: Reports,
});

type FilterType = "all" | "day" | "week" | "month" | "custom";

function Reports() {
  const role = useRole();
  const user = getStoredUser();
  const isAdmin = role?.toLowerCase() === "admin";
  
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [statusFilter, setStatusFilter] = useState<NutritionStatus | "all">("all");
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [children, setChildren] = useState<(Child & { assessments: Assessment[] })[]>([]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const [childrenResponse, facilitiesResponse] = await Promise.all([
        api.getChildren({ limit: 1000 }),
        isAdmin ? api.getFacilities({ limit: 1000 }) : Promise.resolve({ data: [] }),
      ]);
      setChildren(childrenResponse.data as any);
      if (isAdmin) {
        setFacilities(facilitiesResponse.data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChildren();
  }, []);

  // Create child with latest assessment (or virtual if no assessment)
  const filteredItems = useMemo(() => {
    let filtered = children;
    
    // Filter by selected facility (Admin view)
    if (isAdmin && selectedFacilityId !== "all") {
      filtered = filtered.filter(c => c.facilityId === selectedFacilityId);
    }
    
    // Filter by user's facility if not admin
    if (!isAdmin && user?.facilityId) {
      filtered = filtered.filter(c => c.facilityId === user.facilityId);
    }
    
    // Filter by status
    filtered = filtered.filter(child => {
      const passesStatus = statusFilter === "all" || child.currentStatus === statusFilter;
      
      // Filter by date range (using latest assessment date, or ignore if no assessment)
      const latestAssessment = child.assessments?.[0];
      let passesDate = true;
      if (latestAssessment) {
        const assessmentDate = new Date(latestAssessment.assessmentDate);
        const today = new Date();
        switch (filterType) {
          case "day":
            passesDate = assessmentDate.toDateString() === today.toDateString();
            break;
          case "week":
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            passesDate = assessmentDate >= weekAgo && assessmentDate <= today;
            break;
          case "month":
            const monthAgo = new Date(today);
            monthAgo.setMonth(today.getMonth() - 1);
            passesDate = assessmentDate >= monthAgo && assessmentDate <= today;
            break;
          case "custom":
            if (fromDate && toDate) {
              const from = new Date(fromDate);
              const to = new Date(toDate);
              to.setHours(23, 59, 59, 999);
              passesDate = assessmentDate >= from && assessmentDate <= to;
            }
            break;
        }
      }
      
      return passesStatus && passesDate;
    });
    
    return filtered;
  }, [children, filterType, fromDate, toDate, statusFilter, selectedFacilityId, isAdmin, user?.facilityId]);

  // Get latest assessment for each child, or create a "virtual" one if none exists
  const latestAssessments = useMemo(() => {
    return filteredItems.map(child => {
      const latestAssessment = child.assessments?.[0];
      if (latestAssessment) {
        return {
          ...latestAssessment,
          child: child,
          // Ensure nested properties have defaults
          assessedBy: latestAssessment.assessedBy || { name: "N/A", role: "N/A" },
          facility: latestAssessment.facility || child.facility || { name: "Unknown Facility", type: "UNKNOWN" },
        };
      }
      // Virtual assessment for children without any assessments
      return {
        id: "virtual-" + child.id,
        child,
        childId: child.id,
        nutritionStatus: child.currentStatus,
        assessmentDate: child.createdAt,
        facility: child.facility || { name: "Unknown Facility", type: "UNKNOWN" },
        facilityId: child.facilityId,
        assessedBy: { name: "N/A", role: "N/A" },
        weightKg: 0,
        heightCm: 0,
        muacCm: 0,
        isSAM: false,
        isMAM: false,
        isStunted: false,
        isUnderweight: false,
        isWasted: false,
        code: "N/A",
        type: "N/A",
        status: "N/A",
        requiresFollowUp: false,
        createdAt: child.createdAt,
        updatedAt: child.updatedAt,
      } as any;
    });
  }, [filteredItems]);

  // Overall summary stats - mutually exclusive classification (priority: SAM > MAM > Wasting > Stunting > Underweight > Normal)
  const overallStats = useMemo(() => {
    let total = 0, normal = 0, sam = 0, mam = 0, wasting = 0, stunting = 0, underweight = 0;
    filteredItems.forEach(child => {
      total++;
      switch (child.currentStatus) {
        case 'SAM':
          sam++;
          break;
        case 'MAM':
          mam++;
          break;
        case 'Wasting':
          wasting++;
          break;
        case 'Stunting':
          stunting++;
          break;
        case 'Underweight':
          underweight++;
          break;
        default:
          normal++;
      }
    });
    return { total, normal, sam, mam, wasting, stunting, underweight };
  }, [filteredItems]);

  // Get selected facility name for display
  const selectedFacilityName = useMemo(() => {
    if (selectedFacilityId === "all") return "All Facilities";
    const facility = facilities.find(f => f.id === selectedFacilityId);
    return facility?.name || "Unknown Facility";
  }, [selectedFacilityId, facilities]);

  // Pagination
  const totalPages = Math.ceil(latestAssessments.length / pageSize);
  const paginatedAssessments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return latestAssessments.slice(start, start + pageSize);
  }, [latestAssessments, currentPage, pageSize]);

  const getStatusColor = (status: NutritionStatus) => {
    switch (status) {
      case "SAM": return "bg-red-100 text-red-800 border-red-200";
      case "MAM": return "bg-orange-100 text-orange-800 border-orange-200";
      case "Stunting": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Underweight": return "bg-blue-100 text-blue-800 border-blue-200";
      case "Wasting": return "bg-purple-100 text-purple-800 border-purple-200";
      default: return "bg-green-100 text-green-800 border-green-200";
    }
  };

  const exportToCSV = () => {
    if (latestAssessments.length === 0) {
      toast.error("No assessments to export");
      return;
    }

    const headers = [
      "Date & Time",
      "Assessment Code",
      "Child Name",
      "Assessed By",
      "Role",
      "Facility",
      "Nutrition Status",
      "Weight (kg)",
      "Height (cm)",
      "MUAC (cm)",
      "Z-Score WFH",
      "Z-Score HFA",
      "Z-Score WFA",
      "Is SAM",
      "Is MAM",
      "Is Stunted",
      "Is Underweight",
      "Is Wasted",
    ];

    const rows = latestAssessments.map((assessment) => [
      new Date(assessment.assessmentDate).toLocaleString(),
      assessment.code,
      assessment.child.name,
      assessment.assessedBy.name,
      assessment.assessedBy.role,
      assessment.facility.name,
      assessment.nutritionStatus,
      assessment.weightKg,
      assessment.heightCm,
      assessment.muacCm,
      assessment.zScoreWFH ?? "",
      assessment.zScoreHFA ?? "",
      assessment.zScoreWFA ?? "",
      assessment.isSAM ? "Yes" : "No",
      assessment.isMAM ? "Yes" : "No",
      assessment.isStunted ? "Yes" : "No",
      assessment.isUnderweight ? "Yes" : "No",
      assessment.isWasted ? "Yes" : "No",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => {
          if (typeof cell === "string" && (cell.includes(",") || cell.includes('"'))) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        }).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `assessment-report-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Export successful!");
  };

  if (loading) {
    return (
      <>
        <TopBar title="Reports" subtitle="Loading..." />
        <div className="p-10 flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading assessments...</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar 
        title="Reports" 
        subtitle={isAdmin 
          ? "System-wide assessment reports across all facilities" 
          : "View and export assessment reports for your facility"}
      />
      <div className="p-6 space-y-5">
        {/* Filter Section */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            {isAdmin && (
              <div className="space-y-1.5 flex-1 min-w-[250px]">
                <Label className="text-xs text-muted-foreground font-semibold">
                  <Building2 className="h-3.5 w-3.5 inline mr-1" />
                  View Facility/Hospital
                </Label>
                <Select value={selectedFacilityId} onValueChange={setSelectedFacilityId}>
                  <SelectTrigger className="font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <span className="font-semibold">All Facilities (System-wide)</span>
                    </SelectItem>
                    {facilities.map((facility) => (
                      <SelectItem key={facility.id} value={facility.id}>
                        <div className="flex items-center gap-2">
                          <span>{facility.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({facility.type.replace(/_/g, " ")})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground">Time Period</Label>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="day">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground">Status Filter</Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="SAM">SAM</SelectItem>
                  <SelectItem value="MAM">MAM</SelectItem>
                  <SelectItem value="Stunting">Stunting</SelectItem>
                  <SelectItem value="Underweight">Underweight</SelectItem>
                  <SelectItem value="Wasting">Wasting</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filterType === "custom" && (
              <>
                <div className="space-y-1.5 flex-1 min-w-[150px]">
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    max={toDate || undefined}
                  />
                </div>
                <div className="space-y-1.5 flex-1 min-w-[150px]">
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    min={fromDate || undefined}
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>
              </>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={exportToCSV}>
                <FileSpreadsheet className="h-4 w-4" /> Export CSV
              </Button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                {selectedFacilityName}
              </h4>
              {isAdmin && selectedFacilityId !== "all" && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedFacilityId("all")}
                  className="text-xs"
                >
                  View All Facilities
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <div>
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="text-2xl font-bold text-slate-900">{overallStats.total}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Normal</div>
                <div className="text-2xl font-bold text-green-600">{overallStats.normal}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">SAM</div>
                <div className="text-2xl font-bold text-red-600">{overallStats.sam}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">MAM</div>
                <div className="text-2xl font-bold text-orange-600">{overallStats.mam}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Wasting</div>
                <div className="text-2xl font-bold text-purple-600">{overallStats.wasting}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Stunting</div>
                <div className="text-2xl font-bold text-yellow-600">{overallStats.stunting}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Underweight</div>
                <div className="text-2xl font-bold text-blue-600">{overallStats.underweight}</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Assessment Table */}
        <Card className="overflow-hidden">
          <h3 className="p-4 font-semibold border-b flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {selectedFacilityId === "all" ? "All Assessments" : `${selectedFacilityName} - Assessments`}
          </h3>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Date & Time</TableHead>
                <TableHead>Assessment Code</TableHead>
                <TableHead>Child Name</TableHead>
                <TableHead>Assessed By</TableHead>
                {isAdmin && <TableHead>Facility</TableHead>}
                <TableHead>Results</TableHead>
                <TableHead>Measurements</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAssessments.map((assessment) => (
                <TableRow key={assessment.id}>
                  <TableCell>
                    <div className="font-medium text-sm">
                      {new Date(assessment.assessmentDate).toLocaleDateString('en-US', { 
                        month: 'short', day: 'numeric', year: 'numeric' 
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(assessment.assessmentDate).toLocaleTimeString('en-US', { 
                        hour: '2-digit', minute: '2-digit' 
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{assessment.code}</TableCell>
                  <TableCell className="font-medium text-sm">{assessment.child.name}</TableCell>
                  <TableCell className="text-sm">
                    <div>{assessment.assessedBy.name}</div>
                    <div className="text-xs text-muted-foreground">{assessment.assessedBy.role}</div>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-sm">{assessment.facility.name}</TableCell>
                  )}
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(assessment.nutritionStatus)}>
                      {assessment.nutritionStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div>W: {assessment.weightKg} kg</div>
                    <div>H: {assessment.heightCm} cm</div>
                    <div>MUAC: {assessment.muacCm} cm</div>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedAssessments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-sm text-muted-foreground py-10">
                    No assessments found for the selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {latestAssessments.length > 0 && (
            <DataTablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={latestAssessments.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </Card>
      </div>
    </>
  );
}
