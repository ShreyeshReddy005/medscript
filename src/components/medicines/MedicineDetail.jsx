import React, { useState } from "react";
import { InvokeLLM } from "@/integrations/Core";
import { X, Info, AlertTriangle, Pill } from "lucide-react";

export default function MedicineDetail({ medicine, onClose }) {
  const [medicineInfo, setMedicineInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchMedicineInfo = async () => {
    if (hasLoaded) return;
    
    setLoading(true);
    try {
      const result = await InvokeLLM({
        prompt: `Provide detailed medical information about the medicine "${medicine.name}" (generic name: ${medicine.generic_name || medicine.name}). Include: common uses, how it works, typical side effects, important warnings, and drug interactions. Format the response to be informative but easy to understand for patients. Include a disclaimer that this is for informational purposes only.`,
        response_json_schema: {
          type: "object",
          properties: {
            common_uses: { type: "string" },
            how_it_works: { type: "string" },
            common_side_effects: { type: "array", items: { type: "string" } },
            serious_side_effects: { type: "array", items: { type: "string" } },
            important_warnings: { type: "array", items: { type: "string" } },
            drug_interactions: { type: "string" },
            food_interactions: { type: "string" },
            disclaimer: { type: "string" }
          }
        }
      });
      
      setMedicineInfo(result);
      setHasLoaded(true);
    } catch (error) {
      console.error("Error fetching medicine info:", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchMedicineInfo();
  }, []);

  const categoryColors = {
    antibiotic: "bg-red-100 text-red-700 border-red-200",
    painkiller: "bg-orange-100 text-orange-700 border-orange-200",
    vitamin: "bg-green-100 text-green-700 border-green-200",
    supplement: "bg-blue-100 text-blue-700 border-blue-200",
    chronic: "bg-purple-100 text-purple-700 border-purple-200",
    other: "bg-gray-100 text-gray-700 border-gray-200"
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{medicine.name}</h2>
              {medicine.generic_name && medicine.generic_name !== medicine.name && (
                <p className="text-sm text-gray-500">{medicine.generic_name}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Prescription Details */}
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
              <Pill className="w-5 h-5 mr-2" />
              Your Prescription
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-blue-700">Dosage:</span>
                <span className="ml-1 font-medium text-blue-900">{medicine.dosage}</span>
              </div>
              <div>
                <span className="text-blue-700">Frequency:</span>
                <span className="ml-1 font-medium text-blue-900">{medicine.frequency}</span>
              </div>
              {medicine.timing && (
                <div>
                  <span className="text-blue-700">Timing:</span>
                  <span className="ml-1 font-medium text-blue-900">{medicine.timing}</span>
                </div>
              )}
              {medicine.duration && (
                <div>
                  <span className="text-blue-700">Duration:</span>
                  <span className="ml-1 font-medium text-blue-900">{medicine.duration}</span>
                </div>
              )}
            </div>
            {medicine.category && (
              <div className="mt-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                  categoryColors[medicine.category] || categoryColors.other
                }`}>
                  {medicine.category.charAt(0).toUpperCase() + medicine.category.slice(1)}
                </span>
              </div>
            )}
            {medicine.instructions && (
              <div className="mt-3 p-2 bg-blue-100 rounded-lg">
                <p className="text-sm text-blue-800">{medicine.instructions}</p>
              </div>
            )}
          </div>

          {/* Medicine Information */}
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ) : medicineInfo ? (
            <div className="space-y-4">
              {/* Common Uses */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <Info className="w-5 h-5 mr-2 text-blue-500" />
                  Common Uses
                </h3>
                <p className="text-gray-700 text-sm">{medicineInfo.common_uses}</p>
              </div>

              {/* How It Works */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-2">How It Works</h3>
                <p className="text-gray-700 text-sm">{medicineInfo.how_it_works}</p>
              </div>

              {/* Side Effects */}
              {medicineInfo.common_side_effects?.length > 0 && (
                <div className="bg-yellow-50 rounded-2xl p-4 border border-yellow-100">
                  <h3 className="font-semibold text-yellow-900 mb-2 flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Common Side Effects
                  </h3>
                  <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
                    {medicineInfo.common_side_effects.map((effect, index) => (
                      <li key={index}>{effect}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Serious Side Effects */}
              {medicineInfo.serious_side_effects?.length > 0 && (
                <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
                  <h3 className="font-semibold text-red-900 mb-2 flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Serious Side Effects - Seek Medical Attention
                  </h3>
                  <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                    {medicineInfo.serious_side_effects.map((effect, index) => (
                      <li key={index}>{effect}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Interactions */}
              {medicineInfo.drug_interactions && (
                <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
                  <h3 className="font-semibold text-purple-900 mb-2">Drug Interactions</h3>
                  <p className="text-sm text-purple-800">{medicineInfo.drug_interactions}</p>
                </div>
              )}

              {medicineInfo.food_interactions && (
                <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                  <h3 className="font-semibold text-orange-900 mb-2">Food Interactions</h3>
                  <p className="text-sm text-orange-800">{medicineInfo.food_interactions}</p>
                </div>
              )}

              {/* Disclaimer */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <p className="text-xs text-gray-600 italic">
                  {medicineInfo.disclaimer || "This information is for educational purposes only and should not replace professional medical advice. Always consult your healthcare provider before making changes to your medication regimen."}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Unable to load medicine information</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}