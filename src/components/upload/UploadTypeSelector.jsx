import React from "react";
import { motion } from "framer-motion";
import { Pill, FileText, Shield, ChevronRight, Clock, FlaskConical, Scan } from "lucide-react";

const RECORD_TYPES = [
  {
    id: 'prescription',
    title: 'Prescription',
    subtitle: 'Scan a doctor\'s prescription',
    description: 'AI extracts all medicines, dosages and sets up smart reminders automatically.',
    icon: Pill,
    iconBg: 'from-blue-500 to-indigo-600',
    iconGlow: 'shadow-blue-200',
    accentBg: 'bg-blue-50',
    accentBorder: 'border-blue-100',
    hoverBorder: 'hover:border-blue-300',
    hoverShadow: 'hover:shadow-blue-100/60',
    tags: [
      { label: 'Auto-extract medicines', color: 'bg-blue-100 text-blue-700' },
      { label: 'Smart reminders', color: 'bg-indigo-100 text-indigo-700' },
      { label: 'Batch upload', color: 'bg-blue-50 text-blue-600' },
    ],
    features: ['Medicines & dosages', 'Drug interactions', 'Reminder setup'],
  },
  {
    id: 'report',
    title: 'Health Report',
    subtitle: 'Upload a lab or medical report',
    description: 'AI reads lab values, flags abnormal results and tracks trends over time.',
    icon: FlaskConical,
    iconBg: 'from-emerald-500 to-teal-600',
    iconGlow: 'shadow-emerald-200',
    accentBg: 'bg-emerald-50',
    accentBorder: 'border-emerald-100',
    hoverBorder: 'hover:border-emerald-300',
    hoverShadow: 'hover:shadow-emerald-100/60',
    tags: [
      { label: 'Abnormal flagging', color: 'bg-emerald-100 text-emerald-700' },
      { label: 'Reference ranges', color: 'bg-teal-100 text-teal-700' },
      { label: 'Trend tracking', color: 'bg-emerald-50 text-emerald-600' },
    ],
    features: ['Lab values & ranges', 'Abnormal detection', 'Doctor\'s report'],
  },
];

export default function UploadTypeSelector({ onSelect }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Hero header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-8 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="text-center"
        >
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <Scan className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Add Medical Record</h1>
          <p className="text-gray-500 mt-1.5 text-sm leading-relaxed max-w-xs mx-auto">
            AI reads your document and extracts all information automatically
          </p>
        </motion.div>
      </div>

      {/* Cards */}
      <div className="flex-1 px-5 pt-5 pb-32 space-y-4 max-w-5xl w-full mx-auto">
        {RECORD_TYPES.map((type, i) => {
          const Icon = type.icon;
          return (
            <motion.button
              key={type.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.35 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(type.id)}
              className={`w-full bg-white rounded-2xl border border-gray-200 ${type.hoverBorder} p-0 text-left shadow-sm hover:shadow-lg ${type.hoverShadow} transition-all overflow-hidden group`}
            >
              {/* Card top accent bar */}
              <div className={`h-1 w-full bg-gradient-to-r ${type.iconBg} opacity-70`} />

              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 bg-gradient-to-br ${type.iconBg} rounded-2xl flex items-center justify-center shadow-lg ${type.iconGlow} flex-shrink-0 group-hover:scale-105 transition-transform`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-gray-900">{type.title}</h2>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    </div>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">{type.subtitle}</p>
                    <p className="text-sm text-gray-600 mt-2 leading-relaxed">{type.description}</p>
                  </div>
                </div>

                {/* Feature list */}
                <div className={`mt-4 ${type.accentBg} rounded-2xl p-3 border ${type.accentBorder}`}>
                  <div className="flex flex-wrap gap-1.5">
                    {type.features.map((f) => (
                      <span key={f} className="flex items-center gap-1 text-xs text-gray-600 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50 inline-block" />
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {type.tags.map(tag => (
                    <span key={tag.label} className={`px-2.5 py-1 rounded-full text-xs font-semibold ${tag.color}`}>
                      {tag.label}
                    </span>
                  ))}
                </div>
              </div>
            </motion.button>
          );
        })}

        {/* Trust signal */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-2 text-gray-400 text-xs pt-2"
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Your medical data is encrypted and never shared</span>
        </motion.div>
      </div>
    </div>
  );
}