import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ChevronRight, Stethoscope, Plus, CheckCircle } from "lucide-react";
import { Prescription } from "@/entities/Prescription";
import PrescriptionDetail from "../history/PrescriptionDetail";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const CATEGORY_COLORS = {
  antibiotic: "bg-red-50 text-red-600",
  painkiller: "bg-orange-50 text-orange-600",
  vitamin: "bg-green-50 text-green-600",
  supplement: "bg-blue-50 text-blue-600",
  chronic: "bg-purple-50 text-purple-600",
  other: "bg-gray-50 text-gray-500",
};

export default function RecentPrescriptions({ prescriptions, onUpdate }) {
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  const handleUpdateAndClose = async () => {
    setSelectedPrescription(null);
    if (onUpdate) await onUpdate();
  };

  const handleMarkAsCompleted = async (prescription, e) => {
    e.stopPropagation();
    if (window.confirm("Mark this prescription as completed?")) {
      try {
        await Prescription.update(prescription.id, { is_active: false });
        await onUpdate();
      } catch (error) {
        console.error("Error updating prescription:", error);
      }
    }
  };

  return (
    <>
      <div className="px-5 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-gray-900">Recent Prescriptions</h3>
          {prescriptions.length > 0 && (
            <Link to={createPageUrl("History")} className="text-sm font-semibold text-blue-500">
              View All
            </Link>
          )}
        </div>

        {prescriptions.length === 0 ? (
          <Link
            to={createPageUrl("Upload")}
            className="flex items-center gap-4 bg-white rounded-2xl border border-dashed border-gray-200 p-4 hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
          >
            <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
              <Plus className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-700 group-hover:text-blue-700 transition-colors">
                Add your first prescription
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Scan or upload to start tracking</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 ml-auto transition-colors" />
          </Link>
        ) : (
          <div className="space-y-2.5">
            <AnimatePresence>
              {prescriptions.slice(0, 3).map((prescription, index) => (
                <motion.div
                  key={prescription.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.07 }}
                  className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-gray-200 hover:shadow-md transition-all"
                >
                  <button
                    onClick={() => setSelectedPrescription(prescription)}
                    className="w-full text-left p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Stethoscope className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="font-semibold text-gray-900 text-sm truncate">
                            {prescription.doctor_name || "Doctor"}
                          </p>
                          <p className="text-xs text-gray-400 flex-shrink-0 ml-2">
                            {format(
                              new Date(prescription.prescription_date || prescription.created_date),
                              "MMM d"
                            )}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(prescription.medicines || []).slice(0, 3).map((medicine, idx) => (
                            <span
                              key={idx}
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                CATEGORY_COLORS[medicine.category] || CATEGORY_COLORS.other
                              }`}
                            >
                              {medicine.name.length > 14
                                ? medicine.name.substring(0, 14) + "…"
                                : medicine.name}
                            </span>
                          ))}
                          {(prescription.medicines || []).length > 3 && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full text-xs font-medium">
                              +{(prescription.medicines || []).length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 flex-shrink-0 transition-colors" />
                    </div>
                  </button>
                  <button
                    onClick={(e) => handleMarkAsCompleted(prescription, e)}
                    className="absolute top-3 right-3 p-1.5 bg-green-50 text-green-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-green-100"
                    title="Mark as completed"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {selectedPrescription && (
        <PrescriptionDetail
          prescription={selectedPrescription}
          onClose={handleUpdateAndClose}
          onUpdate={handleUpdateAndClose}
          onEdit={() => {}}
          onDelete={async () => {
            await handleUpdateAndClose();
          }}
        />
      )}
    </>
  );
}