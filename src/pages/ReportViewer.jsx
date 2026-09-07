import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Prescription, HealthReport, MedicationLog, User } from "@/entities/all";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import {
  ArrowLeft, Share2, Calendar, User as UserIcon, MapPin, Phone, Building2,
  Pill, Activity, TrendingUp, FileText, Printer, CheckCircle2,
  AlertTriangle, Beaker, ChevronDown
} from "lucide-react";

const categoryColors = {
  antibiotic: { bg: "#FEE2E2", text: "#991B1B", label: "Antibiotic" },
  painkiller: { bg: "#FFEDD5", text: "#9A3412", label: "Painkiller" },
  vitamin:    { bg: "#DCFCE7", text: "#166534", label: "Vitamin" },
  supplement: { bg: "#CCFBF1", text: "#115E59", label: "Supplement" },
  chronic:    { bg: "#EDE9FE", text: "#5B21B6", label: "Chronic" },
  other:      { bg: "#F3F4F6", text: "#374151", label: "Other" },
};

function AdherenceBadge({ rate }) {
  const color = rate >= 80 ? "#16A34A" : rate >= 50 ? "#D97706" : "#DC2626";
  const label = rate >= 80 ? "Excellent" : rate >= 50 ? "Moderate" : "Needs Attention";
  return (
    <span style={{ background: color + "20", color }} className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: color }} />
      {rate}% · {label}
    </span>
  );
}

