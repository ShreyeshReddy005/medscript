import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { X, Pill, BrainCircuit as Brain, ChevronRight, Stethoscope, Calendar, Activity, Archive, Search } from "lucide-react";
import MedicineInsightViewer from "../medicines/MedicineInsightViewer";
import PrescriptionDetail from "../history/PrescriptionDetail";

const CATEGORY_COLORS = {
  antibiotic: { bg: "bg-red-50", text: "text-red-600", badge: "bg-red-100 text-red-700" },
  painkiller: { bg: "bg-orange-50", text: "text-orange-600", badge: "bg-orange-100 text-orange-700" },
  vitamin: { bg: "bg-green-50", text: "text-green-600", badge: "bg-green-100 text-green-700" },
  supplement: { bg: "bg-blue-50", text: "text-blue-600", badge: "bg-blue-100 text-blue-700" },
  chronic: { bg: "bg-purple-50", text: "text-purple-600", badge: "bg-purple-100 text-purple-700" },
  other: { bg: "bg-gray-50", text: "text-gray-500", badge: "bg-gray-100 text-gray-600" },
};

export default function MedicationsView({ prescriptions, onClose, onUpdate }) {
  const [filter, setFilter] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [insightFor, setInsightFor] = useState(null);
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  const allMedicines = useMemo(() => {
    const items = [];
    prescriptions.forEach(p => {
      (p.medicines || []).forEach((m, mi) => {
        items.push({
          key: `${p.id}-${mi}`,
          medicine: m,
          prescription: p,
          isActive: p.is_active !== false,
        });
      });
    });
    return items;
  }, [prescriptions]);

  const filtered = useMemo(() => {
    let result = allMedicines;
    if (filter === "active") result = result.filter(m => m.isActive);
    else if (filter === "past") result = result.filter(m => !m.isActive);
    if (categoryFilter !== "all") result = result.filter(m => (m.medicine.category || "other") === categoryFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m =>
        m.medicine.name?.toLowerCase().includes(q) ||
        m.prescription.doctor_name?.toLowerCase().includes(q) ||
        m.prescription.diagnosis?.toLowerCase().includes(q) ||
        m.medicine.generic_name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allMedicines, filter, categoryFilter, searchQuery]);

  const categories = useMemo(() => {
    const set = new Set();
    allMedicines.forEach(m => set.add(m.medicine.category || "other"));
    return Array.from(set);
  }, [allMedicines]);

  const activeCount = allMedicines.filter(m => m.isActive).length;
  const pastCount = allMedicines.filter(m => !m.isActive).length;

  const tabs = [
    { key: "active", label: "Active", count: activeCount },
    { key: "past", label: "Past", count: pastCount },
    { key: "all", label: "All", count: allMedicines.length },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-gray-100 z-10">
          <div className="max-w-5xl mx-auto px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                  <Pill className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 leading-none">My Medications</h2>
                  <p className="text-sm text-gray-400 mt-1">{activeCount} active · {pastCount} past</p>
                </div>
              </div>
              <button onClick={onClose} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Segmented control */}
            <div className="flex gap-1.5 mt-4 bg-gray-100 p-1 rounded-2xl">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setFilter(t.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    filter === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${filter === t.key ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-500"}`}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto px-5 py-5 pb-24">
          {/* Search & Category Filter */}
          <div className="mb-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search medicines, doctors, conditions..."
                className="w-full bg-white border border-gray-100 rounded-2xl pl-10 pr-10 py-3 text-sm font-medium text-gray-800 placeholder-gray-400 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <X className="w-3.5 h-3.5 text-gray-500" />
                </button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 px-1 scrollbar-hide">
              <CategoryChip label="all" active={categoryFilter === "all"} onClick={() => setCategoryFilter("all")} />
              {categories.map(cat => (
                <CategoryChip key={cat} label={cat} active={categoryFilter === cat} onClick={() => setCategoryFilter(cat)} />
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <Pill className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">
                {searchQuery || categoryFilter !== "all"
                  ? "No medications match your filters."
                  : filter === "past" ? "No past medications yet." : filter === "active" ? "No active medications." : "No medications found."}
              </p>
              {(searchQuery || categoryFilter !== "all") && (
                <button onClick={() => { setSearchQuery(""); setCategoryFilter("all"); }} className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((item, i) => (
                  <MedicineCard
                    key={item.key}
                    item={item}
                    index={i}
                    onAI={() => setInsightFor(item.medicine)}
                    onOpenPrescription={() => setSelectedPrescription(item.prescription)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {insightFor && (
        <MedicineInsightViewer medicine={insightFor} onClose={() => setInsightFor(null)} />
      )}
      {selectedPrescription && (
        <PrescriptionDetail
          prescription={selectedPrescription}
          onClose={() => setSelectedPrescription(null)}
          onUpdate={async () => { setSelectedPrescription(null); if (onUpdate) await onUpdate(); }}
          onEdit={() => {}}
          onDelete={async () => { setSelectedPrescription(null); if (onUpdate) await onUpdate(); }}
        />
      )}
    </>
  );
}

function MedicineCard({ item, index, onAI, onOpenPrescription }) {
  const { medicine, prescription, isActive } = item;
  const c = CATEGORY_COLORS[medicine.category] || CATEGORY_COLORS.other;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-gray-200 transition-all"
    >
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 ${c.bg} rounded-2xl flex items-center justify-center flex-shrink-0`}>
          <Pill className={`w-5 h-5 ${c.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 text-sm truncate">{medicine.name}</h3>
              {medicine.strength && <p className="text-xs text-gray-400">{medicine.strength}</p>}
            </div>
            <button
              onClick={onAI}
              className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors flex-shrink-0"
              title="AI Insights"
            >
              <Brain className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${c.badge}`}>
              {medicine.category || "other"}
            </span>
            {!isActive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                <Archive className="w-3 h-3" /> Past
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Use / indication */}
      {prescription.diagnosis && (
        <div className="mt-3 flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-2">
          <Activity className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-600 leading-relaxed">
            <span className="font-semibold text-gray-700">Prescribed for: </span>
            {prescription.diagnosis}
          </p>
        </div>
      )}

      {/* Dosage summary */}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
        {medicine.dosage && <span className="font-medium text-gray-700">{medicine.dosage}</span>}
        {medicine.frequency && <span>· <span className="font-medium text-gray-700">{medicine.frequency}</span></span>}
        {medicine.timing && <span>· <span className="font-medium text-gray-700">{medicine.timing}</span></span>}
      </div>

      {/* Source prescription link */}
      <button
        onClick={onOpenPrescription}
        className="mt-3 w-full flex items-center gap-2.5 pt-3 border-t border-gray-50 group"
      >
        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
          <Stethoscope className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-semibold text-gray-700 truncate group-hover:text-blue-700 transition-colors">
            {prescription.doctor_name || "Unknown doctor"}
          </p>
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(new Date(prescription.prescription_date || prescription.created_date), "MMM d, yyyy")}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
      </button>
    </motion.div>
  );
}

const CATEGORY_CHIP_COLORS = {
  antibiotic: "bg-red-100 text-red-700",
  painkiller: "bg-orange-100 text-orange-700",
  vitamin: "bg-green-100 text-green-700",
  supplement: "bg-blue-100 text-blue-700",
  chronic: "bg-purple-100 text-purple-700",
  other: "bg-gray-100 text-gray-600",
};

function CategoryChip({ label, active, onClick }) {
  const activeColor = label === "all" ? "bg-gray-900 text-white" : (CATEGORY_CHIP_COLORS[label] || "bg-gray-900 text-white");
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-all ${
        active ? activeColor + " shadow-sm" : "bg-white text-gray-500 border border-gray-100 hover:border-gray-200"
      }`}
    >
      {label}
    </button>
  );
}