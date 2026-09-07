import React, { useState, useEffect } from "react";
import { User as UserEntity, FamilyMember } from "@/entities/all";
import { User, Calendar, Pill, Edit3, X, Phone, MapPin, Building2, CheckCircle2, Stethoscope, Clock, Info, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const CATEGORY_CONFIG = {
  antibiotic: { label: "Antibiotic", bg: "bg-red-100", text: "text-red-700", dot: "bg-red-400" },
  painkiller: { label: "Painkiller", bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-400" },
  vitamin:    { label: "Vitamin",    bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-400" },
  supplement: { label: "Supplement", bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-400" },
  chronic:    { label: "Chronic",    bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-400" },
  other:      { label: "Other",      bg: "bg-gray-100",   text: "text-gray-600",   dot: "bg-gray-400" },
};

function MedicineCard({ medicine, index }) {
  const [expanded, setExpanded] = useState(index === 0);
  const cat = CATEGORY_CONFIG[medicine.category] || CATEGORY_CONFIG.other;

  const details = [
    { label: "Dosage",    value: medicine.dosage },
    { label: "Frequency", value: medicine.frequency },
    { label: "Timing",    value: medicine.timing },
    { label: "Duration",  value: medicine.duration },
    { label: "Strength",  value: medicine.strength },
  ].filter(d => d.value);

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden mb-3 shadow-sm">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${cat.bg}`}>
            <Pill className={`w-4 h-4 ${cat.text}`} />
          </div>
          <div>
            <h4 className="font-bold text-gray-900">{medicine.name}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-500">{medicine.frequency}</span>
            </div>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </div>
      
      {expanded && (
        <div className="px-4 pb-4 pt-1 bg-gray-50 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-y-3 mt-3">
            {details.map((d, i) => (
              <div key={i}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{d.label}</p>
                <p className="text-sm text-gray-900 font-medium">{d.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PrescriptionPreview({ prescriptionData, onEdit, onCancel, onSave, saving }) {
  const medicines = prescriptionData?.medicines || [];

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Review Prescription</h2>
          <p className="text-sm text-gray-500 mt-1">Please verify the extracted details</p>
        </div>
        <Button variant="outline" size="sm" onClick={onEdit} className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50">
          <Edit3 className="w-4 h-4" />
          Edit
        </Button>
      </div>

      <div className="bg-white rounded-2xl p-5 mb-6 border border-gray-100 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-50 pb-3 flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-blue-500" />
          General Details
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-gray-400">Doctor</Label>
            <p className="font-semibold text-gray-900">{prescriptionData?.doctor_name || "Unknown"}</p>
          </div>
          <div>
            <Label className="text-xs text-gray-400">Date</Label>
            <p className="font-semibold text-gray-900">{prescriptionData?.prescription_date || "Unknown"}</p>
          </div>
          <div>
            <Label className="text-xs text-gray-400">Clinic/Hospital</Label>
            <p className="font-semibold text-gray-900">{prescriptionData?.clinic_name || prescriptionData?.hospital_name || "Unknown"}</p>
          </div>
          <div>
            <Label className="text-xs text-gray-400">Diagnosis</Label>
            <p className="font-semibold text-gray-900">{prescriptionData?.diagnosis || "None specified"}</p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 px-1">
          <Pill className="w-5 h-5 text-blue-500" />
          Medicines ({medicines.length})
        </h3>
        
        {medicines.length > 0 ? (
          medicines.map((med, i) => <MedicineCard key={i} medicine={med} index={i} />)
        ) : (
          <div className="p-6 text-center bg-gray-50 rounded-xl border border-gray-100 text-gray-500">
            No medicines found on this prescription.
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] z-10 flex justify-center">
        <div className="w-full max-w-2xl flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1 py-6 rounded-xl border-gray-200">
            Discard
          </Button>
          <Button onClick={() => onSave(prescriptionData)} disabled={saving} className="flex-1 py-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-200">
            {saving ? "Saving..." : "Confirm & Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}