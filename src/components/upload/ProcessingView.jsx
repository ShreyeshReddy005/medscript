import React from "react";
import { motion } from "framer-motion";
import { Brain, Scan, CheckCircle, Pill, Sparkles, ShieldCheck } from "lucide-react";

const STAGES = [
  { id: 0, icon: Scan,        label: "Uploading document",          color: "text-blue-500",   bg: "bg-blue-50",   range: [0, 15]  },
  { id: 1, icon: ShieldCheck, label: "Validating document type",   color: "text-emerald-500", bg: "bg-emerald-50", range: [15, 35] },
  { id: 2, icon: Brain,       label: "Reading & extracting data",   color: "text-violet-500", bg: "bg-violet-50", range: [35, 75] },
  { id: 3, icon: Pill,        label: "Cross-checking accuracy",     color: "text-rose-500",   bg: "bg-rose-50",   range: [75, 92] },
  { id: 4, icon: CheckCircle, label: "Finalizing results",          color: "text-green-500",  bg: "bg-green-50",  range: [92, 100] },
];

export default function ProcessingView({ fileName, progress, mode = "prescription" }) {
  const activeStage = STAGES.findLast(s => progress >= s.range[0]) || STAGES[0];
  const isComplete = progress >= 100;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        {/* Central pulse icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className={`w-24 h-24 ${isComplete ? 'bg-green-50' : 'bg-blue-50'} rounded-2xl flex items-center justify-center`}
            >
              {isComplete
                ? <CheckCircle className="w-12 h-12 text-green-500" />
                : <Brain className="w-12 h-12 text-blue-500" />
              }
            </motion.div>
            {/* Orbiting dots */}
            {!isComplete && [0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 bg-blue-400 rounded-full"
                style={{ top: '50%', left: '50%', marginTop: -6, marginLeft: -6 }}
                animate={{
                  x: Math.cos((i * 2 * Math.PI) / 3) * 52,
                  y: Math.sin((i * 2 * Math.PI) / 3) * 52,
                  rotate: [0 + i * 120, 360 + i * 120],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.25, ease: "linear" }}
              />
            ))}
          </div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {isComplete ? 'Analysis Complete!' : mode === "report" ? 'Analysing Report' : 'Analysing Prescription'}
          </h2>
          <p className="text-sm text-gray-400 truncate max-w-xs mx-auto">
            {fileName}
          </p>
        </div>

        {/* Progress bar */}
        <div className="bg-gray-200 rounded-full h-2.5 mb-6 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        {/* Stage list */}
        <div className="space-y-2.5">
          {STAGES.map((stage) => {
            const isDone = progress > stage.range[1];
            const isActive = stage.id === activeStage.id && !isComplete;
            const Icon = stage.icon;

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0.3 }}
                animate={{ opacity: isDone || isActive ? 1 : 0.35 }}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                  isActive ? `${stage.bg} border border-gray-100` :
                  isDone ? 'bg-green-50' : 'bg-white border border-gray-100'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isDone ? 'bg-green-500' : isActive ? stage.bg : 'bg-gray-100'
                }`}>
                  {isDone
                    ? <CheckCircle className="w-5 h-5 text-white" />
                    : <Icon className={`w-5 h-5 ${isActive ? stage.color : 'text-gray-400'}`} />
                  }
                </div>
                <span className={`text-sm font-medium ${
                  isDone ? 'text-green-700 line-through opacity-70' :
                  isActive ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  {stage.label}
                </span>
                {isActive && (
                  <div className="ml-auto flex gap-1">
                    {[0,1,2].map(i => (
                      <motion.div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${stage.color.replace('text-', 'bg-')}`}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Medical-grade AI · Validated & cross-checked · Data stays private
        </p>
      </div>
    </div>
  );
}