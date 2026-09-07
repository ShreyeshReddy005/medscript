import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Prescription, HealthReport, User, FamilyMember } from "@/entities/all";
import PatientSwitcher from "../components/dashboard/PatientSwitcher";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  FileHeart, Pill, FlaskConical, ChevronRight, CheckCheck,
  AlertTriangle, Stethoscope, Info, ArrowRight, Sparkles, Building2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const categoryColors = { antibiotic: "bg-red-100 text-red-700", painkiller: "bg-orange-100 text-orange-700", vitamin: "bg-green-100 text-green-700", supplement: "bg-teal-100 text-teal-700", chronic: "bg-purple-100 text-purple-700", other: "bg-gray-100 text-gray-600" };
const typeColors = { "Lab Result": "bg-blue-50 text-blue-700", "Imaging Scan": "bg-purple-50 text-purple-700", "Pathology": "bg-red-50 text-red-700", "Cardiology": "bg-rose-50 text-rose-700", "Other": "bg-gray-50 text-gray-600" };

function PrescriptionSelectCard({ item, selected, onToggle }) {
  return (
    <motion.div whileTap={{ scale: 0.98 }} onClick={onToggle}
      className={`bg-white rounded-2xl border-2 overflow-hidden cursor-pointer transition-all ${selected ? "border-blue-500 shadow-md shadow-blue-100" : "border-gray-100 shadow-sm"}`}
    >
      <div className={`h-1 ${selected ? "bg-blue-500" : "bg-gray-200"}`} />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center transition-all ${selected ? "bg-blue-500" : "border-2 border-gray-300"}`}>
            {selected && <CheckCheck className="w-3.5 h-3.5 text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Pill className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Prescription</span>
              </div>
              <span className="text-xs text-gray-400">{format(new Date(item.prescription_date || item.created_date), "MMM d, yyyy")}</span>
            </div>
            <p className="font-semibold text-gray-900 text-sm mb-0.5">{item.doctor_name || "Unknown Doctor"}</p>
            {item.clinic_name && <p className="text-xs text-gray-500 mb-2">{item.clinic_name}</p>}
            {item.diagnosis && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-lg mb-2">
                <Stethoscope className="w-3 h-3 text-blue-500 flex-shrink-0" />
                <p className="text-xs text-blue-700 truncate">{item.diagnosis}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              {item.medicines?.slice(0, 4).map((m, i) => (
                <span key={i} className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${categoryColors[m.category] || categoryColors.other}`}>{m.name}</span>
              ))}
              {item.medicines?.length > 4 && <span className="text-xs text-gray-400">+{item.medicines.length - 4} more</span>}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ReportSelectCard({ item, selected, onToggle }) {
  const abnormal = item.results?.filter(r => r.is_abnormal).length || 0;
  return (
    <motion.div whileTap={{ scale: 0.98 }} onClick={onToggle}
      className={`bg-white rounded-2xl border-2 overflow-hidden cursor-pointer transition-all ${selected ? "border-green-500 shadow-md shadow-green-100" : "border-gray-100 shadow-sm"}`}
    >
      <div className={`h-1 ${selected ? "bg-green-500" : "bg-gray-200"}`} />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center transition-all ${selected ? "bg-green-500" : "border-2 border-gray-300"}`}>
            {selected && <CheckCheck className="w-3.5 h-3.5 text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-green-50 rounded-lg flex items-center justify-center">
                  <FlaskConical className="w-3.5 h-3.5 text-green-600" />
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${typeColors[item.report_type] || typeColors["Other"]}`}>{item.report_type}</span>
              </div>
              <span className="text-xs text-gray-400">{format(new Date(item.report_date || item.created_date), "MMM d, yyyy")}</span>
            </div>
            <p className="font-semibold text-gray-900 text-sm mb-0.5">{item.report_name || "Medical Report"}</p>
            {item.lab_name && <p className="text-xs text-gray-500 mb-2">{item.lab_name}</p>}
            {abnormal > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 rounded-lg">
                <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-700 font-medium">{abnormal} abnormal result{abnormal > 1 ? "s" : ""}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function DoctorsReport() {
  const [historyItems, setHistoryItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState({});
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const navigate = useNavigate();

  useEffect(() => { loadInitialData(); }, []);
  useEffect(() => { if (selectedPatient) loadDataForPatient(selectedPatient); }, [selectedPatient]);

  const loadInitialData = async () => {
    try {
      const [me, family] = await Promise.all([User.me(), FamilyMember.list("-created_date")]);
      const myName = me.preferred_name || me.full_name || "Myself";
      const all = [...new Set([myName, ...family.map(f => f.full_name).filter(Boolean)])];
      setPatients(all); setSelectedPatient(all[0]);
    } catch { setPatients(["Myself"]); setSelectedPatient("Myself"); setLoading(false); }
  };

  const loadDataForPatient = async (name) => {
    setLoading(true); setSelectedItems({});
    try {
      const [rx, rp] = await Promise.all([Prescription.filter({ patient_name: name }), HealthReport.filter({ patient_name: name })]);
      const combined = [
        ...rx.map(p => ({ ...p, item_type: "prescription", _date: new Date(p.prescription_date || p.created_date) })),
        ...rp.map(r => ({ ...r, item_type: "report", _date: new Date(r.report_date || r.created_date) })),
      ].sort((a, b) => b._date - a._date);
      setHistoryItems(combined);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const toggle = (id) => setSelectedItems(prev => ({ ...prev, [id]: !prev[id] }));
  const filteredItems = filterType === "all" ? historyItems : historyItems.filter(i => i.item_type === filterType);
  const allSelected = filteredItems.length > 0 && filteredItems.every(i => selectedItems[i.id]);
  const selectAll = () => setSelectedItems(prev => ({ ...prev, ...filteredItems.reduce((a, i) => ({ ...a, [i.id]: true }), {}) }));
  const deselectAll = () => setSelectedItems({});
  const selectedCount = Object.values(selectedItems).filter(Boolean).length;
  const selectedPreview = historyItems.filter(i => selectedItems[i.id]);

  const handleGenerate = () => {
    const ids = Object.keys(selectedItems).filter(id => selectedItems[id]);
    navigate(createPageUrl(`ReportViewer?ids=${ids.join(",")}`));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="px-5 pt-5 pb-4 max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Doctor's Report</h1>
          <p className="text-sm text-gray-400 mt-0.5">Build a shareable health summary</p>

          <div className="mt-3">
            <PatientSwitcher patients={patients} selectedPatient={selectedPatient} onSelectPatient={(p) => { setSelectedPatient(p); }} />
          </div>

          {historyItems.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              {["all", "prescription", "report"].map(t => (
                <button key={t} onClick={() => setFilterType(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${filterType === t ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
                >
                  {t === "all" ? "All" : t === "prescription" ? "Prescriptions" : "Lab Reports"}
                  <span className={`ml-1 ${filterType === t ? "text-blue-200" : "text-gray-400"}`}>
                    ({historyItems.filter(i => t === "all" || i.item_type === t).length})
                  </span>
                </button>
              ))}
              <div className="flex-1" />
              <button onClick={allSelected ? deselectAll : selectAll} className="text-xs text-blue-600 font-semibold">
                {allSelected ? "Deselect all" : "Select all"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 pt-4 pb-36 max-w-5xl mx-auto">
        {loading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse" />)}</div>
        ) : historyItems.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileHeart className="w-8 h-8 text-gray-400" />
            </div>
            <p className="font-semibold text-gray-700 mb-1">No records for {selectedPatient}</p>
            <p className="text-sm text-gray-400">Upload a prescription or report first</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-2xl p-3">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700 leading-relaxed">
                <strong>Select the records</strong> you want included. The generated report is designed to be shared with your doctor or specialist.
              </p>
            </div>
            {filteredItems.map(item => (
              item.item_type === "prescription"
                ? <PrescriptionSelectCard key={item.id} item={item} selected={!!selectedItems[item.id]} onToggle={() => toggle(item.id)} />
                : <ReportSelectCard key={item.id} item={item} selected={!!selectedItems[item.id]} onToggle={() => toggle(item.id)} />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-16 left-0 right-0 px-4 pb-2 z-40"
          >
            <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-4">
              <div className="flex items-center gap-2 mb-3 overflow-x-auto">
                {selectedPreview.slice(0, 4).map(item => (
                  <div key={item.id} className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${item.item_type === "prescription" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                    {item.item_type === "prescription" ? item.doctor_name || "Rx" : item.report_name || "Report"}
                  </div>
                ))}
                {selectedCount > 4 && <span className="text-xs text-gray-400 flex-shrink-0">+{selectedCount - 4} more</span>}
              </div>
              <Button onClick={handleGenerate} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl py-5 text-base font-bold shadow-lg">
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Report · {selectedCount} item{selectedCount > 1 ? "s" : ""}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}