import React, { useMemo } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";

export default function WelcomeHeader({ patientName, logs = [] }) {
  const hour = new Date().getHours();
  const greeting =
    hour >= 5 && hour < 12 ? "Good morning"
    : hour >= 12 && hour < 17 ? "Good afternoon"
    : hour >= 17 && hour < 21 ? "Good evening"
    : "Good night";

  const { streak, todayAdherence } = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    const todayLogs = logs.filter((l) => l.scheduled_time?.startsWith(today));
    const todayAd =
      todayLogs.length > 0
        ? Math.round((todayLogs.filter((l) => l.status === "taken").length / todayLogs.length) * 100)
        : null;
    const dayMap = {};
    logs.forEach((l) => {
      const d = l.scheduled_time?.split("T")[0];
      if (d && l.status === "taken") dayMap[d] = true;
    });
    let s = 0;
    const check = new Date();
    while (s < 365) {
      if (dayMap[format(check, "yyyy-MM-dd")]) {
        s++;
        check.setDate(check.getDate() - 1);
      } else break;
    }
    return { streak: s, todayAdherence: todayAd };
  }, [logs]);

  const firstName = patientName?.split(" ")[0] || patientName;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="px-5 pt-6 pb-3 max-w-5xl mx-auto"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">
            {format(new Date(), "EEEE, MMMM d")}
          </p>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">
            {greeting}, {firstName}
          </h1>
        </div>
        {(streak > 0 || todayAdherence !== null) && (
          <div className="flex items-center gap-2 mt-1">
            {streak > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-50 rounded-xl">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-xs font-bold text-orange-600">{streak}d</span>
              </div>
            )}
            {todayAdherence !== null && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 rounded-xl">
                <span className="text-xs font-bold text-green-600">{todayAdherence}%</span>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}