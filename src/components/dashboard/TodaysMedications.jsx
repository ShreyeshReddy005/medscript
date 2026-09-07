import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO, isPast } from "date-fns";
import { Check, X, AlertCircle, Clock } from "lucide-react";

export default function TodaysMedications({ patientName, reminders, logs }) {
  const today = format(new Date(), "yyyy-MM-dd");

  const todaysSchedule = reminders.flatMap(reminder => {
    const startDate = new Date(reminder.start_date);
    const endDate = reminder.end_date ? new Date(reminder.end_date) : null;
    const now = new Date();
    if (startDate <= now && (!endDate || endDate >= now)) {
      return reminder.reminder_times.map(time => ({
        ...reminder,
        scheduled_time: `${today}T${time}:00`,
        time_only: time
      }));
    }
    return [];
  }).sort((a, b) => a.time_only.localeCompare(b.time_only));

  const getLogForReminder = (reminder) =>
    logs.find(log => log.reminder_id === reminder.id && log.scheduled_time === reminder.scheduled_time);

  const loggedOrPast = todaysSchedule.filter(r => {
    const log = getLogForReminder(r);
    return log || isPast(parseISO(r.scheduled_time));
  });

  const formatTime = (t) => {
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  const takenCount = loggedOrPast.filter(r => getLogForReminder(r)?.status === 'taken').length;
  const totalCount = loggedOrPast.length;

  if (loggedOrPast.length === 0) return null;

  const pct = totalCount > 0 ? (takenCount / totalCount) * 100 : 0;

  return (
    <div className="px-5 py-4">
      {/* Header with progress */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Today's Log</h3>
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${pct >= 80 ? 'bg-gradient-to-r from-green-400 to-emerald-500' : pct >= 50 ? 'bg-gradient-to-r from-amber-400 to-yellow-500' : 'bg-gradient-to-r from-red-400 to-rose-500'}`}
            />
          </div>
          <span className="text-sm font-bold text-gray-700 tabular-nums">{takenCount}/{totalCount}</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[20px] top-5 bottom-5 w-px bg-gradient-to-b from-gray-200 to-transparent" />

        <div className="space-y-2.5">
          <AnimatePresence>
            {loggedOrPast.slice(0, 6).map((reminder, index) => {
              const log = getLogForReminder(reminder);
              const status = log?.status || 'missed';

              const cfg = {
                taken:  { Icon: Check,       dot: 'bg-gradient-to-br from-green-400 to-emerald-500',  card: 'bg-green-50 border-green-100',   label: 'Taken',   lc: 'text-green-600' },
                skipped:{ Icon: X,           dot: 'bg-gradient-to-br from-amber-400 to-orange-500',   card: 'bg-amber-50 border-amber-100',   label: 'Skipped', lc: 'text-amber-600' },
                missed: { Icon: AlertCircle, dot: 'bg-gradient-to-br from-red-400 to-rose-500',       card: 'bg-red-50 border-red-100',       label: 'Missed',  lc: 'text-red-500'   },
              }[status];

              return (
                <motion.div
                  key={`${reminder.id}-${reminder.time_only}`}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="flex items-center gap-3"
                >
                  {/* Dot on timeline */}
                  <div className={`relative z-10 w-10 h-10 ${cfg.dot} rounded-xl flex items-center justify-center shadow-md flex-shrink-0`}>
                    <cfg.Icon className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
                  </div>

                  {/* Card */}
                  <div className={`flex-1 ${cfg.card} border rounded-2xl px-4 py-2.5 flex items-center justify-between`}>
                    <div className="min-w-0">
                      <p className={`font-semibold text-sm text-gray-900 truncate ${status === 'taken' ? 'line-through opacity-50' : ''}`}>
                        {reminder.medicine_name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{reminder.dosage}</p>
                    </div>
                    <div className="flex-shrink-0 ml-3 text-right">
                      <p className={`text-xs font-bold ${cfg.lc}`}>{cfg.label}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 justify-end mt-0.5">
                        <Clock className="w-3 h-3" />{formatTime(reminder.time_only)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {loggedOrPast.length > 6 && (
          <p className="text-center text-xs text-gray-400 font-medium mt-3">
            +{loggedOrPast.length - 6} more entries today
          </p>
        )}
      </div>
    </div>
  );
}