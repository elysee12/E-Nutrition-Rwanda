import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export function Kpi({ label, value, delta, icon: Icon, tone }: { label: string; value: string; delta: string; icon: any; tone: string }) {
  return (
    <Card className={`p-6 relative overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 ${tone} hover:scale-105 group`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-xs uppercase tracking-wider font-bold text-slate-600 mb-3">{label}</div>
          <div className="text-4xl font-black tracking-tight text-slate-900 mb-3">{value}</div>
          <div className="text-xs flex items-center gap-2 text-slate-600 font-medium">
            <TrendingUp className="h-4 w-4 text-emerald-600" /> 
            <span>{delta}</span>
          </div>
        </div>
        <div className={`grid place-items-center h-16 w-16 rounded-2xl ${tone} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="h-8 w-8" />
        </div>
      </div>
    </Card>
  );
}
