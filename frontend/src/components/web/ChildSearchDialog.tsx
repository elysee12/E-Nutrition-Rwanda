import { useState, useEffect, useRef } from "react";
import { Search, Loader2, AlertCircle, Calendar, User, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { api, type Child, type Assessment } from "@/lib/api";
import { statusColor } from "@/lib/utils";

interface ChildSearchDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ChildSearchDialog({ open, onOpenChange }: ChildSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [childAssessments, setChildAssessments] = useState<Assessment[]>([]);
  
  const [searching, setSearching] = useState(false);
  const [loadingAssessments, setLoadingAssessments] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      try {
        setSearching(true);
        const results = await api.searchChildrenByName(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error("Search failed:", error);
        toast.error("Failed to search children");
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
  }, [searchQuery]);

  const handleSelectChild = async (child: Child) => {
    try {
      setSelectedChild(child);
      setLoadingAssessments(true);
      const assessments = await api.getChildAssessments(child.id);
      setChildAssessments(assessments);
    } catch (error) {
      console.error("Failed to load assessments:", error);
      toast.error("Failed to load child assessments");
    } finally {
      setLoadingAssessments(false);
    }
  };

  const handleClose = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedChild(null);
    setChildAssessments([]);
    onOpenChange(false);
  };

  // If a child is selected, show assessment history
  if (selectedChild) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <DialogTitle>Assessment History - {selectedChild.name}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  ID: <span className="font-mono">{selectedChild.code}</span>
                  {selectedChild.applicationNumber && (
                    <> • App #: <span className="font-mono">{selectedChild.applicationNumber}</span></>
                  )}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedChild(null)}>
                Back to Search
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Child Info Card */}
            <Card className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedChild.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sex</p>
                  <p className="font-medium">{selectedChild.sex === "M" ? "Male" : "Female"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Age (Months)</p>
                  <p className="font-medium">{selectedChild.ageMonths}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Current Status</p>
                  <Badge className={statusColor(selectedChild.currentStatus)}>
                    {selectedChild.currentStatus}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Assessment History */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Assessment History
                <Badge variant="secondary">{childAssessments.length}</Badge>
              </h3>

              {loadingAssessments ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading assessments...</span>
                </div>
              ) : childAssessments.length === 0 ? (
                <Card className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-muted-foreground">No assessments found for this child</p>
                </Card>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Assessment Date</TableHead>
                        <TableHead>Weight (kg)</TableHead>
                        <TableHead>Height (cm)</TableHead>
                        <TableHead>MUAC (cm)</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Classification</TableHead>
                        <TableHead>Assessed By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {childAssessments.map((assessment) => (
                        <TableRow key={assessment.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {new Date(assessment.assessmentDate).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </div>
                          </TableCell>
                          <TableCell>{assessment.weightKg}</TableCell>
                          <TableCell>{assessment.heightCm}</TableCell>
                          <TableCell>{assessment.muacCm}</TableCell>
                          <TableCell>
                            <Badge variant={assessment.status === "Pending" ? "outline" : "default"}>
                              {assessment.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColor(assessment.nutritionStatus)}>
                              {assessment.nutritionStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {assessment.assessedBy?.name || "Unknown"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Search results view
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Search Child by Name or ID</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Enter child's name, ID, or application number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
            {searching && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Search Results */}
          <div className="space-y-2">
            {searchResults.length === 0 && searchQuery.trim() && !searching ? (
              <Card className="p-6 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-muted-foreground">No children found matching "{searchQuery}"</p>
              </Card>
            ) : searchResults.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {searchResults.map((child) => (
                  <Button
                    key={child.id}
                    variant="outline"
                    className="w-full h-auto justify-start p-3 text-left"
                    onClick={() => handleSelectChild(child)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex-1">
                          <p className="font-medium">{child.name}</p>
                          <p className="text-xs text-muted-foreground">
                            ID: {child.code}
                            {child.applicationNumber && ` • App #: ${child.applicationNumber}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-muted-foreground">{child.ageMonths}mo</span>
                          <Badge className={statusColor(child.currentStatus)}>
                            {child.currentStatus}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            ) : !searchQuery.trim() && !searching ? (
              <Card className="p-8 text-center">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-muted-foreground">Enter a child's name, ID, or application number to search</p>
              </Card>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