export default function ReportViewer() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [reportData, setReportData] = useState(null);
  const [adherenceStats, setAdherenceStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [expandedRx, setExpandedRx] = useState({});
  const [expandedReport, setExpandedReport] = useState({});

  useEffect(() => {
    const load = async () => {
      const ids = searchParams.get("ids")?.split(",") || [];
      if (!ids.length) { navigate(createPageUrl("DoctorsReport")); return; }
      try {
        const [rxAll, rpAll, me] = await Promise.all([Prescription.list("-created_date"), HealthReport.list("-created_date"), User.me()]);
        const prescriptions = rxAll.filter(p => ids.includes(p.id));
        const reports = rpAll.filter(r => ids.includes(r.id));

        const adherenceData = {};
        for (const rx of prescriptions) {
          const logs = await MedicationLog.filter({ patient_name: rx.patient_name }, "-created_date", 200);
          const now = new Date();
          const monthLogs = logs.filter(l => {
            try { return isWithinInterval(parseISO(l.scheduled_time), { start: startOfMonth(now), end: endOfMonth(now) }); } catch { return false; }
          });
          const taken = monthLogs.filter(l => l.status === "taken").length;
          adherenceData[rx.id] = { total: monthLogs.length, taken, rate: monthLogs.length > 0 ? Math.round((taken / monthLogs.length) * 100) : null };
        }
        setReportData({ prescriptions, reports });
        setAdherenceStats(adherenceData);
        setPatient(me);
        setExpandedRx(prescriptions.reduce((a, p) => ({ ...a, [p.id]: true }), {}));
        setExpandedReport(reports.reduce((a, r) => ({ ...a, [r.id]: true }), {}));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [searchParams, navigate]);

  const handlePrint = () => {
    const el = document.getElementById("report-content");
    const original = document.body.innerHTML;
    document.body.innerHTML = `<style>body{font-family:Arial,sans-serif;margin:0;padding:20px} .no-print{display:none!important}</style>` + el.innerHTML;
    window.print();
    document.body.innerHTML = original;
    window.location.reload();
  };

  const handleShare = async () => {
    if (!reportData) return;
    let txt = `MEDICAL REPORT — ${format(new Date(), "MMM d, yyyy")}\nPatient: ${reportData.prescriptions[0]?.patient_name || patient?.full_name || "N/A"}\n\n`;
    reportData.prescriptions.forEach((rx, i) => {
      txt += `PRESCRIPTION ${i + 1}\nDoctor: ${rx.doctor_name || "N/A"}\nDate: ${format(new Date(rx.prescription_date || rx.created_date), "MMM d, yyyy")}\n`;
      if (rx.diagnosis) txt += `Diagnosis: ${rx.diagnosis}\n`;
      txt += `Medicines: ${rx.medicines.map(m => m.name).join(", ")}\n\n`;
    });
    reportData.reports.forEach(rp => {
      txt += `${rp.report_type}: ${rp.report_name}\nDate: ${format(new Date(rp.report_date || rp.created_date), "MMM d, yyyy")}\n`;
      const ab = rp.results?.filter(r => r.is_abnormal) || [];
      if (ab.length) txt += `Abnormal: ${ab.map(r => `${r.test_name} (${r.value} ${r.units})`).join(", ")}\n`;
      txt += "\n";
    });
    try { await navigator.clipboard.writeText(txt); alert("Report copied to clipboard!"); } catch { }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 px-5 pt-4 pb-24">
        <div className="animate-pulse space-y-4 max-w-5xl mx-auto">
          {[80, 40, 120, 60].map((h, i) => <div key={i} style={{ height: h }} className="bg-gray-200 rounded-2xl" />)}
        </div>
      </div>
    );
  }
  if (!reportData) return null;

  const patientName = reportData.prescriptions[0]?.patient_name || patient?.preferred_name || patient?.full_name || "Patient";
  const totalAbnormal = reportData.reports.reduce((sum, r) => sum + (r.results?.filter(x => x.is_abnormal).length || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="no-print bg-white border-b border-gray-100 px-5 py-3 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(createPageUrl("DoctorsReport"))} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
              <ArrowLeft className="w-4 h-4 text-gray-700" />
            </button>
            <div>
              <p className="text-sm font-bold text-gray-900">Medical Report</p>
              <p className="text-xs text-gray-500">{patientName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 rounded-xl text-xs font-semibold text-gray-700">
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
            <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">
              <Printer className="w-3.5 h-3.5" /> Print / PDF
            </button>
          </div>
        </div>
      </div>

      <div id="report-content" className="max-w-5xl mx-auto px-5 pt-4 pb-24 space-y-6">

        {/* Cover */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-1">Medical Report</p>
              <h1 className="text-2xl font-bold">{patientName}</h1>
              <p className="text-blue-200 text-sm mt-1">Generated {format(new Date(), "MMMM d, yyyy")}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/15 rounded-2xl p-3 text-center">
              <p className="text-xl font-bold">{reportData.prescriptions.length}</p>
              <p className="text-blue-200 text-xs">Prescriptions</p>
            </div>
            <div className="bg-white/15 rounded-2xl p-3 text-center">
              <p className="text-xl font-bold">{reportData.reports.length}</p>
              <p className="text-blue-200 text-xs">Lab Reports</p>
            </div>
            <div className={`rounded-2xl p-3 text-center ${totalAbnormal > 0 ? "bg-red-500/30" : "bg-white/15"}`}>
              <p className="text-xl font-bold">{totalAbnormal}</p>
              <p className="text-blue-200 text-xs">Abnormal Results</p>
            </div>
          </div>
        </div>

        {/* Abnormal summary */}
        {totalAbnormal > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="font-bold text-red-800">Abnormal Results Summary</h3>
            </div>
            <div className="space-y-2">
              {reportData.reports.flatMap(r =>
                (r.results?.filter(res => res.is_abnormal) || []).map((res, i) => (
                  <div key={`${r.id}-${i}`} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-red-100">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{res.test_name}</p>
                      <p className="text-xs text-gray-500">{r.report_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-700">{res.value} {res.units}</p>
                      {res.reference_range && <p className="text-xs text-gray-400">Ref: {res.reference_range}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Prescriptions */}
        {reportData.prescriptions.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                <Pill className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Prescriptions</h2>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{reportData.prescriptions.length}</span>
            </div>
            <div className="space-y-4">
              {reportData.prescriptions.map((rx, idx) => {
                const stats = adherenceStats[rx.id];
                const isOpen = expandedRx[rx.id];
                return (
                  <div key={rx.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    <button onClick={() => setExpandedRx(p => ({ ...p, [rx.id]: !p[rx.id] }))} className="w-full flex items-start justify-between p-5 text-left">
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Rx #{idx + 1}</span>
                          <span className="text-xs text-gray-400">{format(new Date(rx.prescription_date || rx.created_date), "MMM d, yyyy")}</span>
                          {stats?.rate !== null && stats?.rate !== undefined && <AdherenceBadge rate={stats.rate} />}
                        </div>
                        <p className="font-bold text-gray-900">{rx.doctor_name || "Unknown Doctor"}</p>
                        {rx.clinic_name && <p className="text-xs text-gray-500">{rx.clinic_name}</p>}
                        {rx.diagnosis && <p className="text-xs text-blue-700 font-medium mt-1">Dx: {rx.diagnosis}</p>}
                      </div>
                      <div className={`w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}>
                        <ChevronDown className="w-4 h-4 text-gray-600" />
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                          {rx.hospital_name && <div className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-gray-400" />{rx.hospital_name}</div>}
                          {rx.doctor_phone && <div className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-gray-400" />{rx.doctor_phone}</div>}
                          {rx.clinic_address && <div className="flex items-start gap-1"><MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5" />{rx.clinic_address}</div>}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Medicines ({rx.medicines.length})</h4>
                          <div className="space-y-2">
                            {rx.medicines.map((med, i) => {
                              const cc = categoryColors[med.category] || categoryColors.other;
                              return (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: cc.bg + "80" }}>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-900">{med.name}</p>
                                    <div className="flex flex-wrap gap-x-3 mt-0.5">
                                      {med.dosage && <span className="text-xs text-gray-600">{med.dosage}</span>}
                                      {med.frequency && <span className="text-xs text-gray-600">{med.frequency}</span>}
                                      {med.timing && <span className="text-xs text-gray-600">{med.timing}</span>}
                                      {med.duration && <span className="text-xs text-gray-600">for {med.duration}</span>}
                                    </div>
                                  </div>
                                  <span className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ background: cc.bg, color: cc.text }}>{cc.label}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {stats && stats.total > 0 && (
                          <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className="w-4 h-4 text-green-600" />
                              <span className="text-xs font-bold text-green-800">Medication Adherence (Past Month)</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div><p className="text-2xl font-bold text-green-700">{stats.rate}%</p><p className="text-xs text-green-600">Adherence rate</p></div>
                              <div><p className="text-2xl font-bold text-green-700">{stats.taken}/{stats.total}</p><p className="text-xs text-green-600">Doses taken</p></div>
                              <div className="flex-1"><div className="h-2 bg-green-200 rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: `${stats.rate}%` }} /></div></div>
                            </div>
                          </div>
                        )}
                        {rx.notes && (
                          <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                            <p className="text-xs font-bold text-amber-800 mb-1">Doctor's Notes</p>
                            <p className="text-sm text-amber-700">{rx.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Health Reports */}
        {reportData.reports.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
                <Beaker className="w-4 h-4 text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Lab Reports</h2>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">{reportData.reports.length}</span>
            </div>
            <div className="space-y-4">
              {reportData.reports.map((rp) => {
                const abnormal = rp.results?.filter(r => r.is_abnormal) || [];
                const normal = rp.results?.filter(r => !r.is_abnormal) || [];
                const isOpen = expandedReport[rp.id];
                return (
                  <div key={rp.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    <button onClick={() => setExpandedReport(p => ({ ...p, [rp.id]: !p[rp.id] }))} className="w-full flex items-start justify-between p-5 text-left">
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">{rp.report_type}</span>
                          <span className="text-xs text-gray-400">{format(new Date(rp.report_date || rp.created_date), "MMM d, yyyy")}</span>
                          {abnormal.length > 0 && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />{abnormal.length} abnormal
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-gray-900">{rp.report_name}</p>
                        {rp.lab_name && <p className="text-xs text-gray-500">{rp.lab_name}</p>}
                      </div>
                      <div className={`w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}>
                        <ChevronDown className="w-4 h-4 text-gray-600" />
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                        {rp.ordering_physician && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <UserIcon className="w-3.5 h-3.5 text-gray-400" />Ordered by Dr. {rp.ordering_physician}
                          </div>
                        )}
                        {abnormal.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Abnormal ({abnormal.length})</h4>
                            <div className="space-y-1.5">
                              {abnormal.map((r, i) => (
                                <div key={i} className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                                  <p className="text-sm font-semibold text-red-800 flex-1 min-w-0 truncate">{r.test_name}</p>
                                  <div className="text-right flex-shrink-0 ml-2">
                                    <p className="text-sm font-bold text-red-700">{r.value} {r.units}</p>
                                    {r.reference_range && <p className="text-xs text-gray-400">Ref: {r.reference_range}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {normal.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Normal ({normal.length})</h4>
                            <div className="grid grid-cols-2 gap-1.5">
                              {normal.map((r, i) => (
                                <div key={i} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                                  <p className="text-xs text-gray-700 truncate flex-1">{r.test_name}</p>
                                  <p className="text-xs font-bold text-gray-900 ml-1 flex-shrink-0">{r.value} {r.units}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {rp.summary && (
                          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                            <p className="text-xs font-bold text-blue-800 mb-1">Summary / Impression</p>
                            <p className="text-sm text-blue-700">{rp.summary}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="text-center text-gray-400 text-xs pt-4 pb-8 border-t border-gray-200">
          <p className="font-semibold">Generated by MedScript</p>
          <p>{format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</p>
          <p className="mt-2 text-gray-300">This document is for medical reference only. Consult your physician for medical advice.</p>
        </div>
      </div>
    </div>
  );
}