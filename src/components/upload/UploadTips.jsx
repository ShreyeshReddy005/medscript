import React from 'react';
import { Lightbulb, Camera, FileText, CheckCircle } from 'lucide-react';

export default function UploadTips() {
  const tips = [
    {
      icon: Camera,
      text: "Use good lighting and avoid shadows"
    },
    {
      icon: FileText,
      text: "Keep the prescription flat and straight"
    },
    {
      icon: CheckCircle,
      text: "Ensure all text is clearly visible"
    }
  ];

  return (
    <div className="px-4 pb-6">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4 border border-blue-100">
        <div className="flex items-center space-x-2 mb-3">
          <Lightbulb className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-blue-900">Tips for Best Results</h3>
        </div>
        <div className="space-y-2">
          {tips.map((tip, index) => (
            <div key={index} className="flex items-center space-x-3">
              <tip.icon className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-blue-800">{tip.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}