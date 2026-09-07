import React, { useMemo } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { format, isSameDay } from 'date-fns';
import { CheckCircle2, XCircle, SkipForward } from 'lucide-react';

export default function HistoryCalendarView({ logs, onDateSelect, selectedDate }) {
  const logDates = useMemo(() => {
    return logs.map(log => new Date(log.scheduled_time));
  }, [logs]);

  const modifiers = {
    hasLog: logDates,
  };

  const modifiersStyles = {
    hasLog: {
      border: "2px solid var(--medical-blue)",
      borderRadius: '9999px',
    },
  };

  const selectedDayLogs = useMemo(() => {
    if (!selectedDate) return [];
    return logs
      .filter(log => isSameDay(new Date(log.scheduled_time), selectedDate))
      .sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time));
  }, [logs, selectedDate]);

  const logStatusIcons = {
    taken: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    skipped: <SkipForward className="w-5 h-5 text-orange-500" />,
    missed: <XCircle className="w-5 h-5 text-red-500" />,
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-2 border border-gray-100">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onDateSelect}
          modifiers={modifiers}
          modifiersStyles={modifiersStyles}
          className="w-full"
        />
      </div>

      {selectedDate && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Logs for {format(selectedDate, 'MMMM d, yyyy')}
          </h3>
          {selectedDayLogs.length > 0 ? (
            <div className="space-y-3">
              {selectedDayLogs.map(log => (
                <div key={log.id} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {logStatusIcons[log.status]}
                    <div>
                      <p className="font-semibold text-gray-900">{log.medicine_name}</p>
                      <p className="text-sm text-gray-500">
                        Scheduled at {format(new Date(log.scheduled_time), 'p')}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium capitalize text-gray-600">{log.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
              <p className="text-gray-600">No medication logs for this day.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}