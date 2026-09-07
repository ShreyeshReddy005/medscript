import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Check, SkipForward, Sparkles, Pill, PlusCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const CATEGORY_COLORS = {
  antibiotic: { light: "bg-red-50", text: "text-red-600" },
  painkiller: { light: "bg-orange-50", text: "text-orange-600" },
  vitamin: { light: "bg-green-50", text: "text-green-600" },
  supplement: { light: "bg-blue-50", text: "text-blue-600" },
  chronic: { light: "bg-purple-50", text: "text-purple-600" },
  other: { light: "bg-gray-50", text: "text-gray-600" },
};

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="tabular-nums">
      {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

export default function NextDoses({ reminders, logs, onTake, onSkip }) {
  const upcomingDoses = reminders;
  const hasAnyReminders = reminders.length > 0 || logs.length > 0;

  const getTimeUntil = (timeString) => {
    const [h, m] = timeString.split(":").map(Number);
    const now = new Date();
    const dose = new Date();
    dose.setHours(h, m, 0, 0);
    const diff = dose - now;
    const mins = Math.floor(diff / 60000);
    if (mins <= 0) return "Now";
    if (mins < 60) return `in ${mins}m`;
    return `in ${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const formatTime = (timeString) => {
    const [h, m] = timeString.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${period}`;
  };

  if (upcomingDoses.length === 0) {
    if (!hasAnyReminders) {
      return (
        <div className="px-5 pb-4">
          <h3 className="text-base font-bold text-gray-900 mb-3">Up Next</h3>
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Pill className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">No reminders yet</p>
                <p className="text-xs text-gray-500">Scan a prescription to get started</p>
              </div>
            </div>
            <Link
              to={createPageUrl("Upload")}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm active:scale-95 transition-transform"
            >
              <PlusCircle className="w-4 h-4" /> Scan Prescription
            </Link>
          </div>
        </div>
      );
    }
    return (
      <div className="px-5 pb-4">
        <h3 className="text-base font-bold text-gray-900 mb-3">Up Next</h3>
        <div className="bg-green-50 rounded-2xl p-4 border border-green-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">All done for now!</p>
            <p className="text-xs text-gray-500">No upcoming doses today</p>
          </div>
        </div>
      </div>
    );
  }

  const nextDose = upcomingDoses[0];
  const categoryStyle = CATEGORY_COLORS[nextDose.category] || CATEGORY_COLORS.other;
  const remaining = upcomingDoses.slice(1, 4);

  return (
    <div className="px-5 pb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-gray-900">Up Next</h3>
        <div className="flex items-center gap-1.5 text-sm text-gray-400 font-medium">
          <Clock className="w-4 h-4" />
          <LiveClock />
        </div>
      </div>

      {/* Hero dose card — Apple Health style */}
      <motion.div
        key={nextDose.id + nextDose.time_only}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-3"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-11 h-11 ${categoryStyle.light} rounded-xl flex items-center justify-center flex-shrink-0`}>
            <Pill className={`w-5 h-5 ${categoryStyle.text}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-bold ${categoryStyle.text} uppercase tracking-wide`}>
              {nextDose.category || "Medicine"}
            </p>
            <h4 className="text-lg font-bold text-gray-900 leading-tight truncate">
              {nextDose.medicine_name}
            </h4>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold text-gray-900 tabular-nums">
              {formatTime(nextDose.time_only)}
            </p>
            <p className="text-xs text-gray-400">{getTimeUntil(nextDose.time_only)}</p>
          </div>
        </div>

        {nextDose.dosage && (
          <p className="text-sm text-gray-500 mb-3 ml-14">
            {nextDose.dosage}
            {nextDose.timing ? ` · ${nextDose.timing}` : ""}
          </p>
        )}

        <div className="flex gap-2.5">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => onTake(nextDose)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm active:scale-95 transition-transform"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Take Now</span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => onSkip(nextDose)}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold text-sm active:scale-95 transition-transform"
          >
            <SkipForward className="w-4 h-4" />
            <span>Skip</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Later today */}
      <AnimatePresence>
        {remaining.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 mb-1">
              Later Today
            </p>
            {remaining.map((r, i) => {
              const cs = CATEGORY_COLORS[r.category] || CATEGORY_COLORS.other;
              return (
                <motion.div
                  key={`${r.id}-${r.time_only}`}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-3 shadow-sm"
                >
                  <div className={`w-8 h-8 ${cs.light} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Pill className={`w-4 h-4 ${cs.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{r.medicine_name}</p>
                    <p className="text-xs text-gray-400 truncate">{r.dosage}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-gray-700 text-sm">{formatTime(r.time_only)}</p>
                    <p className="text-xs text-gray-400">{getTimeUntil(r.time_only)}</p>
                  </div>
                </motion.div>
              );
            })}
            {upcomingDoses.length > 4 && (
              <p className="text-center text-xs text-gray-400 font-medium pt-1">
                +{upcomingDoses.length - 4} more doses today
              </p>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}