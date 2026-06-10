import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Send, FileText, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";
import { TopBar } from "@/components/web/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/web/report-to-manager")({
  head: () => ({ meta: [{ title: "Report to Data Manager — E-Nutrition Rwanda" }] }),
  component: ReportToManager,
});

type Report = {
  id: string;
  title: string;
  type: string;
  date: string;
  status: "Submitted" | "Under Review" | "Approved" | "Needs Revision";
};

const previousReports: Report[] = [
  { id: "RPT-2024-05-001", title: "Monthly Nutrition Assessment Summary", type: "Monthly Report", date: "2026-05-28", status: "Approved" },
  { id: "RPT-2024-05-002", title: "SAM Cases Follow-up Report", type: "Clinical Report", date: "2026-05-25", status: "Under Review" },
  { id: "RPT-2024-04-001", title: "April Screening Activities", type: "Monthly Report", date: "2026-04-30", status: "Approved" },
  { id: "RPT-2024-04-002", title: "Referral Outcomes Analysis", type: "Clinical Report", date: "2026-04-22", status: "Approved" },
];

function ReportToManager() {
  const [reportType, setReportType] = useState("");
  const [title, setTitle] = useState("");
  const [period, setPeriod] = useState("");
  const [summary, setSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportType || !title || !period || !summary) {
      toast.error("Please complete all required fields");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      toast.success("Report submitted successfully to Data Manager");
      setReportType("");
      setTitle("");
      setPeriod("");
      setSummary("");
      setSubmitting(false);
    }, 1000);
  };

  return (
    <>
      <TopBar 
        title="Report to Data Manager" 
        subtitle="Submit clinical reports, monthly summaries, and activity updates to your facility's Data Manager"
      />
      <div className="p-6 space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="grid place-items-center h-10 w-10 rounded-lg bg-gradient-to-br from-[#16a34a]/15 to-[#059669]/10 text-[#16a34a]">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Submit New Report</h3>
                <p className="text-xs text-muted-foreground">Create and send a report to your Data Manager</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="reportType" className="text-xs text-muted-foreground">Report Type *</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger id="reportType">
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly Report</SelectItem>
                      <SelectItem value="clinical">Clinical Report</SelectItem>
                      <SelectItem value="screening">Screening Activity</SelectItem>
                      <SelectItem value="referral">Referral Summary</SelectItem>
                      <SelectItem value="incident">Incident Report</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="period" className="text-xs text-muted-foreground">Reporting Period *</Label>
                  <Input 
                    id="period" 
                    type="month" 
                    value={period} 
                    onChange={(e) => setPeriod(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs text-muted-foreground">Report Title *</Label>
                <Input 
                  id="title" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., May 2026 Nutrition Assessment Summary"
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="summary" className="text-xs text-muted-foreground">Report Summary *</Label>
                <Textarea 
                  id="summary" 
                  value={summary} 
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Provide a detailed summary of your report including key findings, statistics, challenges, and recommendations..."
                  rows={8}
                  className="resize-none"
                />
                <p className="text-[11px] text-muted-foreground">{summary.length} / 2000 characters</p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button 
                  type="submit" 
                  className="gap-2 bg-gradient-to-r from-[#16a34a] to-[#059669] hover:from-[#15803d] hover:to-[#047857] shadow-md"
                  disabled={submitting}
                >
                  <Send className="h-4 w-4" />
                  {submitting ? "Submitting..." : "Submit Report"}
                </Button>
                <Button type="button" variant="outline" onClick={() => {
                  setReportType("");
                  setTitle("");
                  setPeriod("");
                  setSummary("");
                }}>
                  Clear Form
                </Button>
              </div>
            </form>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-sm mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <StatItem 
                icon={FileText} 
                label="Reports this month" 
                value="3" 
                color="text-[#16a34a]"
              />
              <StatItem 
                icon={CheckCircle2} 
                label="Approved reports" 
                value="12" 
                color="text-[#16a34a]"
              />
              <StatItem 
                icon={AlertCircle} 
                label="Under review" 
                value="1" 
                color="text-[#f59e0b]"
              />
              <StatItem 
                icon={Calendar} 
                label="Next due date" 
                value="Jun 5" 
                color="text-muted-foreground"
              />
            </div>

            <div className="mt-6 p-3 rounded-lg bg-gradient-to-br from-[#16a34a]/10 to-[#059669]/5 border border-[#16a34a]/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-[#16a34a] mt-0.5" />
                <div className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Reminder:</strong> Monthly reports are due by the 5th of each month. Include all screening activities, referrals, and follow-ups.
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <div className="p-5 border-b border-border">
            <h3 className="font-semibold text-sm">Previous Reports</h3>
            <p className="text-xs text-muted-foreground mt-1">Your submission history and status</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-32">Report ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-40">Type</TableHead>
                <TableHead className="w-28">Date</TableHead>
                <TableHead className="w-36">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previousReports.map((report) => (
                <TableRow key={report.id} className="cursor-pointer hover:bg-muted/30">
                  <TableCell className="font-mono text-xs text-muted-foreground">{report.id}</TableCell>
                  <TableCell className="font-medium">{report.title}</TableCell>
                  <TableCell className="text-sm">{report.type}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{report.date}</TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`text-[10px] ${
                        report.status === "Approved" 
                          ? "bg-[#16a34a]/15 text-[#16a34a] border-[#16a34a]/30" 
                          : report.status === "Under Review"
                          ? "bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30"
                          : report.status === "Needs Revision"
                          ? "bg-destructive/15 text-destructive border-destructive/30"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {report.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </>
  );
}

function StatItem({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`grid place-items-center h-8 w-8 rounded-lg bg-muted ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold">{value}</div>
      </div>
    </div>
  );
}
