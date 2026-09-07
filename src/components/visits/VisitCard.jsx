import React from "react";
import { motion } from "framer-motion";
import { Stethoscope, CheckCircle2, Clock, Mic } from "lucide-react";
import { format } from "date-fns";

export default function VisitCard({ visit, onClick }) {
  const isCompleted = visit.status === "completed";

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl border border-gray-100 p-4 hover:border-gray-200 transition-all"
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isCompleted ? "bg-green-100" : "bg-amber-100"
          }`}
        >
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <Clock className="w-5 h-5 text-amber-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-gray-900 truncate">
              {visit.visit_purpose || "Doctor visit"}
            </p>
            <span className="text-xs text-gray-400 flex-shrink-0">
              {visit.visit_date ? format(new Date(visit.visit_date), "MMM d") : ""}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
            {visit.doctor_name && (
              <span className="flex items-center gap-1">
                <Stethoscope className="w-3 h-3" />
                {visit.doctor_name}
              </span>
            )}
            {visit.specialty && <span>· {visit.specialty}</span>}
          </div>
          {isCompleted && (
            <div className="flex items-center gap-3 mt-2 text-xs">
              {visit.key_points?.length > 0 && (
                <span className="text-gray-500">{visit.key_points.length} key points</span>
              )}
              {visit.next_steps?.length > 0 && (
                <span className="text-blue-600 font-medium">
                  {visit.next_steps.length} next step{visit.next_steps.length > 1 ? "s" : ""}
                </span>
              )}
              {visit.audio_file_url && (
                <span className="flex items-center gap-1 text-gray-400">
                  <Mic className="w-3 h-3" />
                  {Math.floor((visit.duration_seconds || 0) / 60)}m
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
}