import React, { useState, useEffect } from "react";
import { Prescription, HealthReport, MedicationLog, MedicationReminder, User, FamilyMember  } from "@/entities/all";
import { InvokeLLM } from "@/integrations/Core";
import { format, subDays, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Activity, Heart, Brain, Pill, FlaskConical,
  AlertTriangle, CheckCircle2, Sparkles, Calendar, ChevronRight, Loader2
} from "lucide-react";
import { processLabReports } from "../utils/medicalProcessing";
import BiomarkerPanelCard from "../components/insights/BiomarkerPanelCard";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";

// Adherence history for last 7 days
function AdherenceChart({ logs }) {
  const days = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
  const data = days.map(day => {
    const dayStr = format(day, "yyyy-MM-dd");
    const dayLogs = logs.filter(l => l.scheduled_time?.startsWith(dayStr));
    const taken = dayLogs.filter(l => l.status === "taken").length;
    const total = dayLogs.length;
    return {
      day: format(day, "EEE"),
      rate: total > 0 ? Math.round((taken / total) * 100) : null,
      taken,
      total
    };
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
          <Activity className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">Adherence This Week</h3>
          <p className="text-xs text-gray-500">Daily medication compliance</p>
        </div>
      </div>
      <div className="px-2 pb-3">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data} barSize={26} margin={{ top: 4, right: 12, left: 12, bottom: 0 }}>
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} />
            <Tooltip
              content={({ active, payload }) => active && payload?.[0] ? (
                <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-xs">
                  <p className="font-bold text-gray-900">{payload[0].payload.rate ?? 0}%</p>
                  <p className="text-gray-500">{payload[0].payload.taken}/{payload[0].payload.total} doses</p>
                </div>
              ) : null}
            />
            <Bar dataKey="rate" radius={[6, 6, 2, 2]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={
                  entry.rate === null ? "#F3F4F6" :
                  entry.rate >= 80 ? "#22C55E" :
                  entry.rate >= 50 ? "#F59E0B" : "#EF4444"
                } />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 px-5 pb-4">
        <div className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />≥80% great</div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />50-79% ok</div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />needs work</div>
      </div>
    </div>
  );
}

// Abnormal trends from health reports
// AbnormalTrendsCard removed in favor of dynamic panels

