import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Stethoscope,
  Calendar,
  Plus,
  X,
  Check,
  MessageSquare,
  AlertCircle,
  Pill,
  Activity,
  ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

const SPECIALTIES = [
  "General Practice",
  "Cardiology",
  "Dermatology",
  "Endocrinology",
  "Gastroenterology",
  "Neurology",
  "Orthopedics",
  "Pediatrics",
  "Psychiatry",
  "Gynecology",
  "Ophthalmology",
  "ENT",
  "Urology",
  "Oncology",
  "Other",
];

export default function VisitPrep({
  patientName,
  existingConditions = [],
  currentMeds = [],
  onComplete,
  onCancel,
}) {
  const [doctorName, setDoctorName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [visitDate, setVisitDate] = useState(
    format(new Date(), "yyyy-MM-dd'T'HH:mm")
  );
  const [purpose, setPurpose] = useState("");
  const [symptoms, setSymptoms] = useState([]);
  const [symptomInput, setSymptomInput] = useState("");
  const [questions, setQuestions] = useState([]);
  const [questionInput, setQuestionInput] = useState("");
  const [prepNotes, setPrepNotes] = useState("");
  const [checkedItems, setCheckedItems] = useState(new Set());

  const toggleChecked = (item) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  };

  const removeQuestion = (q) => {
    setQuestions(questions.filter((x) => x !== q));
    setCheckedItems((prev) => {
      const next = new Set(prev);
      next.delete(q);
      return next;
    });
  };

  const addSymptom = () => {
    const v = symptomInput.trim();
    if (v && !symptoms.includes(v)) {
      setSymptoms([...symptoms, v]);
      setSymptomInput("");
    }
  };

  const addQuestion = () => {
    const v = questionInput.trim();
    if (v && !questions.includes(v)) {
      setQuestions([...questions, v]);
      setQuestionInput("");
    }
  };

  const handleStart = () => {
    onComplete({
      doctor_name: doctorName.trim(),
      specialty,
      clinic_name: clinicName.trim(),
      visit_date: new Date(visitDate).toISOString(),
      visit_purpose: purpose.trim(),
      symptoms,
      questions,
      prep_notes: prepNotes.trim(),
      status: "preparing",
    });
  };

  const canStart = purpose.trim().length > 0 || symptoms.length > 0 || questions.length > 0;

  return (
    <div className="px-5 py-4 pb-32 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Stethoscope className="w-7 h-7 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Prepare for your visit</h2>
        <p className="text-sm text-gray-500 mt-1">
          A quick prep helps you get the most out of your appointment
        </p>
      </div>

      {/* Visit details */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="text-xs font-semibold text-gray-500 mb-1.5">
              Doctor's name
            </Label>
            <Input
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              placeholder="Dr. Sarah Chen"
              className="rounded-xl"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-500 mb-1.5">
              Specialty
            </Label>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select…</option>
              {SPECIALTIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-500 mb-1.5">
              Clinic / Hospital
            </Label>
            <Input
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              placeholder="City Medical Center"
              className="rounded-xl"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              When is the visit?
            </Label>
            <Input
              type="datetime-local"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              className="rounded-xl"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs font-semibold text-gray-500 mb-1.5">
            What's the main reason for this visit?
          </Label>
          <Textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="e.g. Follow-up on blood pressure medication, persistent headaches for 2 weeks…"
            className="rounded-xl min-h-[80px] resize-none"
          />
        </div>
      </div>

      {/* Context from existing data */}
      {(existingConditions.length > 0 || currentMeds.length > 0) && (
        <div className="bg-blue-50/60 rounded-2xl border border-blue-100 p-4 mb-4 space-y-3">
          <p className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            From your health record
          </p>
          {existingConditions.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Known conditions to mention:</p>
              <div className="flex flex-wrap gap-1.5">
                {existingConditions.map((c) => (
                  <span
                    key={c}
                    className="px-2.5 py-1 bg-white rounded-full text-xs font-medium text-gray-700 border border-gray-200"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
          {currentMeds.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                <Pill className="w-3 h-3" /> Current medications:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {currentMeds.map((m) => (
                  <span
                    key={m}
                    className="px-2.5 py-1 bg-white rounded-full text-xs font-medium text-gray-700 border border-gray-200"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Symptoms */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <Label className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 text-orange-500" />
          Symptoms to discuss
        </Label>
        <div className="flex gap-2 mb-3">
          <Input
            value={symptomInput}
            onChange={(e) => setSymptomInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSymptom())}
            placeholder="e.g. Fatigue, joint pain…"
            className="rounded-xl"
          />
          <button
            onClick={addSymptom}
            className="flex-shrink-0 w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center active:scale-90 transition-all"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <AnimatePresence>
          {symptoms.length > 0 && (
            <motion.div layout className="flex flex-wrap gap-2">
              {symptoms.map((s) => (
                <motion.span
                  key={s}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 bg-orange-50 text-orange-700 rounded-full text-sm font-medium border border-orange-100"
                >
                  {s}
                  <button
                    onClick={() => setSymptoms(symptoms.filter((x) => x !== s))}
                    className="w-5 h-5 rounded-full hover:bg-orange-200 flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Preparation Checklist — Questions & Concerns */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <Label className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            Questions & Concerns
          </Label>
          {questions.length > 0 && (
            <span className="text-xs font-medium text-gray-400">
              {checkedItems.size} of {questions.length} ready
            </span>
          )}
        </div>
        {questions.length > 0 && (
          <div className="h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
            <motion.div
              className="h-full bg-green-500 rounded-full"
              animate={{
                width: `${questions.length > 0 ? (checkedItems.size / questions.length) * 100 : 0}%`,
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}
        <div className="flex gap-2 mb-3">
          <Input
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addQuestion())}
            placeholder="e.g. Is this medication safe? / I'm worried about side effects…"
            className="rounded-xl"
          />
          <button
            onClick={addQuestion}
            className="flex-shrink-0 w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center active:scale-90 transition-all"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <AnimatePresence>
          {questions.length > 0 && (
            <motion.div layout className="space-y-2">
              {questions.map((q) => {
                const isChecked = checkedItems.has(q);
                return (
                  <motion.div
                    key={q}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all ${
                      isChecked ? "bg-green-50 border-green-200" : "bg-blue-50/60 border-blue-100"
                    }`}
                  >
                    <button
                      onClick={() => toggleChecked(q)}
                      className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                        isChecked
                          ? "bg-green-500 text-white"
                          : "border-2 border-gray-300 hover:border-blue-500"
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>
                    <p
                      className={`text-sm flex-1 ${
                        isChecked ? "text-gray-400 line-through" : "text-gray-700"
                      }`}
                    >
                      {q}
                    </p>
                    <button
                      onClick={() => removeQuestion(q)}
                      className="w-6 h-6 rounded-full hover:bg-gray-200 flex items-center justify-center flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Additional notes */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <Label className="text-xs font-semibold text-gray-500 mb-1.5">
          Anything else to remember?
        </Label>
        <Textarea
          value={prepNotes}
          onChange={(e) => setPrepNotes(e.target.value)}
          placeholder="e.g. Bring recent lab results, ask about insurance coverage for the test…"
          className="rounded-xl min-h-[60px] resize-none"
        />
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] z-30">
        <div className="flex items-center gap-3 max-w-5xl mx-auto">
          <button
            onClick={onCancel}
            className="px-5 py-3 bg-gray-100 text-gray-600 rounded-2xl font-semibold active:scale-95 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={!canStart}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-semibold shadow-sm active:scale-95 transition-all disabled:opacity-40 disabled:active:scale-100"
          >
            Start Recording
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}