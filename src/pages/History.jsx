import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Prescription, HealthReport, MedicationLog, User, FamilyMember  } from "@/entities/all";
import { Search, X, Archive, Pill, FlaskConical, Calendar, List, SlidersHorizontal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import PrescriptionCard from "../components/history/PrescriptionCard";
import HealthReportCard from "../components/history/HealthReportCard";
import PrescriptionDetail from "../components/history/PrescriptionDetail";
import HealthReportDetail from "../components/history/HealthReportDetail";
import PrescriptionForm from "../components/upload/PrescriptionForm";
import HistoryCalendarView from "../components/history/HistoryCalendarView";
import PatientSwitcher from "../components/dashboard/PatientSwitcher";

const TABS = [
  { id: "all",          label: "All",          icon: List },
  { id: "prescription", label: "Prescriptions", icon: Pill },
  { id: "report",       label: "Lab Reports",   icon: FlaskConical },
];

function groupByMonth(items) {
  const groups = {};
  items.forEach(item => {
    const key = format(new Date(item.sort_date), "MMMM yyyy");
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  return groups;
}

export default function History() {
  const [historyItems, setHistoryItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [activeFilters, setActiveFilters] = useState({ doctor: null, category: null, date_range: "all", medicine: null });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingPrescription, setEditingPrescription] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());
  const [searchParams] = useSearchParams();

  useEffect(() => { loadInitialData(); }, []);
  useEffect(() => { if (selectedPatient) loadDataForPatient(selectedPatient); }, [selectedPatient]);

  const filterAndSort = useCallback(() => {
    let items = [...historyItems];
    if (activeTab !== "all") items = items.filter(i => i.item_type === activeTab);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i => {
        if (i.item_type === "prescription") {
          return i.doctor_name?.toLowerCase().includes(q) || i.clinic_name?.toLowerCase().includes(q) ||
            i.diagnosis?.toLowerCase().includes(q) || i.medicines?.some(m => m.name?.toLowerCase().includes(q) || m.generic_name?.toLowerCase().includes(q));
        }
        return i.report_name?.toLowerCase().includes(q) || i.summary?.toLowerCase().includes(q) ||
          i.ordering_physician?.toLowerCase().includes(q) || i.lab_name?.toLowerCase().includes(q) ||
          i.results?.some(r => r.test_name?.toLowerCase().includes(q));
      });
    }
    if (activeFilters.doctor) items = items.filter(i => i.doctor_name === activeFilters.doctor || i.ordering_physician === activeFilters.doctor);
    if (activeFilters.category) items = items.filter(i => i.item_type === "prescription" && i.medicines?.some(m => m.category === activeFilters.category));
    if (activeFilters.medicine) {
      const med = activeFilters.medicine.toLowerCase();
      items = items.filter(i => i.item_type === "prescription" && i.medicines?.some(m => m.name?.toLowerCase() === med || m.generic_name?.toLowerCase() === med));
    }
    if (activeFilters.date_range !== "all") {
      const now = new Date();
      let threshold = null;
      if (activeFilters.date_range === "last_30_days") { threshold = new Date(now); threshold.setDate(now.getDate() - 30); }
      if (activeFilters.date_range === "last_6_months") { threshold = new Date(now); threshold.setMonth(now.getMonth() - 6); }
      if (activeFilters.date_range === "this_year") threshold = new Date(now.getFullYear(), 0, 1);
      if (threshold) items = items.filter(i => i.sort_date >= threshold);
    }
    setFilteredItems(items);
  }, [historyItems, searchQuery, activeTab, activeFilters]);

  useEffect(() => { filterAndSort(); }, [filterAndSort]);

  useEffect(() => {
    const id = searchParams.get("prescriptionId");
    if (id && historyItems.length > 0 && !selectedItem) {
      const found = historyItems.find(i => i.id === id && i.item_type === "prescription");
      if (found) setSelectedItem(found);
    }
  }, [searchParams, historyItems]);

  const loadInitialData = async () => {
    try {
      const [me, family] = await Promise.all([User.me(), FamilyMember.list("-created_date")]);
      const myName = me.preferred_name || me.full_name || "Myself";
      const all = [...new Set([myName, ...family.map(f => f.full_name).filter(Boolean)])];
      setPatients(all);
      setSelectedPatient(all[0]);
    } catch {
      setPatients(["Myself"]); setSelectedPatient("Myself"); setLoading(false);
    }
  };

  const loadDataForPatient = async (name) => {
    setLoading(true);
    try {
      const [rxData, rpData, logsData] = await Promise.all([
        Prescription.filter({ patient_name: name }),
        HealthReport.filter({ patient_name: name }),
        MedicationLog.filter({ patient_name: name }, "-created_date"),
      ]);
      const combined = [
        ...rxData.map(p => ({ ...p, item_type: "prescription", sort_date: new Date(p.prescription_date || p.created_date) })),
        ...rpData.map(r => ({ ...r, item_type: "report",        sort_date: new Date(r.report_date || r.created_date) })),
      ].sort((a, b) => b.sort_date - a.sort_date);
      setHistoryItems(combined);
      setLogs(logsData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleUpdateAndClose = async () => {
    if (selectedPatient) await loadDataForPatient(selectedPatient);
    setSelectedItem(null); setEditingPrescription(null);
  };

  const handleDelete = async (item) => {
    if (!window.confirm("Permanently delete this record? This cannot be undone.")) return;
    if (item.item_type === "prescription") await Prescription.delete(item.id);
    if (item.item_type === "report") await HealthReport.delete(item.id);
    await handleUpdateAndClose();
  };

  const clearFilters = () => {
    setSearchQuery(""); setActiveFilters({ doctor: null, category: null, date_range: "all", medicine: null });
  };

  const activeFilterCount = Object.values(activeFilters).filter(v => v && v !== "all").length + (searchQuery ? 1 : 0);

  const uniqueDoctors = [...new Set([
    ...historyItems.filter(i => i.item_type === "prescription").map(i => i.doctor_name),
    ...historyItems.filter(i => i.item_type === "report").map(i => i.ordering_physician),
  ].filter(Boolean))];

  const uniqueCategories = [...new Set(
    historyItems.filter(i => i.item_type === "prescription").flatMap(i => i.medicines?.map(m => m.category) || []).filter(Boolean)
  )];

  const uniqueMedicines = [...new Set(
    historyItems.filter(i => i.item_type === "prescription").flatMap(i => i.medicines?.map(m => m.name) || []).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));

  const monthGroups = groupByMonth(filteredItems);

  if (editingPrescription) {
    return (
      <PrescriptionForm
        initialData={editingPrescription}
        onSave={async (d) => { await Prescription.update(editingPrescription.id, d); await handleUpdateAndClose(); }}
        onCancel={() => setEditingPrescription(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="px-5 pt-5 pb-0 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Medical History</h1>

        <PatientSwitcher
          patients={patients} selectedPatient={selectedPatient}
          onSelectPatient={setSelectedPatient} onAddFamily={() => {}}
        />

        <div className="flex items-center gap-2 mt-3 pb-3">
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${viewMode === "list" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            <List className="w-3.5 h-3.5" /> List
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${viewMode === "calendar" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            <Calendar className="w-3.5 h-3.5" /> Calendar
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all relative ${showFilters || activeFilterCount > 0 ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-200 text-gray-600"}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {viewMode === "list" && (
          <div className="flex border-b border-gray-100 -mx-5 px-5">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                  {historyItems.filter(i => tab.id === "all" || i.item_type === tab.id).length}
                </span>
              </button>
            ))}
          </div>
        )}
        </div>
      </div>

      <div className="px-5 pt-4 pb-24 max-w-5xl mx-auto">
        {viewMode === "calendar" ? (
          <HistoryCalendarView logs={logs} selectedCalendarDate={selectedCalendarDate} onDateSelect={setSelectedCalendarDate} />
        ) : (
          <>
            <div className="relative mb-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search medicines, doctors, diagnosis..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* Tag-based quick filters */}
            {(uniqueDoctors.length > 0 || uniqueMedicines.length > 0) && (
              <div className="mb-3 space-y-2">
                {uniqueDoctors.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1">Doctor</span>
                    {uniqueDoctors.map(d => {
                      const active = activeFilters.doctor === d;
                      return (
                        <button
                          key={d}
                          onClick={() => setActiveFilters(p => ({ ...p, doctor: active ? null : d }))}
                          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${active ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600"}`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                )}
                {uniqueMedicines.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1">Medicine</span>
                    {uniqueMedicines.map(m => {
                      const active = activeFilters.medicine === m;
                      return (
                        <button
                          key={m}
                          onClick={() => setActiveFilters(p => ({ ...p, medicine: active ? null : m }))}
                          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${active ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-600"}`}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-3"
                >
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={activeFilters.doctor || "all"} onValueChange={v => setActiveFilters(p => ({ ...p, doctor: v === "all" ? null : v }))}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All Doctors" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Doctors</SelectItem>
                          {uniqueDoctors.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={activeFilters.date_range || "all"} onValueChange={v => setActiveFilters(p => ({ ...p, date_range: v }))}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Any Time" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any Time</SelectItem>
                          <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                          <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                          <SelectItem value="this_year">This Year</SelectItem>
                        </SelectContent>
                      </Select>
                      {uniqueCategories.length > 0 && (
                        <Select value={activeFilters.category || "all"} onValueChange={v => setActiveFilters(p => ({ ...p, category: v === "all" ? null : v }))}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All Categories" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {uniqueCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    {activeFilterCount > 0 && (
                      <div className="flex justify-end">
                        <button onClick={clearFilters} className="text-xs text-red-500 font-medium flex items-center gap-1">
                          <X className="w-3 h-3" /> Clear all
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse" />)}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 mt-4">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Archive className="w-6 h-6 text-gray-400" />
                </div>
                <p className="font-semibold text-gray-700 mb-1">No records found</p>
                <p className="text-sm text-gray-400">Try adjusting filters or adding new records</p>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="mt-4 text-sm text-blue-600 font-medium">Clear filters</button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(monthGroups).map(([month, items]) => (
                  <div key={month}>
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{month}</h3>
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs text-gray-400">{items.length} record{items.length > 1 ? "s" : ""}</span>
                    </div>
                    <div className="space-y-3">
                      {items.map(item => (
                        item.item_type === "prescription"
                          ? <PrescriptionCard key={item.id} prescription={item} onClick={() => setSelectedItem(item)} />
                          : <HealthReportCard key={item.id} report={item} onClick={() => setSelectedItem(item)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {selectedItem?.item_type === "prescription" && (
        <PrescriptionDetail
          prescription={selectedItem}
          onClose={handleUpdateAndClose}
          onUpdate={handleUpdateAndClose}
          onEdit={() => { setSelectedItem(null); setEditingPrescription(selectedItem); }}
          onDelete={() => handleDelete(selectedItem)}
        />
      )}
      {selectedItem?.item_type === "report" && (
        <HealthReportDetail
          report={selectedItem}
          onClose={handleUpdateAndClose}
          onDelete={() => handleDelete(selectedItem)}
        />
      )}
    </div>
  );
}