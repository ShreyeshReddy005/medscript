import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Lightbulb,
  ListChecks,
  Calendar,
  Plus,
  X,
  ChevronDown,
  FileText,
  Play,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

function EditableList({ items, onChange, placeholder, color }) {
  const [newItem, setNewItem] = useState("");

  const add = () => {
    const v = newItem.trim();
    if (v) {
      onChange([...items, v]);
      setNewItem("");
    }
  };

  return (
    <div>
      <div className="space-y-2 mb-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2 group">
            <div className={`w-1.5 h-1.5 rounded-full ${color} mt-2 flex-shrink-0`} />
            <p className="text-sm text-gray-700 flex-1">{item}</p>
            <button
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center transition-opacity"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="h-9 rounded-xl text-sm"
        />
        <button
          onClick={add}
          className="flex-shrink-0 w-9 h-9 bg-gray-100 text-gray-500 rounded-xl flex items-center justify-center active:scale-90 transition-all"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function VisitSummary({ visit, onSave, onDone }) {
  const [keyPoints, setKeyPoints] = useState(visit.key_points || []);
  const [recommendations, setRecommendations] = useState(visit.recommendations || []);
  const [nextSteps, setNextSteps] = useState(visit.next_steps || []);
  const [showTranscript, setShowTranscript] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ key_points: keyPoints, recommendations, next_steps: nextSteps });
    setSaving(false);
  };

  const updateNextStep = (i, field, value) => {
    const updated = [...nextSteps];
    updated[i] = { ...updated[i], [field]: value };
    setNextSteps(updated);
  };

  const addNextStep = () => {
    setNextSteps([...nextSteps, { action: "", due_date: "" }]);
  };

  const removeNextStep = (i) => {
    setNextSteps(nextSteps.filter((_, idx) => idx !== i));
  };

  return (
    <div className="px-5 py-4 pb-32 max-w-5xl mx-auto">
      {/* Success header */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="text-center mb-6"
      >
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-9 h-9 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Visit Summary</h2>
        <p className="text-sm text-gray-500 mt-1">
          {visit.doctor_name ? `With ${visit.doctor_name}` : "Your visit has been summarized"}
          {visit.visit_date ? ` · ${format(new Date(visit.visit_date), "MMM d, yyyy")}` : ""}
        </p>
      </motion.div>

      {/* Audio player */}
      {visit.audio_file_url && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Play className="w-5 h-5 text-blue-600" fill="currentColor" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">Recording</p>
              <p className="text-xs text-gray-400">
                {Math.floor((visit.duration_seconds || 0) / 60)}m {(visit.duration_seconds || 0) % 60}s
              </p>
            </div>
            <audio controls className="h-8 max-w-[180px]">
              <source src={visit.audio_file_url} />
            </audio>
          </div>
        </div>
      )}

      {/* Key points */}
      <div className="bg-white rounded-3xl border border-gray-100 p-5 mb-4">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          Key Points
        </h3>
        <EditableList
          items={keyPoints}
          onChange={setKeyPoints}
          placeholder="Add a key point…"
          color="bg-amber-400"
        />
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-3xl border border-gray-100 p-5 mb-4">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          Doctor's Recommendations
        </h3>
        <EditableList
          items={recommendations}
          onChange={setRecommendations}
          placeholder="Add a recommendation…"
          color="bg-green-400"
        />
      </div>

      {/* Next steps */}
      <div className="bg-white rounded-3xl border border-gray-100 p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <ListChecks className="w-4 h-4 text-blue-500" />
            Next Steps
          </h3>
          <button
            onClick={addNextStep}
            className="text-xs text-blue-600 font-semibold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
        <div className="space-y-2">
          {nextSteps.map((step, i) => (
            <div key={i} className="flex items-start gap-2 group">
              <div className="w-5 h-5 rounded-full border-2 border-blue-500 flex-shrink-0 mt-1" />
              <div className="flex-1 space-y-1.5">
                <Input
                  value={step.action || ""}
                  onChange={(e) => updateNextStep(i, "action", e.target.value)}
                  placeholder="e.g. Schedule blood test"
                  className="h-9 rounded-xl text-sm"
                />
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <Input
                    type="date"
                    value={step.due_date ? step.due_date.split("T")[0] : ""}
                    onChange={(e) => updateNextStep(i, "due_date", e.target.value)}
                    className="h-8 rounded-lg text-xs max-w-[160px]"
                  />
                </div>
              </div>
              <button
                onClick={() => removeNextStep(i)}
                className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center transition-opacity flex-shrink-0 mt-1"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          ))}
          {nextSteps.length === 0 && (
            <p className="text-sm text-gray-400">No next steps yet. Add one to stay on track.</p>
          )}
        </div>
      </div>

      {/* Transcript */}
      {visit.transcript && (
        <div className="bg-white rounded-3xl border border-gray-100 mb-4 overflow-hidden">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="w-full flex items-center justify-between p-5"
          >
            <span className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-gray-400" />
              Full Transcript
            </span>
            <motion.div animate={{ rotate: showTranscript ? 180 : 0 }}>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </motion.div>
          </button>
          {showTranscript && (
            <div className="px-5 pb-5">
              <div className="max-h-80 overflow-y-auto text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-2xl p-4 whitespace-pre-wrap">
                {visit.transcript}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] z-30">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button
            onClick={onDone}
            className="px-5 py-3 bg-gray-100 text-gray-600 rounded-2xl font-semibold active:scale-95 transition-all"
          >
            Done
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-semibold shadow-sm active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Summary"}
          </button>
        </div>
      </div>
    </div>
  );
}