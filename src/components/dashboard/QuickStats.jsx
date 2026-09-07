import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Activity, Pill, Flame, ChevronRight } from "lucide-react";
import { startOfWeek, endOfWeek, parseISO, isWithinInterval, format } from "date-fns";

export default function QuickStats({ prescriptions = [], logs = [], onActiveMedsClick }) {
  const stats = useMemo(() => {
    const now = new Date();
    const weeklyLogs = logs.filter((log) => {
      try {
        return isWithinInterval(parseISO(log.scheduled_time), {
          start: startOfWeek(now),
          end: endOfWeek(now),
        });
      } catch {
        return false;
      }
    });
    const takenThisWeek = weeklyLogs.filter((l) => l.status === "taken").length;
    const totalThisWeek = weeklyLogs.length;
    const adherenceRate = totalThisWeek > 0 ? Math.round((takenThisWeek / totalThisWeek) * 100) : 0;

    const dayMap = {};
    logs.forEach((l) => {
      const d = l.scheduled_time?.split("T")[0];
      if (d && l.status === "taken") dayMap[d] = true;
    });
    let streak = 0;
    const check = new Date();
    while (streak < 365) {
      if (dayMap[format(check, "yyyy-MM-dd")]) {
        streak++;
        check.setDate(check.getDate() - 1);
      } else break;
    }

    const activePrescriptions = prescriptions.filter((p) => p.is_active !== false);
    const activeMedicines = activePrescriptions.reduce(
      (sum, p) => sum + (p.medicines?.length || 0),
      0
    );

    return { adherenceRate, takenThisWeek, totalThisWeek, activeMedicines, streak };
  }, [prescriptions, logs]);

  const cards = [
    {
      label: "Adherence",
      value: stats.totalThisWeek > 0 ? `${stats.adherenceRate}%` : "—",
      sub: stats.totalThisWeek > 0 ? `${stats.takenThisWeek}/${stats.totalThisWeek}` : "No data",
      icon: Activity,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Active Meds",
      value: stats.activeMedicines,
      sub: "prescriptions",
      icon: Pill,
      color: "text-blue-600",
      bg: "bg-blue-50",
      onClick: onActiveMedsClick,
    },
    {
      label: "Streak",
      value: stats.streak,
      sub: stats.streak === 1 ? "day" : "days",
      icon: Flame,
      color: "text-orange-500",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="px-5 pb-4">
      <h2 className="text-base font-bold text-gray-900 mb-3">Highlights</h2>
      <div className="grid grid-cols-3 gap-3">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            onClick={card.onClick}
            role={card.onClick ? "button" : undefined}
            className={`bg-white rounded-2xl border p-3.5 shadow-sm ${
              card.onClick
                ? "border-blue-100 cursor-pointer hover:border-blue-300 hover:shadow-md active:scale-95"
                : "border-gray-100"
            } transition-all`}
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className={`w-8 h-8 ${card.bg} rounded-xl flex items-center justify-center`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
              {card.onClick && <ChevronRight className="w-3.5 h-3.5 text-blue-400" />}
            </div>
            <p className="text-xl font-bold text-gray-900 leading-none">{card.value}</p>
            <p className="text-xs font-medium text-gray-400 mt-1">{card.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}