import React from "react";
import { format } from "date-fns";
import { Pill, Archive, ChevronRight } from "lucide-react";

const categoryColors = {
  antibiotic:  { bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-400" },
  painkiller:  { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-400" },
  vitamin:     { bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-400" },
  supplement:  { bg: "bg-teal-100",   text: "text-teal-700",   dot: "bg-teal-400" },
  chronic:     { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-400" },
  other:       { bg: "bg-gray-100",   text: "text-gray-600",   dot: "bg-gray-400" },
};

export default function PrescriptionCard({ prescription, onClick }) {
  const topCategories = [...new Set(prescription.medicines?.map(m => m.category).filter(Boolean))].slice(0, 2);
  const dateStr = prescription.prescription_date || prescription.created_date;
  const hasDate = dateStr && !isNaN(new Date(dateStr));

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-gray-100 overflow-hidden active:scale-[0.99] transition-all cursor-pointer shadow-sm hover:shadow-md ${!prescription.is_active ? "opacity-60" : ""}`}
    >
      <div className="h-1 bg-gradient-to-r from-blue-400 to-blue-600" />
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Pill className="w-4 h-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{prescription.doctor_name || "Unknown Doctor"}</p>
              {prescription.clinic_name && <p className="text-xs text-gray-400 truncate">{prescription.clinic_name}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {!prescription.is_active && (
              <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                <Archive className="w-3 h-3" /> Archived
              </span>
            )}
            {hasDate && <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{format(new Date(dateStr), "MMM d, yy")}</span>}
          </div>
        </div>

        {prescription.diagnosis && (
          <div className="mb-3 px-3 py-1.5 bg-blue-50 rounded-xl">
            <p className="text-xs text-blue-700 font-medium truncate"><span className="text-blue-400 mr-1">Dx:</span>{prescription.diagnosis}</p>
          </div>
        )}

        <div className="space-y-1.5 mb-3">
          {prescription.medicines?.slice(0, 3).map((med, i) => {
            const cc = categoryColors[med.category] || categoryColors.other;
            return (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cc.dot}`} />
                <span className="text-sm text-gray-700 font-medium truncate flex-1">{med.name}</span>
                {med.dosage && <span className="text-xs text-gray-400 flex-shrink-0">{med.dosage}</span>}
                {med.category && <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium flex-shrink-0 ${cc.bg} ${cc.text}`}>{med.category}</span>}
              </div>
            );
          })}
          {prescription.medicines?.length > 3 && <p className="text-xs text-gray-400 pl-3.5">+{prescription.medicines.length - 3} more medicines</p>}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <div className="flex gap-1">
            {topCategories.map(cat => {
              const cc = categoryColors[cat] || categoryColors.other;
              return <span key={cat} className={`text-xs px-2 py-0.5 rounded-full font-medium ${cc.bg} ${cc.text}`}>{cat}</span>;
            })}
          </div>
          <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
            View details <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}