import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  ArrowLeft,
  Mic,
  Upload as UploadIcon,
  Loader2,
  Stethoscope,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Visit, User, FamilyMember, Prescription, UserProfile  } from "@/entities/all";
import { UploadFile, TranscribeAudio, InvokeLLM } from "@/integrations/Core";
import PatientSwitcher from "@/components/dashboard/PatientSwitcher";
import AudioRecorder from "@/components/visits/AudioRecorder";
import VisitPrep from "@/components/visits/VisitPrep";
import VisitSummary from "@/components/visits/VisitSummary";
import VisitCard from "@/components/visits/VisitCard";

export default function VisitAssistant() {
  const [view, setView] = useState("list"); // "list" | "flow"
  const [step, setStep] = useState("prep"); // "prep" | "recording" | "processing" | "summary"
  const [visits, setVisits] = useState([]);
  const [currentVisit, setCurrentVisit] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [existingConditions, setExistingConditions] = useState([]);
  const [currentMeds, setCurrentMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingStage, setProcessingStage] = useState(0);

  const loadPatients = useCallback(async () => {
    try {
      const me = await User.me();
      const family = await FamilyMember.list("-created_date");
      const myName = me.preferred_name || me.full_name || "Myself";
      const all = [...new Set([myName, ...family.map((f) => f.full_name).filter(Boolean)])];
      setPatients(all);
      if (!selectedPatient) setSelectedPatient(all[0]);
    } catch {
      setPatients(["Myself"]);
      if (!selectedPatient) setSelectedPatient("Myself");
    }
  }, [selectedPatient]);

  const loadVisits = useCallback(async (name) => {
    setLoading(true);
    try {
      const data = await Visit.filter({ patient_name: name }, "-visit_date");
      setVisits(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadContext = useCallback(async (name) => {
    try {
      const [me, family, profile, prescriptions] = await Promise.all([
        User.me(),
        FamilyMember.list(),
        UserProfile.filter({}).catch(() => []),
        Prescription.filter({ patient_name: name }),
      ]);

      const myName = me.preferred_name || me.full_name || "Myself";
      let conditions = [];
      if (name === myName) {
        const myProfile = profile[0];
        conditions = myProfile?.medical_conditions || [];
      } else {
        const member = family.find((f) => f.full_name === name);
        conditions = member?.medical_conditions || [];
      }
      setExistingConditions(conditions);

      const activeRx = prescriptions.filter((p) => p.is_active !== false);
      const meds = [
        ...new Set(
          activeRx
            .flatMap((p) => (p.medicines || []).map((m) => m.name))
            .filter(Boolean)
        ),
      ];
      setCurrentMeds(meds);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  useEffect(() => {
    if (selectedPatient) {
      loadVisits(selectedPatient);
      loadContext(selectedPatient);
    }
  }, [selectedPatient, loadVisits, loadContext]);

  const startNewVisit = () => {
    setCurrentVisit(null);
    setStep("prep");
    setView("flow");
  };

  const handlePrepComplete = async (prepData) => {
    try {
      const visit = await Visit.create({
        patient_name: selectedPatient,
        doctor_name: prepData.doctor_name,
        visit_date: prepData.visit_date,
        reason: prepData.visit_purpose,
        symptoms: prepData.symptoms,
        questions: prepData.questions,
        notes: JSON.stringify({ specialty: prepData.specialty, clinic_name: prepData.clinic_name }),
        status: "upcoming",
      });
      setCurrentVisit(visit);
      setStep("recording");
    } catch (error) {
      console.error("Failed to create visit:", error);
    }
  };

  const handleRecordingComplete = async (audioBlob, durationSeconds) => {
    setStep("processing");
    setProcessingStage(0);
    try {
      // Stage 1: Upload audio
      setProcessingStage(0);
      const file = new File([audioBlob], `visit-${Date.now()}.webm`, {
        type: audioBlob.type || "audio/webm",
      });
      const { file_url } = await UploadFile({ file });

      const notesObj = currentVisit.notes ? JSON.parse(currentVisit.notes) : {};
      await Visit.update(currentVisit.id, {
        notes: JSON.stringify({ ...notesObj, audio_file_url: file_url, duration_seconds: durationSeconds }),
        status: "recording",
      });

      // Stage 2: Transcribe
      setProcessingStage(1);
      const transcriptRes = await TranscribeAudio({ audio_url: file_url });
      const transcript =
        typeof transcriptRes === "string"
          ? transcriptRes
          : transcriptRes?.result || transcriptRes?.transcript || String(transcriptRes);

      // Stage 3: Generate summary
      setProcessingStage(2);
      const summary = await InvokeLLM({
        prompt: `You are a medical assistant helping a patient summarize their doctor's visit. Based on the transcribed conversation below, extract the key information into clear, patient-friendly language.

Visit purpose: ${currentVisit.visit_purpose || "Not specified"}
Symptoms patient wanted to discuss: ${(currentVisit.symptoms || []).join(", ") || "None specified"}
Questions patient wanted to ask: ${(currentVisit.questions || []).join(", ") || "None specified"}

Transcribed conversation:
"""
${transcript}
"""

Please extract and organize:
1. key_points: The main topics discussed, findings, and what the doctor identified (3-8 items, each a clear sentence).
2. recommendations: What the doctor recommended — medications, lifestyle changes, tests, or referrals (list each as a clear action).
3. next_steps: Actionable follow-up items the patient should do, each with an action description and a due_date if mentioned (YYYY-MM-DD format, or empty string if no date was mentioned).

Be concise, accurate, and use plain language. Only include what was actually discussed — do not invent medical advice.`,
        response_json_schema: {
          type: "object",
          properties: {
            key_points: {
              type: "array",
              items: { type: "string" },
            },
            recommendations: {
              type: "array",
              items: { type: "string" },
            },
            next_steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  due_date: { type: "string" },
                },
              },
            },
          },
        },
      });

      const existingNotes = currentVisit.notes ? JSON.parse(currentVisit.notes) : {};
      const updatedNotes = JSON.stringify({
        ...existingNotes,
        transcript,
        key_points: summary.key_points || [],
        recommendations: summary.recommendations || [],
        next_steps: summary.next_steps || []
      });

      const updated = await Visit.update(currentVisit.id, {
        notes: updatedNotes,
        status: "completed",
      });

      setCurrentVisit(updated);
      setStep("summary");
    } catch (e) {
      console.error("Processing failed:", e);
      setStep("recording");
      alert("Something went wrong while processing the recording. Please try again.");
    }
  };

  const handleSaveSummary = async (summaryData) => {
    const existingNotes = currentVisit.notes ? JSON.parse(currentVisit.notes) : {};
    const updatedNotes = JSON.stringify({
      ...existingNotes,
      key_points: summaryData.key_points || [],
      recommendations: summaryData.recommendations || [],
      next_steps: summaryData.next_steps || []
    });
    await Visit.update(currentVisit.id, { notes: updatedNotes });
    if (selectedPatient) await loadVisits(selectedPatient);
  };

  const handleDone = async () => {
    if (selectedPatient) await loadVisits(selectedPatient);
    setView("list");
    setCurrentVisit(null);
  };

  const handleOpenVisit = (visit) => {
    setCurrentVisit(visit);
    setStep("summary");
    setView("flow");
  };

  // ── Flow view ──
  if (view === "flow") {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-5 py-3 sticky top-0 z-20">
          <div className="flex items-center gap-3 max-w-5xl mx-auto">
            <button
              onClick={() => {
                setView("list");
                setCurrentVisit(null);
              }}
              className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center active:scale-90 transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1">
              <p className="text-xs text-gray-400">
                {step === "prep" && "Step 1 of 3"}
                {step === "recording" && "Step 2 of 3"}
                {step === "processing" && "Processing…"}
                {step === "summary" && "Step 3 of 3"}
              </p>
              <h1 className="font-bold text-gray-900 leading-tight">
                {step === "prep" && "Visit Prep"}
                {step === "recording" && "Record Visit"}
                {step === "processing" && "Summarizing"}
                {step === "summary" && "Visit Summary"}
              </h1>
            </div>
          </div>
        </div>

        {step === "prep" && (
          <>
            <div className="bg-white border-b border-gray-100">
              <PatientSwitcher
                patients={patients}
                selectedPatient={selectedPatient}
                onSelectPatient={setSelectedPatient}
              />
            </div>
            <VisitPrep
              patientName={selectedPatient}
              existingConditions={existingConditions}
              currentMeds={currentMeds}
              onComplete={handlePrepComplete}
              onCancel={() => setView("list")}
            />
          </>
        )}

        {step === "recording" && (
          <div className="bg-white">
            <AudioRecorder
              onRecordingComplete={handleRecordingComplete}
              onCancel={() => setView("list")}
            />
          </div>
        )}

        {step === "processing" && <ProcessingView stage={processingStage} />}

        {step === "summary" && currentVisit && (
          <VisitSummary
            visit={currentVisit}
            onSave={handleSaveSummary}
            onDone={handleDone}
          />
        )}
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="px-5 pt-5 pb-0 max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Visits</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Prepare, record, and summarize doctor visits
              </p>
            </div>
          </div>

          <PatientSwitcher
            patients={patients}
            selectedPatient={selectedPatient}
            onSelectPatient={setSelectedPatient}
          />
        </div>
      </div>

      <div className="px-5 pt-4 pb-24 max-w-5xl mx-auto">
        {/* New visit CTA */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={startNewVisit}
          className="w-full flex items-center gap-3 p-4 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl shadow-sm transition-all mb-5"
        >
          <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
            <Mic className="w-5 h-5" />
          </div>
          <div className="text-left flex-1">
            <p className="font-semibold">New Visit</p>
            <p className="text-xs text-blue-100">Prep, record & get an AI summary</p>
          </div>
          <Plus className="w-5 h-5" />
        </motion.button>

        {/* Past visits */}
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">
          {loading ? "Loading…" : `${visits.length} Visit${visits.length !== 1 ? "s" : ""}`}
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : visits.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Stethoscope className="w-6 h-6 text-blue-400" />
            </div>
            <p className="font-semibold text-gray-700 mb-1">No visits yet</p>
            <p className="text-sm text-gray-400 max-w-xs mx-auto">
              Start your first visit to prepare questions, record the conversation, and
              get an instant summary.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visits.map((visit) => (
              <VisitCard key={visit.id} visit={visit} onClick={() => handleOpenVisit(visit)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProcessingView({ stage }) {
  const stages = [
    { label: "Uploading recording", icon: UploadIcon },
    { label: "Transcribing conversation", icon: Mic },
    { label: "Generating your summary", icon: Sparkles },
  ];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-5 max-w-5xl mx-auto">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 mb-8"
      />
      <h2 className="text-lg font-bold text-gray-900 mb-1">Summarizing your visit</h2>
      <p className="text-sm text-gray-400 mb-8">This usually takes a minute</p>

      <div className="w-full max-w-sm space-y-3">
        {stages.map((s, i) => {
          const done = i < stage;
          const active = i === stage;
          return (
            <div
              key={i}
              className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
                active ? "bg-blue-50 border border-blue-100" : ""
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  done ? "bg-green-100" : active ? "bg-blue-100" : "bg-gray-100"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : active ? (
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                ) : (
                  <s.icon className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <span
                className={`text-sm font-medium ${
                  done ? "text-gray-400" : active ? "text-gray-900" : "text-gray-400"
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}