// Health Score Card
function HealthScoreCard({ score, breakdown }) {
  const color = score >= 80 ? "#22C55E" : score >= 60 ? "#F59E0B" : "#EF4444";
  const label = score >= 80 ? "Excellent" : score >= 60 ? "Good" : "Needs Attention";

  return (
    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
          <Heart className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-white">Health Score</h3>
          <p className="text-blue-200 text-xs">Based on your recent data</p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="10"
              strokeDasharray={`${2 * Math.PI * 40 * score / 100} ${2 * Math.PI * 40}`}
              strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-black text-white">{score}</span>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-xl font-bold text-white mb-1">{label}</p>
          {breakdown.map((b, i) => (
            <div key={i} className="flex items-center justify-between mb-1">
              <p className="text-xs text-blue-200">{b.label}</p>
              <p className="text-xs font-bold text-white">{b.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// AI Health Summary
function AIHealthSummary({ patientName, prescriptions, reports, adherenceRate }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generate = async () => {
    if (loading || generated) return;
    setLoading(true);
    const rxList = prescriptions.map(p => `${p.diagnosis || "Unknown"}: ${p.medicines?.map(m => m.name).join(", ")}`).join("; ");
    const abnormal = reports.flatMap(r => r.results?.filter(res => res.is_abnormal).map(res => `${res.test_name}: ${res.value} ${res.units}`) || []);
    try {
      const result = await InvokeLLM({
        prompt: `You are a health assistant. Create a concise, encouraging health summary for ${patientName}.
Data:
- Prescriptions: ${rxList || "None"}
- Abnormal lab results: ${abnormal.join(", ") || "None"}
- 7-day medication adherence: ${adherenceRate}%

Write 3-4 friendly sentences covering: what areas need attention, what's going well, and one actionable tip.
Keep it under 80 words. Use simple language. Be warm and encouraging. No medical advice disclaimer needed here.`
      });
      setSummary(result);
      setGenerated(true);
    } catch { setSummary("Unable to generate summary right now."); setGenerated(true); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-5 border border-violet-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-100 rounded-2xl flex items-center justify-center">
            <Brain className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">AI Health Summary</h3>
            <p className="text-xs text-gray-500">Personalized insight</p>
          </div>
        </div>
        {!generated && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white rounded-xl text-xs font-semibold disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {loading ? "Generating..." : "Generate"}
          </motion.button>
        )}
      </div>
      {summary ? (
        <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
      ) : (
        <p className="text-sm text-gray-400 italic">Tap generate to get a personalized health summary.</p>
      )}
    </div>
  );
}

// Active Medicines Card
function ActiveMedicinesCard({ prescriptions }) {
  const allMeds = prescriptions.filter(p => p.is_active !== false).flatMap(p => p.medicines || []);
  const categories = [...new Set(allMeds.map(m => m.category).filter(Boolean))];
  const categoryColors = {
    antibiotic: "bg-red-100 text-red-700", painkiller: "bg-orange-100 text-orange-700",
    vitamin: "bg-green-100 text-green-700", supplement: "bg-teal-100 text-teal-700",
    chronic: "bg-purple-100 text-purple-700", other: "bg-gray-100 text-gray-600"
  };

  if (!allMeds.length) return null;

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
          <Pill className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">Active Medicines</h3>
          <p className="text-xs text-gray-500">{allMeds.length} currently prescribed</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {categories.map(cat => (
          <span key={cat} className={`px-3 py-1 rounded-full text-xs font-semibold ${categoryColors[cat] || categoryColors.other}`}>
            {cat} ({allMeds.filter(m => m.category === cat).length})
          </span>
        ))}
      </div>
      <div className="space-y-2">
        {allMeds.slice(0, 6).map((med, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <div>
              <p className="text-sm font-semibold text-gray-900">{med.name}</p>
              {med.strength && <p className="text-xs text-gray-400">{med.strength}</p>}
            </div>
            <p className="text-xs text-gray-500 text-right max-w-[120px] truncate">{med.frequency}</p>
          </div>
        ))}
        {allMeds.length > 6 && <p className="text-xs text-gray-400 text-center pt-1">+{allMeds.length - 6} more</p>}
      </div>
    </div>
  );
}

export default function Insights() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [reports, setReports] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadInitialData(); }, []);
  useEffect(() => { if (selectedPatient) loadPatientData(selectedPatient); }, [selectedPatient]);

  const loadInitialData = async () => {
    try {
      const [me, family] = await Promise.all([User.me(), FamilyMember.list("-created_date")]);
      const myName = me.preferred_name || me.full_name || "Myself";
      const all = [myName, ...family.map(f => f.full_name).filter(Boolean)];
      setPatients([...new Set(all)]);
      setSelectedPatient(all[0]);
    } catch { setPatients(["Myself"]); setSelectedPatient("Myself"); setLoading(false); }
  };

  const loadPatientData = async (name) => {
    setLoading(true);
    try {
      const since = subDays(new Date(), 30).toISOString();
      const [rx, rp, lg] = await Promise.all([
        Prescription.filter({ patient_name: name }, "-created_date", 20),
        HealthReport.filter({ patient_name: name }, "-created_date", 20),
        MedicationLog.filter({ patient_name: name }, "-created_date", 200),
      ]);
      setPrescriptions(rx);
      setReports(rp);
      setLogs(lg);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const recentLogs = logs.filter(l => {
    try { return new Date(l.scheduled_time) >= subDays(new Date(), 7); } catch { return false; }
  });
  const takenCount = recentLogs.filter(l => l.status === "taken").length;
  const totalCount = recentLogs.length;
  const adherenceRate = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;
  const abnormalCount = reports.reduce((sum, r) => sum + (r.results?.filter(res => res.is_abnormal).length || 0), 0);
  const activePrescriptions = prescriptions.filter(p => p.is_active !== false).length;

  const panels = processLabReports(reports);

  const PANEL_CONFIG = {
    VITALS: { title: "Vitals & Biometrics", icon: Heart, color: { bg: "bg-rose-100", text: "text-rose-600" } },
    LIPIDS: { title: "Lipids & Heart Health", icon: Activity, color: { bg: "bg-amber-100", text: "text-amber-600" } },
    METABOLIC: { title: "Blood Sugar & Diabetes", icon: TrendingUp, color: { bg: "bg-blue-100", text: "text-blue-600" } },
    CBC: { title: "Complete Blood Count", icon: FlaskConical, color: { bg: "bg-red-100", text: "text-red-600" } },
    LIVER: { title: "Liver Function", icon: Activity, color: { bg: "bg-orange-100", text: "text-orange-600" } },
    KIDNEY: { title: "Kidney Function", icon: Activity, color: { bg: "bg-cyan-100", text: "text-cyan-600" } },
    THYROID: { title: "Thyroid Profile", icon: Activity, color: { bg: "bg-indigo-100", text: "text-indigo-600" } },
    OTHER: { title: "Other Biomarkers", icon: FlaskConical, color: { bg: "bg-gray-100", text: "text-gray-600" } }
  };

  const healthScore = Math.round(
    (adherenceRate * 0.5) +
    (abnormalCount === 0 ? 30 : Math.max(0, 30 - abnormalCount * 5)) +
    (activePrescriptions > 0 ? 20 : 10)
  );

  const breakdown = [
    { label: "Medication adherence", value: `${adherenceRate}%` },
    { label: "Active prescriptions", value: activePrescriptions },
    { label: "Lab flags", value: abnormalCount === 0 ? "None ✓" : `${abnormalCount} flagged` },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="px-5 pt-5 pb-3 max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Health Insights</h1>
              <p className="text-sm text-gray-400 mt-0.5">Personalized overview</p>
            </div>
            {patients.length > 1 && (
              <select
                value={selectedPatient || ''}
                onChange={e => setSelectedPatient(e.target.value)}
                className="text-sm font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-xl px-3 py-1.5 outline-none max-w-[120px] truncate"
              >
                {patients.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
            {patients.length === 1 && selectedPatient && (
              <span className="text-xs text-gray-400 font-medium">{selectedPatient}</span>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 pb-28 space-y-4 max-w-5xl mx-auto">
        {loading ? (
          <div className="space-y-4">
            {[140, 100, 180, 160].map((h, i) => <div key={i} style={{ height: h }} className="bg-white rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <>
            <HealthScoreCard score={healthScore} breakdown={breakdown} />
            <AIHealthSummary
              patientName={selectedPatient}
              prescriptions={prescriptions}
              reports={reports}
              adherenceRate={adherenceRate}
            />
            <AdherenceChart logs={logs} />
            
            {/* Dynamic Lab Report Panels */}
            {Object.entries(panels).map(([category, results]) => {
              const config = PANEL_CONFIG[category] || PANEL_CONFIG.OTHER;
              return (
                <BiomarkerPanelCard 
                  key={category}
                  title={config.title}
                  icon={config.icon}
                  colorClass={config.color}
                  results={results}
                />
              );
            })}

            <ActiveMedicinesCard prescriptions={prescriptions} />
            {prescriptions.length === 0 && reports.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <FlaskConical className="w-7 h-7 text-gray-400" />
                </div>
                <p className="font-semibold text-gray-700">No data yet</p>
                <p className="text-sm text-gray-400 mt-1">Upload a prescription or report to see insights</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}