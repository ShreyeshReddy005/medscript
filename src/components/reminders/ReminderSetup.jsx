import React, { useState, useEffect } from 'react';
import { MedicationReminder  } from "@/entities/all";
import { Bell, Clock, Calendar, ChevronDown, ChevronUp, Plus, Trash2, Pill, CheckCircle2, SkipForward, AlertCircle } from 'lucide-react';
import { add, format, isBefore, startOfDay, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { isPrescriptionCourseCompleted } from '@/lib/extractionPipeline';

const CATEGORY_COLORS = {
  antibiotic: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  painkiller: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  vitamin: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  supplement: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  chronic: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  other: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
};

const TIME_LABELS = { '07:30': 'Early morning', '08:00': 'Morning', '08:30': 'After breakfast', '12:30': 'Before lunch', '13:00': 'Lunch', '13:30': 'After lunch', '17:00': 'Afternoon', '19:30': 'Before dinner', '20:00': 'Evening', '20:30': 'After dinner', '22:00': 'Bedtime' };

export default function ReminderSetup({ prescription, onClose, onSave }) {
  const [reminders, setReminders] = useState([]);
  const [saving, setSaving] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(0);
  const [error, setError] = useState(null);

  const inferReminderTimes = (frequency, timing) => {
    const f = (frequency || '').toLowerCase();
    const t = (timing || '').toLowerCase();
    const afterMeals = t.includes('after') || t.includes('meal') || t.includes('food');
    const beforeMeals = t.includes('before') || t.includes('empty');
    const breakfastTime = afterMeals ? '08:30' : beforeMeals ? '07:30' : '08:00';
    const lunchTime = afterMeals ? '13:30' : beforeMeals ? '12:30' : '13:00';
    const dinnerTime = afterMeals ? '20:30' : beforeMeals ? '19:30' : '20:00';
    const bedtime = '22:00';

    if (f.includes('four times') || f.includes('qid')) return [breakfastTime, '11:00', lunchTime, dinnerTime];
    if (f.includes('three times') || f.includes('tds') || f.includes('tid')) return [breakfastTime, lunchTime, dinnerTime];
    if (f.includes('twice') || f.includes('bd') || f.includes('bid')) return [breakfastTime, dinnerTime];
    if (f.includes('bedtime') || f.includes('hs') || t.includes('bedtime') || t.includes('sleep')) return [bedtime];
    if (f.includes('morning')) return [breakfastTime];
    if (f.includes('night') || f.includes('evening')) return [dinnerTime];
    return ['08:00'];
  };

  const inferDurationDays = (duration, category) => {
    const d = (duration || '').toLowerCase();
    const match = d.match(/(\d+)\s*(day|week|month)/i);
    if (match) {
      const n = parseInt(match[1]);
      if (match[2].toLowerCase().startsWith('week')) return n * 7;
      if (match[2].toLowerCase().startsWith('month')) return n * 30;
      return n;
    }
    if (d.includes('ongoing') || d.includes('chronic') || d.includes('continue')) return 90;
    if (category === 'antibiotic') return 7;
    if (category === 'chronic') return 90;
    return 7;
  };

  useEffect(() => {
    // Use the prescription date as the start date when available; fall back to today.
    const prescDate = prescription.prescription_date
      ? format(startOfDay(parseISO(prescription.prescription_date)), 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd');
    const courseCompleted = isPrescriptionCourseCompleted(prescription);

    const initial = prescription.medicines.map(med => ({
      ...med,
      prescription_id: prescription.id,
      patient_name: prescription.patient_name,
      reminder_times: inferReminderTimes(med.frequency, med.timing),
      duration_days: inferDurationDays(med.duration, med.category),
      start_date: prescDate,
      is_active: true,
      create_reminder: !courseCompleted, // don't create reminders for already-completed courses
      quantity_prescribed: null,
      refill_reminder_days_before: 5,
    }));
    setReminders(initial);
  }, [prescription]);

  const update = (index, field, value) => {
    setReminders(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const addTime = (index) => {
    setReminders(prev => prev.map((r, i) => i === index ? { ...r, reminder_times: [...r.reminder_times, '17:00'] } : r));
  };

  const removeTime = (remIndex, timeIndex) => {
    setReminders(prev => prev.map((r, i) => i === remIndex
      ? { ...r, reminder_times: r.reminder_times.filter((_, j) => j !== timeIndex) }
      : r
    ));
  };

  const updateTime = (remIndex, timeIndex, value) => {
    setReminders(prev => prev.map((r, i) => i === remIndex
      ? { ...r, reminder_times: r.reminder_times.map((t, j) => j === timeIndex ? value : t) }
      : r
    ));
  };

  const formatTimeLabel = (time) => {
    const label = TIME_LABELS[time];
    const [h, m] = time.split(':').map(Number);
    const display = `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
    return label ? `${display} · ${label}` : display;
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const today = startOfDay(new Date());
    const toCreate = reminders.filter(r => r.create_reminder).map(r => {
      const startDate = new Date(r.start_date);
      const endDate = add(startDate, { days: r.duration_days });
      // Deactivate reminders whose entire course has already passed
      const courseEnded = isBefore(startOfDay(endDate), today);
      let refill_reminder_date = null;
      if (r.quantity_prescribed && r.reminder_times.length > 0) {
        const dosesPerDay = r.reminder_times.length;
        const totalDays = r.quantity_prescribed / dosesPerDay;
        const exhaustionDate = add(startDate, { days: totalDays });
        refill_reminder_date = format(add(exhaustionDate, { days: -r.refill_reminder_days_before }), 'yyyy-MM-dd');
      }
      return {
        prescription_id: r.prescription_id,
        patient_name: r.patient_name,
        medicine_name: r.name,
        dosage: r.dosage,
        frequency: r.frequency,
        timing: r.timing,
        times: r.reminder_times,
        duration: r.duration_days ? `${r.duration_days} days` : null,
        is_active: !courseEnded
      };
    });
    try {
      if (toCreate.length > 0) await MedicationReminder.bulkCreate(toCreate);
      onSave();
    } catch (e) {
      console.error('Error saving reminders:', e);
      setError('Failed to save reminders. Please try again.');
      setSaving(false);
    }
  };

  const enabledCount = reminders.filter(r => r.create_reminder).length;
  const courseCompleted = isPrescriptionCourseCompleted(prescription);

  return (
    <div className="min-h-screen bg-gray-50 pb-44">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-6 pb-7">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Set Reminders</h2>
            <p className="text-sm text-gray-500 mt-0.5">{prescription.medicines.length} medicine{prescription.medicines.length > 1 ? 's' : ''} · confirm your schedule</p>
          </div>
        </div>

        {courseCompleted && (
          <div className="mt-4 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              This prescription is dated {prescription.prescription_date} and its medication course has already ended.
              Reminders are disabled by default. You can still enable them if you're continuing this treatment.
            </p>
          </div>
        )}

        {/* Summary pills */}
        <div className="flex gap-2 mt-5 mb-1 flex-wrap">
          {reminders.map((r, i) => {
            const c = CATEGORY_COLORS[r.category] || CATEGORY_COLORS.other;
            return (
              <button key={i} onClick={() => setExpandedIndex(i === expandedIndex ? -1 : i)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${r.create_reminder ? `${c.bg} ${c.text} border-transparent` : 'bg-gray-100 text-gray-400 border-transparent line-through'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${r.create_reminder ? c.dot : 'bg-gray-300'}`} />
                {r.name.length > 16 ? r.name.slice(0, 16) + '…' : r.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pt-6 space-y-3">
        {reminders.map((rem, index) => {
          const c = CATEGORY_COLORS[rem.category] || CATEGORY_COLORS.other;
          const isExpanded = expandedIndex === index;

          return (
            <motion.div key={index} layout className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              {/* Medicine header row */}
              <button
                onClick={() => setExpandedIndex(isExpanded ? -1 : index)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <div className={`w-10 h-10 ${c.bg} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                  <Pill className={`w-5 h-5 ${c.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">{rem.name}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {rem.reminder_times.map(t => {
                      const [h, m] = t.split(':').map(Number);
                      return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
                    }).join(' · ')} · {rem.duration_days}d
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Toggle enable */}
                  <button
                    onClick={e => { e.stopPropagation(); update(index, 'create_reminder', !rem.create_reminder); }}
                    className={`w-12 h-6 rounded-full transition-colors relative ${rem.create_reminder ? 'bg-blue-500' : 'bg-gray-200'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${rem.create_reminder ? 'left-7' : 'left-1'}`} />
                  </button>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && rem.create_reminder && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-5 space-y-4 border-t border-gray-50 pt-3">
                      {/* Reminder times */}
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> Reminder Times
                        </p>
                        <div className="space-y-2">
                          {rem.reminder_times.map((time, ti) => (
                            <div key={ti} className="flex items-center gap-2">
                              <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-2xl px-3 py-2">
                                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <input
                                  type="time"
                                  value={time}
                                  onChange={e => updateTime(index, ti, e.target.value)}
                                  className="flex-1 bg-transparent text-sm font-semibold text-gray-800 outline-none"
                                />
                                <span className="text-xs text-gray-400 hidden sm:block">{TIME_LABELS[time] || ''}</span>
                              </div>
                              {rem.reminder_times.length > 1 && (
                                <button onClick={() => removeTime(index, ti)} className="w-8 h-8 bg-red-50 text-red-400 rounded-xl flex items-center justify-center hover:bg-red-100">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                          <button onClick={() => addTime(index)} className="flex items-center gap-2 w-full py-2.5 px-3 border border-dashed border-gray-200 rounded-2xl text-sm font-medium text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors">
                            <Plus className="w-4 h-4" /> Add another time
                          </button>
                        </div>
                      </div>

                      {/* Duration + Start date */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> Start Date
                          </p>
                          <input
                            type="date"
                            value={rem.start_date}
                            onChange={e => update(index, 'start_date', e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-sm font-medium text-gray-800 outline-none focus:ring-2 focus:ring-blue-300"
                          />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Duration (days)</p>
                          <input
                            type="number"
                            value={rem.duration_days}
                            min={1}
                            onChange={e => update(index, 'duration_days', parseInt(e.target.value) || 1)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5 text-sm font-medium text-gray-800 outline-none focus:ring-2 focus:ring-blue-300"
                          />
                        </div>
                      </div>

                      {/* Refill tracking (optional) */}
                      <div className="bg-amber-50 rounded-2xl p-3 border border-amber-100">
                        <p className="text-xs font-bold text-amber-700 mb-2 flex items-center gap-1.5">
                          <Bell className="w-3.5 h-3.5" /> Refill Tracking (Optional)
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            placeholder="Total pills"
                            value={rem.quantity_prescribed || ''}
                            onChange={e => update(index, 'quantity_prescribed', parseInt(e.target.value) || null)}
                            className="bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-300"
                          />
                          <input
                            type="number"
                            placeholder="Alert X days before"
                            value={rem.refill_reminder_days_before}
                            onChange={e => update(index, 'refill_reminder_days_before', parseInt(e.target.value) || 5)}
                            className="bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-300"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 flex items-center gap-2 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Bottom actions */}
      <div className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 p-4 pb-4 z-40">
        <div className="flex gap-3 max-w-lg mx-auto">
          <button
            onClick={onClose}
            className="flex items-center justify-center gap-2 px-5 py-3.5 bg-gray-100 text-gray-600 rounded-2xl font-semibold text-sm active:scale-95 transition-transform"
          >
            <SkipForward className="w-4 h-4" /> Skip
          </button>
          <button
            onClick={handleSave}
            disabled={saving || enabledCount === 0}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm disabled:opacity-50 active:scale-95 transition-all shadow-lg shadow-blue-200"
          >
            {saving ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /> Save {enabledCount} Reminder{enabledCount !== 1 ? 's' : ''}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}