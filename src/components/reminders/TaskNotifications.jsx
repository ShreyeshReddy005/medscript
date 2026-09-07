import React, { useEffect, useState, useRef } from "react";
import { HealthTask  } from "@/entities/all";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, parseISO, isPast, isToday, differenceInCalendarDays } from "date-fns";
import { FlaskConical, CheckCircle, Upload, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function TaskNotifications({ patientName }) {
  const [task, setTask] = useState(null);
  const dismissed = useRef(new Set());
  const notified = useRef(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    if (!patientName) return;
    const check = async () => {
      try {
        const tasks = await HealthTask.filter({ patient_name: patientName, status: "pending" });
        const due = tasks
          .filter(t => t.due_date)
          .filter(t => isToday(parseISO(t.due_date)) || isPast(parseISO(t.due_date)))
          .filter(t => !dismissed.current.has(t.id))
          .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
        if (due.length > 0) {
          const top = due[0];
          setTask(top);
          if (!notified.current.has(top.id)) {
            notified.current.add(top.id);
            if ('Notification' in window) {
              if (Notification.permission === 'granted') {
                new Notification(`🧪 ${top.title}`, { body: 'Time to do your test and upload the results', tag: 'task-' + top.id });
              } else if (Notification.permission === 'default') {
                Notification.requestPermission().then(p => {
                  if (p === 'granted') new Notification(`🧪 ${top.title}`, { body: 'Time to do your test and upload the results', tag: 'task-' + top.id });
                });
              }
            }
          }
        } else {
          setTask(null);
        }
      } catch (e) {
        console.error("Task notification check failed", e);
      }
    };
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [patientName]);

  const handleDone = async () => {
    try {
      await HealthTask.update(task.id, { status: "done", completed_date: format(new Date(), "yyyy-MM-dd") });
      dismissed.current.add(task.id);
      setTask(null);
    } catch (e) { console.error(e); }
  };

  const handleUpload = () => {
    navigate(createPageUrl("Upload"));
  };

  const handleDismiss = () => {
    dismissed.current.add(task.id);
    setTask(null);
  };

  const daysOverdue = task && task.due_date ? differenceInCalendarDays(new Date(), parseISO(task.due_date)) : 0;

  return (
    <AnimatePresence>
      {task && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-20 left-4 right-4 z-40"
        >
          <div className="bg-white rounded-2xl p-4 border border-purple-200 shadow-xl max-w-sm mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <FlaskConical className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Health Task Due</p>
                  <p className="text-xs text-gray-500">
                    {isToday(parseISO(task.due_date)) ? "Today" : daysOverdue > 0 ? `${daysOverdue}d overdue` : format(parseISO(task.due_date), "MMM d")}
                  </p>
                </div>
              </div>
              <button onClick={handleDismiss} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="mb-4">
              <h4 className="font-semibold text-gray-900 text-sm">{task.title}</h4>
              {task.notes && <p className="text-xs text-gray-500 mt-0.5">{task.notes}</p>}
            </div>
            <div className="flex space-x-2">
              <button onClick={handleDone} className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors">
                <CheckCircle className="w-4 h-4" /><span>Done</span>
              </button>
              <button onClick={handleUpload} className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 bg-purple-500 text-white rounded-xl text-sm font-medium hover:bg-purple-600 transition-colors">
                <Upload className="w-4 h-4" /><span>Upload</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}