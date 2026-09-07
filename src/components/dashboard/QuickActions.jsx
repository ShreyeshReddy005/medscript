import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Camera, Mic } from "lucide-react";

export default function QuickActions() {
  const actions = [
    {
      title: "Scan Prescription",
      subtitle: "Upload & track meds",
      icon: Camera,
      to: createPageUrl("Upload"),
      gradient: "from-blue-500 to-blue-600",
    },
    {
      title: "Start Visit",
      subtitle: "Record & summarize",
      icon: Mic,
      to: "/Visits",
      gradient: "from-violet-500 to-purple-600",
    },
  ];

  return (
    <div className="px-5 pb-4">
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, i) => (
          <motion.div
            key={action.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <Link
              to={action.to}
              className={`flex flex-col items-start gap-3 p-4 bg-gradient-to-br ${action.gradient} text-white rounded-2xl shadow-sm active:scale-95 transition-transform`}
            >
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <action.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm leading-tight">{action.title}</p>
                <p className="text-xs text-white/70 mt-0.5">{action.subtitle}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}