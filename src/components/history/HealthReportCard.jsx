import React from "react";
import { format } from "date-fns";
import { FileText, Beaker, Scan, Stethoscope, Heart, ChevronRight, AlertTriangle, CheckCircle2 } from "lucide-react";

const typeConfig = {
  "Lab Result":   { icon: Beaker,      gradient: "from-blue-400 to-blue-600",     light: "bg-blue-50",   text: "text-blue-700",   iconBg: "bg-blue-100",   iconColor: "text-blue-600" },
  "Imaging Scan": { icon: Scan,        gradient: "from-purple-400 to-purple-600", light: "bg-purple-50", text: "text-purple-700", iconBg: "bg-purple-100", iconColor: "text-purple-600" },
  "Pathology":    { icon: Stethoscope, gradient: "from-red-400 to-red-600",       light: "bg-red-50",    text: "text-red-700",    iconBg: "bg-red-100",    iconColor: "text-red-600" },
  "Cardiology":   { icon: Heart,       gradient: "from-rose-400 to-rose-600",     light: "bg-rose-50",   text: "text-rose-700",   iconBg: "bg-rose-100",   iconColor: "text-rose-600" },
  "Other":        { icon: FileText,    gradient: "from-gray-400 to-gray-600",     light: "bg-gray-50",   text: "text-gray-600",   iconBg: "bg-gray-100",   iconColor: "text-gray-600" },
};

export default function HealthReportCard({ report, onClick }) {
  const cfg = typeConfig[report.report_type] || typeConfig["Other"];
  const TypeIcon = cfg.icon;
  const abnormalCount = report.results?.filter(r => r.is_abnormal).length || 0;
  const totalCount = report.results?.length || 0;
  const dateStr = report.report_date || report.created_date;
  const hasDate = dateStr && !isNaN(new Date(dateStr));

  return (
    <div onClick={onClick} className="bg-white rounded-2xl border border-gray-100 overflow-hidden active:scale-[0.99] transition-all cursor-pointer shadow-sm hover:shadow-md">
      <div className={`h-1 bg-gradient-to-r ${cfg.gradient}`} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className={`w-9 h-9 ${cfg.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <TypeIcon className={`w-4 h-4 ${cfg.iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{report.report_name || "Medical Report"}</p>
              <span className={`text-xs font-medium ${cfg.text}`}>{report.report_type}</span>
            </div>
          </div>
          {hasDate && <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full flex-shrink-0 ml-2">{format(new Date(dateStr), "MMM d, yy")}</span>}
        </div>

        {abnormalCount > 0 && (
          <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-red-50 rounded-xl border border-red-100">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            <p className="text-xs font-semibold text-red-700">{abnormalCount} of {totalCount} results abnormal — review needed</p>
          </div>
        )}

        {report.results?.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {report.results.slice(0, 3).map((r, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className={`text-xs truncate flex-1 ${r.is_abnormal ? "text-red-700 font-semibold" : "text-gray-600"}`}>{r.test_name}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                  <span className={`text-xs font-bold ${r.is_abnormal ? "text-red-700" : "text-gray-800"}`}>{r.value} {r.units}</span>
                  {r.is_abnormal ? <AlertTriangle className="w-3 h-3 text-red-500" /> : <CheckCircle2 className="w-3 h-3 text-green-500" />}
                </div>
              </div>
            ))}
            {report.results.length > 3 && <p className="text-xs text-gray-400">+{report.results.length - 3} more tests</p>}
          </div>
        )}

        {report.summary && (
          <div className={`mb-3 px-3 py-1.5 ${cfg.light} rounded-xl`}>
            <p className={`text-xs ${cfg.text} line-clamp-2`}>{report.summary}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <span className="text-xs text-gray-500 truncate max-w-[140px]">{report.lab_name || ""}</span>
          <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">View report <ChevronRight className="w-3.5 h-3.5" /></div>
        </div>
      </div>
    </div>
  );
}