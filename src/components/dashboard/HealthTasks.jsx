import React, { useState, useEffect } from "react";
import { HealthTask  } from "@/entities/all";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, parseISO, isPast, isToday } from "date-fns";
import { Plus, FlaskConical, Stethoscope, CheckCircle, Calendar, Trash2, ChevronDown, ChevronUp, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const TYPE_META = {
  lab_test: { icon: FlaskConical, color: "text-purple-600", bg: "bg-purple-50", badge: "bg-purple-100 text-purple-700", label: "Test" },
  follow_up: { icon: Stethoscope, color: "text-blue-600", bg: "bg-blue-50", badge: "bg-blue-100 text-blue-700", label: "Follow-up" },
  other: { icon: CheckCircle, color: "text-gray-600", bg: "bg-gray-50", badge: "bg-gray-100 text-gray-700", label: "Task" },
};

export default function HealthTasks({ patientName }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", type: "lab_test", due_date: "" });
  const [saving, setSaving] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (patientName) loadTasks();
  }, [patientName]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await HealthTask.filter({ patient_name: patientName }, "-created_date", 100);
      setTasks(data);
    } catch (e) {
      console.error("Error loading tasks", e);
    } finally {
      setLoading(false);
    }
  };

  const pending = tasks.filter(t => t.status !== "done");
  const completed = tasks.filter(t => t.status === "done");

  const handleAdd = async () => {
    if (!newTask.title.trim()) return;
    setSaving(true);
    try {
      await HealthTask.create({
        patient_name: patientName,
        title: newTask.title.trim(),
        type: newTask.type,
        due_date: newTask.due_date || null,
        status: "pending",
      });
      setNewTask({ title: "", type: "lab_test", due_date: "" });
      setShowAdd(false);
      await loadTasks();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDone = async (task) => {
    try {
      await HealthTask.update(task.id, { status: "done", completed_date: format(new Date(), "yyyy-MM-dd") });
      await loadTasks();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (task) => {
    try {
      await HealthTask.delete(task.id);
      await loadTasks();
    } catch (e) { console.error(e); }
  };

  const handleUpload = () => {
    navigate(createPageUrl("Upload"));
  };

  return (
    <div className="px-5 pt-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center">
              <FlaskConical className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Health Tasks</h3>
              <p className="text-xs text-gray-400">{pending.length} pending · tests & follow-ups</p>
            </div>
          </div>
          <button onClick={() => setShowAdd(s => !s)} className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold hover:bg-purple-200 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        {/* Add form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="p-4 bg-purple-50/40 space-y-2">
                <input
                  type="text"
                  value={newTask.title}
                  onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="e.g. Complete Blood Count"
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
                />
                <div className="flex gap-2">
                  <select
                    value={newTask.type}
                    onChange={e => setNewTask({ ...newTask, type: e.target.value })}
                    className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300"
                  >
                    <option value="lab_test">Lab Test</option>
                    <option value="follow_up">Follow-up</option>
                    <option value="other">Other</option>
                  </select>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={e => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button onClick={handleAdd} disabled={saving || !newTask.title.trim()} className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-semibold disabled:opacity-50 hover:bg-purple-700">
                    {saving ? "Adding..." : "Add Task"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pending tasks */}
        <div className="p-3 space-y-2">
          {loading ? (
            <div className="h-16 bg-gray-50 rounded-xl animate-pulse" />
          ) : pending.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 font-medium">All caught up!</p>
              <p className="text-xs text-gray-400">No pending tests or follow-ups.</p>
            </div>
          ) : (
            pending.map(task => (
              <TaskRow key={task.id} task={task} onDone={handleDone} onDelete={handleDelete} onUpload={handleUpload} />
            ))
          )}
        </div>

        {/* Completed */}
        {completed.length > 0 && (
          <div className="border-t border-gray-50">
            <button onClick={() => setShowCompleted(s => !s)} className="w-full flex items-center justify-between p-3 text-xs font-semibold text-gray-500 hover:bg-gray-50">
              <span>{completed.length} completed</span>
              {showCompleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <AnimatePresence>
              {showCompleted && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="px-3 pb-3 space-y-2">
                    {completed.map(task => (
                      <TaskRow key={task.id} task={task} onDone={handleDone} onDelete={handleDelete} onUpload={handleUpload} done />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskRow({ task, onDone, onDelete, onUpload, done }) {
  const meta = TYPE_META[task.type] || TYPE_META.other;
  const Icon = meta.icon;
  const due = task.due_date ? parseISO(task.due_date) : null;
  const isOverdue = due && !done && isPast(due) && !isToday(due);
  const isDueToday = due && isToday(due);

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${done ? "bg-gray-50 border-gray-100 opacity-60" : isOverdue ? "bg-red-50 border-red-100" : "bg-white border-gray-100"}`}>
      <div className={`w-9 h-9 ${meta.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4 h-4 ${meta.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-semibold text-gray-900 truncate ${done ? "line-through" : ""}`}>{task.title}</p>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${meta.badge}`}>{meta.label}</span>
        </div>
        {task.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{task.notes}</p>}
        {due && (
          <p className={`text-xs mt-1 flex items-center gap-1 ${isOverdue ? "text-red-600 font-medium" : isDueToday ? "text-orange-600 font-medium" : "text-gray-400"}`}>
            <Calendar className="w-3 h-3" />
            {isOverdue ? `Overdue · ${format(due, "MMM d")}` : isDueToday ? "Due today" : `Due ${format(due, "MMM d, yyyy")}`}
          </p>
        )}
      </div>
      {!done ? (
        <div className="flex items-center gap-1 flex-shrink-0">
          {task.type === "lab_test" && (
            <button onClick={onUpload} className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors" title="Upload results">
              <Upload className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => onDone(task)} className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors" title="Mark done">
            <CheckCircle className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(task)} className="p-2 bg-gray-100 text-gray-400 rounded-lg hover:bg-gray-200 transition-colors" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 flex-shrink-0">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <button onClick={() => onDelete(task)} className="p-2 bg-gray-100 text-gray-400 rounded-lg hover:bg-gray-200 transition-colors" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}