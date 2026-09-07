import React, { useState } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Beaker, Scan, Stethoscope, FileText, Heart, Calendar,
  User, Building2, AlertTriangle, CheckCircle2,
  TrendingUp, TrendingDown, ExternalLink, Trash2, ChevronDown, ChevronUp
} from "lucide-react";

const typeConfig = {
  "Lab Result":    { icon: Beaker,      bg: "bg-blue-500",   light: "bg-blue-50",   text: "text-blue-700" },
  "Imaging Scan":  { icon: Scan,        bg: "bg-purple-500", light: "bg-purple-50", text: "text-purple-700" },
  "Pathology":     { icon: Stethoscope, bg: "bg-red-500",    light: "bg-red-50",    text: "text-red-700" },
  "Cardiology":    { icon: Heart,       bg: "bg-rose-500",   light: "bg-rose-50",   text: "text-rose-700" },
  "Other":         { icon: FileText,    bg: "bg-gray-500",   light: "bg-gray-50",   text: "text-gray-700" },
};

function ResultRow({ result }) {
  return (
    <div className={`flex items-center justify-between py-3 px-4 rounded-xl border ${result.is_abnormal ? "bg-red-50 border-red-100" : "bg-white border-gray-100"}`}>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${result.is_abnormal ? "text-red-800" : "text-gray-800"}`}>{result.test_name}</p>
        {result.reference_range && <p className="text-xs text-gray-400 mt-0.5">Ref: {result.reference_range} {result.units}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        <span className={`text-base font-bold ${result.is_abnormal ? "text-red-700" : "text-gray-900"}`}>
          {result.value}<span className="text-xs font-normal ml-0.5 text-gray-500">{result.units}</span>
        </span>
        {result.is_abnormal
          ? <span className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center"><TrendingUp className="w-3 h-3 text-red-600" /></span>
          : <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle2 className="w-3 h-3 text-green-600" /></span>
        }
      </div>
    </div>
  );
}

export default function HealthReportDetail({ report, onClose, onDelete }) {
  const [showAll, setShowAll] = useState(false);
  const cfg = typeConfig[report.report_type] || typeConfig["Other"];
  const TypeIcon = cfg.icon;
  const abnormalResults = report.results?.filter(r => r.is_abnormal) || [];
  const normalResults = report.results?.filter(r => !r.is_abnormal) || [];
  const visibleNormal = showAll ? normalResults : normalResults.slice(0, 4);

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          <div className={`${cfg.light} px-5 pt-6 pb-4 flex-shrink-0`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 ${cfg.bg} rounded-2xl flex items-center justify-center shadow-lg`}>
                  <TypeIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">{report.report_name || "Medical Report"}</h2>
                  <span className={`text-xs font-semibold ${cfg.text} uppercase tracking-wide`}>{report.report_type}</span>
                </div>
              </div>
              <button onClick={onClose} className="w-9 h-9 bg-white/70 rounded-full flex items-center justify-center">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {report.report_date && (
                <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-white/70 px-3 py-1.5 rounded-full">
                  <Calendar className="w-3.5 h-3.5" />{format(new Date(report.report_date), "MMM d, yyyy")}
                </div>
              )}
              {report.ordering_physician && (
                <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-white/70 px-3 py-1.5 rounded-full">
                  <User className="w-3.5 h-3.5" />Dr. {report.ordering_physician}
                </div>
              )}
              {report.lab_name && (
                <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-white/70 px-3 py-1.5 rounded-full">
                  <Building2 className="w-3.5 h-3.5" />{report.lab_name}
                </div>
              )}
            </div>
          </div>

          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
            {abnormalResults.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <h3 className="font-bold text-red-800">{abnormalResults.length} Abnormal Result{abnormalResults.length > 1 ? "s" : ""}</h3>
                </div>
                <div className="space-y-2">{abnormalResults.map((r, i) => <ResultRow key={i} result={r} />)}</div>
              </div>
            )}

            {normalResults.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <h3 className="font-semibold text-gray-800">Normal Results ({normalResults.length})</h3>
                </div>
                <div className="space-y-2">{visibleNormal.map((r, i) => <ResultRow key={i} result={r} />)}</div>
                {normalResults.length > 4 && (
                  <button onClick={() => setShowAll(!showAll)} className="mt-3 w-full flex items-center justify-center gap-1 text-sm text-blue-600 font-medium py-2">
                    {showAll ? <><ChevronUp className="w-4 h-4" />Show less</> : <><ChevronDown className="w-4 h-4" />Show {normalResults.length - 4} more</>}
                  </button>
                )}
              </div>
            )}

            {report.summary && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Doctor's Summary</h3>
                <p className="text-sm text-blue-800 leading-relaxed">{report.summary}</p>
              </div>
            )}

            {report.original_file_url && (
              <a href={report.original_file_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-2xl hover:bg-gray-100 transition-colors"
              >
                <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">View Original Report</p>
                  <p className="text-xs text-gray-500">Tap to open file</p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </a>
            )}
          </div>

          <div className="px-5 pb-6 pt-3 flex-shrink-0 border-t border-gray-100">
            <button onClick={onDelete} className="w-full flex items-center justify-center gap-2 py-3 text-red-500 text-sm font-medium rounded-2xl hover:bg-red-50 transition-colors">
              <Trash2 className="w-4 h-4" />Delete Report
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}