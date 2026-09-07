import React, { useState, useEffect } from 'react';
import { InvokeLLM } from '@/integrations/Core';
import { BrainCircuit, Loader, X, AlertTriangle } from 'lucide-react';

export default function MedicineInsightViewer({ medicine, onClose }) {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const generateInsight = async () => {
      setLoading(true);
      setError(null);
      const prompt = `
        For the medicine "${medicine.name}" (dosage: ${medicine.dosage || 'not specified'}), provide a patient-friendly educational summary. 
        Structure the response as a JSON object with the following keys:
        - "purpose": A simple explanation of what this medicine is used for.
        - "how_it_works": A non-technical description of how it helps.
        - "side_effects": A bulleted list of common potential side effects.
        - "key_considerations": A bulleted list of crucial advice (e.g., "Take with food," "Avoid alcohol," "Finish the full course").

        IMPORTANT: Keep the language simple and clear. This is for a patient, not a doctor. 
        Start the summary with a disclaimer that this is not medical advice and they should consult their healthcare provider.
      `;
      try {
        const response = await InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              purpose: { type: "string" },
              how_it_works: { type: "string" },
              side_effects: { type: "array", items: { type: "string" } },
              key_considerations: { type: "array", items: { type: "string" } },
            },
          },
        });
        setInsight(response);
      } catch (err) {
        console.error("Error generating medicine insight:", err);
        setError("Unable to generate insights at this time. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    generateInsight();
  }, [medicine]);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
             <BrainCircuit className="w-6 h-6 text-blue-500" />
             <h2 className="text-xl font-bold text-gray-900">AI Insights</h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6">
            <div className="text-center mb-6">
                 <h3 className="text-2xl font-bold text-gray-800">{medicine.name}</h3>
                 {medicine.dosage && <p className="text-gray-500">{medicine.dosage}</p>}
            </div>

            {loading && (
                 <div className="flex flex-col items-center justify-center py-10 space-y-3">
                    <Loader className="w-8 h-8 animate-spin text-blue-500" />
                    <p className="text-blue-600 font-medium">Analyzing medicine information...</p>
                 </div>
            )}

            {error && (
                 <div className="bg-red-50 p-4 rounded-lg text-center">
                    <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <p className="text-red-700 font-medium">{error}</p>
                 </div>
            )}

            {insight && (
                <div className="space-y-6">
                    <div className="p-1 bg-yellow-100 text-yellow-800 text-sm text-center rounded-lg">
                        Disclaimer: This is AI-generated educational content, not medical advice. Always consult your doctor.
                    </div>

                    <div>
                        <h4 className="font-semibold text-lg text-gray-800 mb-2">Purpose</h4>
                        <p className="text-gray-700">{insight.purpose}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-lg text-gray-800 mb-2">How it Works</h4>
                        <p className="text-gray-700">{insight.how_it_works}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-lg text-gray-800 mb-2">Common Side Effects</h4>
                        <ul className="list-disc list-inside text-gray-700 space-y-1">
                            {insight.side_effects.map((effect, i) => <li key={i}>{effect}</li>)}
                        </ul>
                    </div>
                     <div>
                        <h4 className="font-semibold text-lg text-gray-800 mb-2">Key Considerations</h4>
                        <ul className="list-disc list-inside text-gray-700 space-y-1">
                            {insight.key_considerations.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}