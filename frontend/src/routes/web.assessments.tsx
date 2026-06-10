import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/web/TopBar";
import { ChildSearchDialog } from "@/components/web/ChildSearchDialog";
import { FieldWithValidation } from "@/components/web/FormValidationDisplay";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Stethoscope, Calendar, CheckCircle2, AlertTriangle, Plus, Activity, Search, Eye } from "lucide-react";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { statusColor } from "@/lib/utils";
import { useState, useMemo, useEffect } from "react";
import { classifyMalnutrition, getStatusColor, type ClassificationResult } from "@/lib/nutrition-classification";
import { toast } from "sonner";
import { api, type Child, type Assessment } from "@/lib/api";
import { useAssessmentValidation } from "@/hooks/useFormValidation";
import { getWeightError, getHeightError, getMUACError } from "@/lib/validation";

export const Route = createFileRoute("/web/assessments")({
  head: () => ({ meta: [{ title: "Assessments — E-Nutrition Rwanda" }] }),
  component: Assessments,
});

function Assessments() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [openReview, setOpenReview] = useState(false);
  const [openSearch, setOpenSearch] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [formData, setFormData] = useState({
    childId: "",
    weight: "",
    height: "",
    muac: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  
  const isUnder6Months = selectedChild ? selectedChild.ageMonths <= 6 : false;
  
  // Form validation
  const validation = useAssessmentValidation();
  
  // Pagination state for each tab
  const [pendingReviewPage, setPendingReviewPage] = useState(1);
  const [pendingReviewPageSize, setPendingReviewPageSize] = useState(10);
  const [followupsPage, setFollowupsPage] = useState(1);
  const [followupsPageSize, setFollowupsPageSize] = useState(10);
  const [reviewedPage, setReviewedPage] = useState(1);
  const [reviewedPageSize, setReviewedPageSize] = useState(10);

  // KPI stats derived from real data
  const [stats, setStats] = useState({
    pendingReview: 0,
    followupsThisWeek: 0,
    criticalSAM: 0,
    reviewedToday: 0,
    normal: 0,
    sam: 0,
    mam: 0,
    wasting: 0,
    stunting: 0,
    underweight: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [assessmentsResponse, childrenResponse, dashboardStats] = await Promise.all([
        api.getAssessments({ limit: 100 }),
        api.getChildren({ limit: 100 }),
        api.getDashboardStats().catch(() => ({})),
      ]);

      const rawAssessments = assessmentsResponse.data;
      setAssessments(rawAssessments);
      setChildren(childrenResponse.data);

      // Get only most recent assessment per child for KPI stats
      const getMostRecentPerChild = (assessmentList: Assessment[]) => {
        const childMap = new Map<string, Assessment>();
        for (const a of assessmentList) {
          const existing = childMap.get(a.childId);
          if (!existing || new Date(a.assessmentDate) > new Date(existing.assessmentDate)) {
            childMap.set(a.childId, a);
          }
        }
        return Array.from(childMap.values());
      };

      const mostRecentAssessments = getMostRecentPerChild(rawAssessments);

      // Derive KPI stats from most recent assessments
      const today = new Date().toDateString();
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      setStats({
        pendingReview: mostRecentAssessments.filter((a) => a.status === "Pending").length,
        criticalSAM: mostRecentAssessments.filter((a) => a.isSAM).length,
        sam: mostRecentAssessments.filter((a) => a.nutritionStatus === "SAM").length,
        mam: mostRecentAssessments.filter((a) => a.nutritionStatus === "MAM").length,
        wasting: mostRecentAssessments.filter((a) => a.nutritionStatus === "Wasting").length,
        stunting: mostRecentAssessments.filter((a) => a.nutritionStatus === "Stunting").length,
        underweight: mostRecentAssessments.filter((a) => a.nutritionStatus === "Underweight").length,
        normal: mostRecentAssessments.filter((a) => a.nutritionStatus === "Normal").length,
        reviewedToday: mostRecentAssessments.filter(
          (a) => a.reviewedAt && new Date(a.reviewedAt).toDateString() === today
        ).length,
        followupsThisWeek: mostRecentAssessments.filter(
          (a) => a.requiresFollowUp && a.followUpDate && new Date(a.followUpDate) >= weekAgo
        ).length,
      });
    } catch (error) {
      console.error("Failed to fetch assessments:", error);
      toast.error("Failed to load assessments.");
    } finally {
      setLoading(false);
    }
  };

  // Tab data - only show most recent per child
  const getMostRecentPerChild = (assessmentList: Assessment[]) => {
    const childMap = new Map<string, Assessment>();
    for (const a of assessmentList) {
      const existing = childMap.get(a.childId);
      if (!existing || new Date(a.assessmentDate) > new Date(existing.assessmentDate)) {
        childMap.set(a.childId, a);
      }
    }
    return Array.from(childMap.values());
  };

  const allAssessments = useMemo(() => getMostRecentPerChild(assessments), [assessments]);

  const pendingReview = useMemo(() =>
    getMostRecentPerChild(assessments.filter((a) => a.status === "Pending")),
    [assessments]
  );

  // Follow-ups: only most recent assessment, and only if that assessment still requires follow-up
  const followups = useMemo(() => {
    const mostRecent = getMostRecentPerChild(assessments);
    return mostRecent.filter(a => a.requiresFollowUp);
  }, [assessments]);

  const reviewed = useMemo(() =>
    getMostRecentPerChild(assessments.filter((a) => a.status === "Reviewed")),
    [assessments]
  );

  // State for interactive KPI cards
  const [activeKpiTab, setActiveKpiTab] = useState<string | null>(null);
  const [showSamOnly, setShowSamOnly] = useState(false);

  // Pagination state for all tab
  const [allPage, setAllPage] = useState(1);
  const [allPageSize, setAllPageSize] = useState(10);

  // Paginated data
  const paginatedAll = useMemo(() => {
    const filtered = showSamOnly ? allAssessments.filter(a => a.isSAM) : allAssessments;
    const start = (allPage - 1) * allPageSize;
    return filtered.slice(start, start + allPageSize);
  }, [allAssessments, allPage, allPageSize, showSamOnly]);

  const paginatedPendingReview = useMemo(() => {
    const start = (pendingReviewPage - 1) * pendingReviewPageSize;
    return pendingReview.slice(start, start + pendingReviewPageSize);
  }, [pendingReview, pendingReviewPage, pendingReviewPageSize]);

  const paginatedFollowups = useMemo(() => {
    const start = (followupsPage - 1) * followupsPageSize;
    return followups.slice(start, start + followupsPageSize);
  }, [followups, followupsPage, followupsPageSize]);

  const paginatedReviewed = useMemo(() => {
    const start = (reviewedPage - 1) * reviewedPageSize;
    return reviewed.slice(start, start + reviewedPageSize);
  }, [reviewed, reviewedPage, reviewedPageSize]);

  // Filter children based on search query
  const filteredChildren = useMemo(() => {
    if (!searchQuery) return children;
    const query = searchQuery.toLowerCase();
    return children.filter(
      (child) =>
        child.name.toLowerCase().includes(query) ||
        child.code.toLowerCase().includes(query)
    );
  }, [searchQuery, children]);

  // Handle child selection
  const handleChildSelect = (childId: string) => {
    const child = children.find((c) => c.id === childId);
    if (child) {
      setSelectedChild(child);
      setFormData({ ...formData, childId });
      setClassification(null); // Reset classification when changing child
    }
  };

  // Calculate classification in real-time
  const handleMeasurementChange = (field: string, value: string) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);

    // Only calculate if we have all required data
    const hasRequiredData = selectedChild && updatedData.weight && updatedData.height && (isUnder6Months || updatedData.muac);
    
    if (hasRequiredData) {
      try {
        const measurementData: any = {
          weight: parseFloat(updatedData.weight),
          height: parseFloat(updatedData.height),
          sex: selectedChild.sex,
          ageMonths: selectedChild.ageMonths,
        };
        if (!isUnder6Months) {
          measurementData.muac = parseFloat(updatedData.muac);
        }
        const result = classifyMalnutrition(measurementData);
        setClassification(result);
      } catch (error) {
        console.error("Classification error:", error);
        setClassification(null);
      }
    } else {
      setClassification(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate fields
    const weightError = getWeightError(formData.weight);
    const heightError = getHeightError(formData.height);
    let muacError;
    if (!isUnder6Months) {
      muacError = getMUACError(formData.muac);
    }

    if (weightError) validation.setError("weight", weightError);
    if (heightError) validation.setError("height", heightError);
    if (muacError) validation.setError("muacCm", muacError);

    if (!selectedChild) {
      toast.error("Please select a child");
      return;
    }

    if (weightError || heightError || muacError) {
      toast.error("Please fix validation errors before submitting");
      return;
    }
    
    if (!classification) {
      toast.error("Unable to calculate classification. Please check measurements.");
      return;
    }

    try {
      // Get current user's facility
      const profile = await api.getProfile();
      
      // Submit assessment to backend
      const assessmentData: any = {
        childId: selectedChild.id,
        facilityId: profile.facilityId || '',
        weightKg: parseFloat(formData.weight),
        heightCm: parseFloat(formData.height),
        hasOedema: false,
        clinicalNotes: classification.recommendations.join('; '),
      };
      if (!isUnder6Months) {
        assessmentData.muacCm = parseFloat(formData.muac);
      }
      await api.createAssessment(assessmentData);
      
      // Show classification result
      if (classification.categories.sam) {
        toast.error(`Critical: Child has ${classification.status}. Immediate action required!`);
      } else if (classification.categories.mam) {
        toast.warning(`Child classified as ${classification.status}. Intervention needed.`);
      } else {
        toast.success(`Assessment complete. Status: ${classification.status}`);
      }
      
      setOpenCreate(false);
      // Reset form
      setFormData({ childId: "", weight: "", height: "", muac: "" });
      setSearchQuery("");
      setSelectedChild(null);
      setClassification(null);
      validation.clearErrors();
      // Refresh list with the newly saved assessment
      await fetchData();
    } catch (error) {
      console.error("Failed to submit assessment:", error);
      toast.error("Failed to submit assessment. Please try again.");
    }
  };

  const handleReview = async () => {
    if (!selectedAssessment) return;

    try {
      await api.reviewAssessment(selectedAssessment.id);
      toast.success("Assessment reviewed successfully!");
      setOpenReview(false);
      await fetchData();
    } catch (error) {
      console.error("Failed to review assessment:", error);
      toast.error("Failed to review assessment.");
    }
  };

  return (
    <>
      <TopBar title="Assessments" subtitle="Review and conduct nutritional assessments for children" />
      <div className="p-8 space-y-6 bg-gradient-to-br from-slate-50 to-white min-h-screen">
        {/* Header with New Assessment Button */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Assessment Overview</h2>
            <p className="text-sm text-slate-600 mt-1">Manage child assessments and clinical evaluations</p>
          </div>
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                <Plus className="h-4 w-4 mr-2" />
                New Assessment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="h-6 w-6 text-emerald-600" />
                  New Child Assessment
                </DialogTitle>
                <DialogDescription className="text-slate-600">
                  Complete the assessment form for the selected child. All measurements should be accurate and up-to-date.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 py-4">
                {/* Child Selection with Search */}
                <div className="space-y-2">
                  <Label htmlFor="childId" className="text-sm font-semibold text-slate-700">
                    Child Name <span className="text-red-500">*</span>
                  </Label>
                  
                  {/* Search Input */}
                  <div className="flex items-center gap-2 rounded-lg border border-input bg-card px-3 mb-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by child name or ID..."
                      className="border-0 shadow-none focus-visible:ring-0 px-0 h-9 bg-transparent"
                    />
                  </div>

                  {/* Selected Child Display */}
                  {selectedChild && (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-sm text-slate-900">{selectedChild.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {selectedChild.code} • {selectedChild.ageMonths} months • {selectedChild.sex === 'M' ? 'Male' : 'Female'} • {selectedChild.village}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedChild(null);
                            setFormData({ ...formData, childId: "" });
                            setSearchQuery("");
                          }}
                          className="text-xs"
                        >
                          Change
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Child Selection Dropdown */}
                  {!selectedChild && (
                    <Select value={formData.childId} onValueChange={handleChildSelect}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a child from registry" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {filteredChildren.length > 0 ? (
                          filteredChildren.map((child) => (
                            <SelectItem key={child.id} value={child.id}>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{child.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {child.code} · {child.ageMonths}mo · {child.sex}
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-center text-sm text-muted-foreground">
                            No children found matching "{searchQuery}"
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Anthropometric Measurements - Only 3 fields */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Anthropometric Measurements</h3>
                  <div className={`grid gap-4 ${isUnder6Months ? "grid-cols-2" : "grid-cols-3"}`}>
                    <FieldWithValidation
                      label="Weight (kg)"
                      required
                      hint="2-30 kg for children 0-5 years"
                      error={validation.getDisplayError("weight")}
                    >
                      <Input
                        id="weight"
                        type="number"
                        step="0.1"
                        placeholder="e.g., 7.5"
                        value={formData.weight}
                        onChange={(e) => {
                          handleMeasurementChange("weight", e.target.value);
                          validation.validateField("weight", e.target.value, "weight");
                        }}
                        onBlur={() => validation.setFieldTouched("weight")}
                        className={validation.getDisplayError("weight") ? "border-red-500" : ""}
                      />
                    </FieldWithValidation>

                    <FieldWithValidation
                      label="Height (cm)"
                      required
                      hint="40-130 cm for children 0-5 years"
                      error={validation.getDisplayError("height")}
                    >
                      <Input
                        id="height"
                        type="number"
                        step="0.1"
                        placeholder="e.g., 75.5"
                        value={formData.height}
                        onChange={(e) => {
                          handleMeasurementChange("height", e.target.value);
                          validation.validateField("height", e.target.value, "height");
                        }}
                        onBlur={() => validation.setFieldTouched("height")}
                        className={validation.getDisplayError("height") ? "border-red-500" : ""}
                      />
                    </FieldWithValidation>

                    {!isUnder6Months && (
                      <FieldWithValidation
                        label="MUAC (cm)"
                        required
                        hint="5-20 cm (SAM: <11.5, MAM: 11.5-12.4)"
                        error={validation.getDisplayError("muacCm")}
                      >
                        <Input
                          id="muac"
                          type="number"
                          step="0.1"
                          placeholder="e.g., 12.5"
                          value={formData.muac}
                          onChange={(e) => {
                            handleMeasurementChange("muac", e.target.value);
                            validation.validateField("muacCm", e.target.value, "muac");
                          }}
                          onBlur={() => validation.setFieldTouched("muacCm")}
                          className={validation.getDisplayError("muacCm") ? "border-red-500" : ""}
                        />
                      </FieldWithValidation>
                    )}
                  </div>
                </div>

                {/* Real-time Classification Results */}
                {classification && (
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Classification Results</h3>
                    
                    {/* Primary Status */}
                    <div className="mb-4">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-sm font-medium text-slate-700">Nutritional Status:</span>
                        <span className={`px-4 py-2 rounded-lg font-bold text-sm border-2 ${getStatusColor(classification.status)}`}>
                          {classification.status}
                        </span>
                      </div>
                    </div>

                    {/* Detailed Indicators */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="text-xs text-slate-600 font-medium mb-1">MUAC Status</div>
                        <div className={`text-sm font-bold ${
                          classification.indicators.muacStatus === "SAM" ? "text-red-700" :
                          classification.indicators.muacStatus === "MAM" ? "text-orange-700" : "text-green-700"
                        }`}>
                          {classification.indicators.muacStatus}
                        </div>
                      </div>
                      
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="text-xs text-slate-600 font-medium mb-1">Weight-for-Height</div>
                        <div className={`text-sm font-bold ${
                          classification.indicators.weightForHeight.includes("Wasting") ? "text-orange-700" : "text-green-700"
                        }`}>
                          {classification.indicators.weightForHeight}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="text-xs text-slate-600 font-medium mb-1">Height-for-Age</div>
                        <div className={`text-sm font-bold ${
                          classification.indicators.heightForAge.includes("Stunting") ? "text-purple-700" : "text-green-700"
                        }`}>
                          {classification.indicators.heightForAge}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="text-xs text-slate-600 font-medium mb-1">Weight-for-Age</div>
                        <div className={`text-sm font-bold ${
                          classification.indicators.weightForAge.includes("Underweight") ? "text-amber-700" : "text-green-700"
                        }`}>
                          {classification.indicators.weightForAge}
                        </div>
                      </div>
                    </div>

                    {/* Z-Scores */}
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 mb-4">
                      <div className="text-xs font-semibold text-blue-900 mb-2">WHO Z-Scores</div>
                      <div className="flex gap-4 text-xs">
                        <span className="text-blue-700">
                          <strong>WHZ:</strong> {classification.zScores.wfh?.toFixed(2)}
                        </span>
                        <span className="text-blue-700">
                          <strong>HAZ:</strong> {classification.zScores.hfa?.toFixed(2)}
                        </span>
                        <span className="text-blue-700">
                          <strong>WAZ:</strong> {classification.zScores.wfa?.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Recommendations */}
                    {classification.recommendations.length > 0 && (
                      <div className={`p-4 rounded-lg border-2 ${
                        classification.categories.sam ? "bg-red-50 border-red-300" :
                        classification.categories.mam ? "bg-orange-50 border-orange-300" :
                        "bg-green-50 border-green-300"
                      }`}>
                        <div className="text-sm font-bold mb-2 flex items-center gap-2">
                          {classification.categories.sam && <AlertTriangle className="h-4 w-4 text-red-600" />}
                          Clinical Recommendations
                        </div>
                        <ul className="space-y-1 text-xs">
                          {classification.recommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-emerald-600 mt-0.5">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <DialogFooter className="border-t pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpenCreate(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
                    disabled={!formData.childId || !formData.weight || !formData.height || (!isUnder6Months && !formData.muac)}
                  >
                    Submit Assessment
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Review Dialog */}
          <Dialog open={openReview} onOpenChange={setOpenReview}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <Eye className="h-6 w-6 text-blue-600" />
                  Assessment Details
                </DialogTitle>
                <DialogDescription className="text-slate-600">
                  Review the complete assessment and recommendations.
                </DialogDescription>
              </DialogHeader>

              {selectedAssessment && (
                <div className="py-4 space-y-6">
                  {/* Child Info */}
                  <div className="border-b pb-4">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Child Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name: </span>
                        <span className="font-medium">{selectedAssessment.child.name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Code: </span>
                        <span className="font-medium font-mono">{selectedAssessment.child.code}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Age: </span>
                        <span className="font-medium">{selectedAssessment.child.ageMonths} months</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Sex: </span>
                        <span className="font-medium">{selectedAssessment.child.sex === 'M' ? 'Male' : 'Female'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Measurements */}
                  <div className="border-b pb-4">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Anthropometric Measurements</h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Weight: </span>
                        <span className="font-medium">{selectedAssessment.weightKg} kg</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Height: </span>
                        <span className="font-medium">{selectedAssessment.heightCm} cm</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">MUAC: </span>
                        <span className="font-medium">{selectedAssessment.muacCm} cm</span>
                      </div>
                    </div>
                  </div>

                  {/* Classification */}
                  <div className="border-b pb-4">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Nutritional Status</h3>
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-4 py-2 rounded-lg font-bold text-sm border-2 ${statusColor(selectedAssessment.nutritionStatus)}`}>
                        {selectedAssessment.nutritionStatus}
                      </span>
                    </div>

                    {/* Z-Scores */}
                    {selectedAssessment.zScoreWFH || selectedAssessment.zScoreHFA || selectedAssessment.zScoreWFA ? (
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <div className="text-xs font-semibold text-blue-900 mb-2">WHO Z-Scores</div>
                        <div className="flex gap-4 text-xs">
                          {selectedAssessment.zScoreWFH !== null && (
                            <span className="text-blue-700">
                              <strong>WHZ:</strong> {selectedAssessment.zScoreWFH?.toFixed(2)}
                            </span>
                          )}
                          {selectedAssessment.zScoreHFA !== null && (
                            <span className="text-blue-700">
                              <strong>HAZ:</strong> {selectedAssessment.zScoreHFA?.toFixed(2)}
                            </span>
                          )}
                          {selectedAssessment.zScoreWFA !== null && (
                            <span className="text-blue-700">
                              <strong>WAZ:</strong> {selectedAssessment.zScoreWFA?.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Recommendations */}
                  {selectedAssessment.recommendations && (
                    <div className="pb-4">
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">Clinical Recommendations</h3>
                      <div className={`p-4 rounded-lg border-2 ${
                        selectedAssessment.isSAM ? "bg-red-50 border-red-300" :
                        selectedAssessment.isMAM ? "bg-orange-50 border-orange-300" :
                        "bg-green-50 border-green-300"
                      }`}>
                        <ul className="space-y-1 text-sm">
                          {selectedAssessment.recommendations.split('; ').map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-emerald-600 mt-0.5">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Assessment Details */}
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Assessment Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Submitted by: </span>
                        <span className="font-medium">{selectedAssessment.assessedBy?.name || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Date: </span>
                        <span className="font-medium">{new Date(selectedAssessment.assessmentDate).toLocaleDateString()}</span>
                      </div>
                      {selectedAssessment.reviewedBy && (
                        <div>
                          <span className="text-muted-foreground">Reviewed by: </span>
                          <span className="font-medium">{selectedAssessment.reviewedBy.name}</span>
                        </div>
                      )}
                      {selectedAssessment.reviewedAt && (
                        <div>
                          <span className="text-muted-foreground">Reviewed at: </span>
                          <span className="font-medium">{new Date(selectedAssessment.reviewedAt).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter className="border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setOpenReview(false)}>
                  Close
                </Button>
                {selectedAssessment && selectedAssessment.status === "Pending" && (
                  <Button 
                    type="button" 
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    onClick={handleReview}
                  >
                    Mark as Reviewed
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Nutrition Status Overview Cards (6 statuses) */}
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6 mb-8">
          <div className="p-6 rounded-xl border bg-white shadow-sm">
            <div className="text-sm font-semibold text-slate-600 mb-1">Normal</div>
            <div className="text-3xl font-bold text-green-700">{stats.normal}</div>
          </div>
          <div className="p-6 rounded-xl border bg-white shadow-sm">
            <div className="text-sm font-semibold text-slate-600 mb-1">SAM</div>
            <div className="text-3xl font-bold text-red-700">{stats.sam}</div>
          </div>
          <div className="p-6 rounded-xl border bg-white shadow-sm">
            <div className="text-sm font-semibold text-slate-600 mb-1">MAM</div>
            <div className="text-3xl font-bold text-orange-700">{stats.mam}</div>
          </div>
          <div className="p-6 rounded-xl border bg-white shadow-sm">
            <div className="text-sm font-semibold text-slate-600 mb-1">Wasting</div>
            <div className="text-3xl font-bold text-purple-700">{stats.wasting}</div>
          </div>
          <div className="p-6 rounded-xl border bg-white shadow-sm">
            <div className="text-sm font-semibold text-slate-600 mb-1">Stunting</div>
            <div className="text-3xl font-bold text-yellow-700">{stats.stunting}</div>
          </div>
          <div className="p-6 rounded-xl border bg-white shadow-sm">
            <div className="text-sm font-semibold text-slate-600 mb-1">Underweight</div>
            <div className="text-3xl font-bold text-blue-700">{stats.underweight}</div>
          </div>
        </div>

        {/* Operational KPI Cards */}
        <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-4">
          <KCard 
            label="Pending review" 
            value={String(stats.pendingReview)} 
            icon={Stethoscope} 
            tone="bg-gradient-to-br from-blue-500/15 to-blue-600/15 text-blue-700 border border-blue-200"
            onClick={() => setActiveKpiTab("pending")}
          />
          <KCard 
            label="Follow-ups this week" 
            value={String(followups.length)} 
            icon={Calendar} 
            tone="bg-gradient-to-br from-emerald-500/15 to-emerald-600/15 text-emerald-700 border border-emerald-200"
            onClick={() => setActiveKpiTab("followups")}
          />
          <KCard 
            label="Reviewed today" 
            value={String(stats.reviewedToday)} 
            icon={CheckCircle2} 
            tone="bg-gradient-to-br from-green-500/15 to-green-600/15 text-green-700 border border-green-200"
            onClick={() => setActiveKpiTab("reviewed")}
          />
        </div>

        {/* Search Button */}
        <div className="flex justify-end pt-2">
          <Button 
            onClick={() => setOpenSearch(true)}
            variant="outline"
            className="gap-2"
          >
            <Search className="h-4 w-4" />
            Search Child History
          </Button>
        </div>

        {/* Child Search Dialog */}
        <ChildSearchDialog open={openSearch} onOpenChange={setOpenSearch} />

        <Tabs 
          defaultValue="pending" 
          value={activeKpiTab || undefined} 
          onValueChange={(val) => {
            setActiveKpiTab(val);
            setShowSamOnly(false);
          }}
        >
          <TabsList>
            <TabsTrigger value="pending">Pending Review ({pendingReview.length})</TabsTrigger>
            <TabsTrigger value="all">All ({allAssessments.length})</TabsTrigger>
            <TabsTrigger value="followups">Scheduled Follow-ups ({followups.length})</TabsTrigger>
            <TabsTrigger value="reviewed">Reviewed ({reviewed.length})</TabsTrigger>
          </TabsList>

          {/* ── PENDING REVIEW ── */}
          <TabsContent value="pending">
            <Card className="overflow-hidden mt-3 shadow-xl border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Child</TableHead>
                    <TableHead>Submitted by</TableHead>
                    <TableHead>Findings</TableHead>
                    <TableHead>Nutrition Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-10">Loading assessments…</TableCell></TableRow>
                  ) : paginatedPendingReview.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No pending reviews</TableCell></TableRow>
                  ) : (
                    paginatedPendingReview.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <Link to="/web/children/$childId" params={{ childId: a.child.id }} className="font-medium text-sm hover:text-primary">{a.child.name}</Link>
                          <div className="text-[11px] text-muted-foreground font-mono">{a.child.code}</div>
                        </TableCell>
                        <TableCell className="text-sm">{a.assessedBy?.name || "N/A"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">MUAC {a.muacCm}cm · {a.weightKg}kg / {a.heightCm}cm</TableCell>
                        <TableCell><span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColor(a.nutritionStatus)}`}>{a.nutritionStatus}</span></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(a.assessmentDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            className="h-8 text-xs bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                            onClick={() => {
                              setSelectedAssessment(a);
                              setOpenReview(true);
                            }}
                          >
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {pendingReview.length > 0 && (
                <DataTablePagination
                  currentPage={pendingReviewPage}
                  totalPages={Math.ceil(pendingReview.length / pendingReviewPageSize)}
                  pageSize={pendingReviewPageSize}
                  totalItems={pendingReview.length}
                  onPageChange={setPendingReviewPage}
                  onPageSizeChange={setPendingReviewPageSize}
                />
              )}
            </Card>
          </TabsContent>

          {/* ── ALL ── */}
          <TabsContent value="all">
            <Card className="overflow-hidden mt-3 shadow-xl border-slate-200">
              {showSamOnly && (
                <div className="p-3 border-b border-red-200 bg-red-50 text-red-700 text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Showing only Critical (SAM) assessments</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs text-red-700 hover:text-red-800 hover:bg-red-100"
                    onClick={() => setShowSamOnly(false)}
                  >
                    Clear filter
                  </Button>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Child</TableHead>
                    <TableHead>Submitted by</TableHead>
                    <TableHead>Findings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-10">Loading assessments…</TableCell></TableRow>
                  ) : paginatedAll.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No assessments yet</TableCell></TableRow>
                  ) : (
                    paginatedAll.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <Link to="/web/children/$childId" params={{ childId: a.child.id }} className="font-medium text-sm hover:text-primary">{a.child.name}</Link>
                          <div className="text-[11px] text-muted-foreground font-mono">{a.child.code}</div>
                        </TableCell>
                        <TableCell className="text-sm">{a.assessedBy?.name || "N/A"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">MUAC {a.muacCm}cm · {a.weightKg}kg / {a.heightCm}cm</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColor(a.nutritionStatus)}`}>{a.nutritionStatus}</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full border ${
                              a.status === "Reviewed" 
                                ? "bg-green-100 text-green-700 border-green-200" 
                                : "bg-yellow-100 text-yellow-700 border-yellow-200"
                            }`}>
                              {a.status}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(a.assessmentDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => {
                              setSelectedAssessment(a);
                              setOpenReview(true);
                            }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {((showSamOnly ? allAssessments.filter(a => a.isSAM).length : allAssessments.length)) > 0 && (
                <DataTablePagination
                  currentPage={allPage}
                  totalPages={Math.ceil((showSamOnly ? allAssessments.filter(a => a.isSAM).length : allAssessments.length) / allPageSize)}
                  pageSize={allPageSize}
                  totalItems={(showSamOnly ? allAssessments.filter(a => a.isSAM).length : allAssessments.length)}
                  onPageChange={setAllPage}
                  onPageSizeChange={setAllPageSize}
                />
              )}
            </Card>
          </TabsContent>

          {/* ── FOLLOW-UPS ── */}
          <TabsContent value="followups">
            <Card className="overflow-hidden mt-3 shadow-xl border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Child</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Next Visit</TableHead>
                    <TableHead>Assigned CHW</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedFollowups.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.child.name}</TableCell>
                      <TableCell className="text-sm">{a.isSAM ? "Weekly CMAM + RUTF" : a.isMAM ? "Bi-weekly supplementation" : "Monthly growth check"}</TableCell>
                      <TableCell className="text-xs">{a.followUpDate ? new Date(a.followUpDate).toLocaleDateString() : 'TBD'}</TableCell>
                      <TableCell className="text-sm">{a.assessedBy?.name || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => {
                            setSelectedAssessment(a);
                            setOpenReview(true);
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {followups.length > 0 && (
                <DataTablePagination
                  currentPage={followupsPage}
                  totalPages={Math.ceil(followups.length / followupsPageSize)}
                  pageSize={followupsPageSize}
                  totalItems={followups.length}
                  onPageChange={setFollowupsPage}
                  onPageSizeChange={setFollowupsPageSize}
                />
              )}
            </Card>
          </TabsContent>

          {/* ── REVIEWED ── */}
          <TabsContent value="reviewed">
            <Card className="overflow-hidden mt-3 shadow-xl border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Child</TableHead>
                    <TableHead>Findings</TableHead>
                    <TableHead>Nutrition Status</TableHead>
                    <TableHead>Reviewed</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedReviewed.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No reviewed assessments</TableCell></TableRow>
                  ) : (
                    paginatedReviewed.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <Link to="/web/children/$childId" params={{ childId: a.child.id }} className="font-medium text-sm hover:text-primary">{a.child.name}</Link>
                          <div className="text-[11px] text-muted-foreground font-mono">{a.child.code}</div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">MUAC {a.muacCm}cm · {a.weightKg}kg / {a.heightCm}cm</TableCell>
                        <TableCell><span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColor(a.nutritionStatus)}`}>{a.nutritionStatus}</span></TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {a.reviewedAt ? new Date(a.reviewedAt).toLocaleString() : 'N/A'}
                          <div className="text-[10px]">by {a.reviewedBy?.name || 'N/A'}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => {
                              setSelectedAssessment(a);
                              setOpenReview(true);
                            }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {reviewed.length > 0 && (
                <DataTablePagination
                  currentPage={reviewedPage}
                  totalPages={Math.ceil(reviewed.length / reviewedPageSize)}
                  pageSize={reviewedPageSize}
                  totalItems={reviewed.length}
                  onPageChange={setReviewedPage}
                  onPageSizeChange={setReviewedPageSize}
                />
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function KCard({ 
  label, 
  value, 
  icon: Icon, 
  tone, 
  onClick 
}: { 
  label: string; 
  value: string; 
  icon: any; 
  tone: string;
  onClick?: () => void;
}) {
  return (
    <Card 
      className={`p-6 flex items-center gap-4 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 ${tone} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="grid place-items-center h-16 w-16 rounded-xl bg-white/50 backdrop-blur-sm">
        <Icon className="h-8 w-8" />
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider font-semibold opacity-80">{label}</div>
        <div className="text-4xl font-bold mt-1">{value}</div>
      </div>
    </Card>
  );
}
