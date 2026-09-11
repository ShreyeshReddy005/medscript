import React from 'react';
import { AlertCircle, CheckCircle, Activity, Stethoscope, Lightbulb, ChevronRight, HelpCircle } from 'lucide-react';

export default function DeepInsightCard({ insight }) {
  const { title, severity, simple_analogy, what_it_means, possible_causes, action_plan, doctor_questions } = insight;

	  const severityColors = {
	    monitor: "bg-yellow-100 text-yellow-800 border-yellow-200",
	    abnormal: "bg-orange-100 text-orange-800 border-orange-200",
	    critical: "bg-red-100 text-red-800 border-red-200",
	  };

	  const currentSeverityColor = severityColors[severity] || severityColors.monitor;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden mt-6 mb-6">
      (* Header *)
      <div className="bg-slate-900 text-white p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-2xl font-bold">{title}</h3>
            {severity && (
              <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${currentSeverityColor}`}>
                {severity}
              </span>
            )}
          </div>
          {what_it_means && (
            <p className="text-slate-300 mt-2 text-sm leading-relaxed max-w-2xl">
              {what_it_means}
            </p>
          )}
        </div>
      </div>

      <div className="p-6 space-y-8">
        (* Simple Analogy *)
        {simple_analogy && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-start gap-4">
            <div className="bg-blue-100 p-2 rounded-full text-blue-600 shrink-0">
              <Lightbulb className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-blue-900 uppercase tracking-wide mb-1">The Simple Version</h4>
              <p className="text-blue-800 italic leading-relaxed">
                "{simple_analogy}"
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          (* Causes *)
          {possible_causes && possible_causes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <HelpCircle className="w-5 h-5 text-slate-400" />
                <h4 className="font-bold text-slate-800">Why might this be happening?</h4>
              </div>
              <ul className="space-y-3">
                {possible_causes.map((cause, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0"></div>
                    <span>{cause}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          (* Action Plan *)
          {action_plan && action_plan.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-emerald-500" />
                <h4 className="font-bold text-slate-800">What you can do</h4>
              </div>
              <ul className="space-y-3">
                {action_plan.map((action, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-600 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/50">
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        (* Doctor Questions *)
        {doctor_questions && doctor_questions.length > 0 && (
          <div className="pt-6 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Stethoscope className="w-5 h-5 text-blue-500" />
              <h4 className="font-bold text-slate-800">Questions for your Doctor</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {doctor_questions.map((q, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between group hover:bg-white hover:border-blue-200 transition-colors cursor-default">
                  <p className="text-sm text-slate-700 pr-4">{q}</p>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 shrink-0 transition-colors" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
