import React, { useState, useEffect } from "react";
import { Prescription  } from "@/entities/all";
import { MedicationReminder  } from "@/entities/all";
import { HealthTask  } from "@/entities/all";
import { InvokeLLM } from "@/integrations/Core";
import { format, parseISO } from "date-fns";
import { X, User, Calendar, Pill, FileText, ExternalLink, Share2, Archive, CheckCircle, Edit, Trash2, MapPin, Phone, Building2, BrainCircuit as Brain, Loader, Bell, FlaskConical } from "lucide-react";
import FileViewer from '../shared/FileViewer';
import MedicineReminderEditor from '../medicines/MedicineReminderEditor';
import MedicineInsightViewer from '../medicines/MedicineInsightViewer';
import { Button } from "@/components/ui/button";

export default function PrescriptionDetail({ prescription, onClose, onUpdate, onEdit, onDelete }) {
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [medicalInsights, setMedicalInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [showMedicineInsightFor, setShowMedicineInsightFor] = useState(null);
  const [extractingTests, setExtractingTests] = useState(false);
  const [linkedTasks, setLinkedTasks] = useState([]);

  useEffect(() => {
    if (prescription?.id) {
      HealthTask.filter({ prescription_id: prescription.id }).then(setLinkedTasks).catch(() => {});
    }
  }, [prescription?.id]);

  const extractRecommendedTests = async () => {
    if (extractingTests) return;
    setExtractingTests(true);
    try {
      const medicinesList = prescription.medicines?.map(m => m.name).join(", ") || "None";
      const todayISO = format(new Date(), "yyyy-MM-dd");
      const prompt = `Based on this prescription, identify any lab tests, investigations, or follow-up actions the doctor recommended or that are clinically indicated for this diagnosis.
Diagnosis: ${prescription.diagnosis || "Not specified"}
Medicines: ${medicinesList}
Doctor notes: ${prescription.notes || "None"}

Return a JSON object with a "tasks" array. Each task must have:
- "title": the test or action name (e.g. "Complete Blood Count", "Follow-up in 2 weeks")
- "type": one of "lab_test", "follow_up", "other"
- "due_date": an ISO date string (yyyy-MM-dd). Recommend a sensible due date relative to today (${todayISO}) — e.g. routine tests within 1-2 weeks, urgent tests sooner, follow-ups per typical practice.
- "notes": a brief reason why this is recommended

Only include genuinely recommended or clearly clinically indicated tasks. If none are indicated, return an empty array.`;
      const result = await InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  type: { type: "string" },
                  due_date: { type: "string" },
                  notes: { type: "string" },
                },
              },
            },
          },
        },
      });
      const tasks = (result.tasks || []).filter(t => t.title);
      if (tasks.length === 0) {
        alert("No recommended tests detected on this prescription. You can add tasks manually from the Dashboard.");
        return;
      }
      const created = await HealthTask.bulkCreate(
        tasks.map(t => ({
          patient_name: prescription.patient_name,
          title: t.title,
          type: ["lab_test", "follow_up", "other"].includes(t.type) ? t.type : "lab_test",
          due_date: t.due_date || null,
          notes: t.notes || "",
          status: "pending",
          prescription_id: prescription.id,
        }))
      );
      setLinkedTasks(prev => [...created, ...prev]);
    } catch (e) {
      console.error("Error extracting tests", e);
      alert("Could not extract tests right now. Try adding manually from the Dashboard.");
    } finally {
      setExtractingTests(false);
    }
  };

  const categoryColors = {
    antibiotic: "bg-red-100 text-red-700",
    painkiller: "bg-orange-100 text-orange-700",
    vitamin: "bg-green-100 text-green-700", 
    supplement: "bg-blue-100 text-blue-700",
    chronic: "bg-purple-100 text-purple-700",
    other: "bg-gray-100 text-gray-700"
  };

  const handleShare = async () => {
    let shareText = `*Prescription for ${prescription.patient_name || 'Patient'}*\n\n`;
    shareText += `*Doctor:* ${prescription.doctor_name || 'N/A'}\n`;
    if (prescription.clinic_name) {
      shareText += `*Clinic:* ${prescription.clinic_name}\n`;
    }
    shareText += `*Date:* ${format(new Date(prescription.prescription_date || prescription.created_date), "MMM d, yyyy")}\n\n`;
    shareText += `*Diagnosis:* ${prescription.diagnosis || 'N/A'}\n\n`;
    shareText += "*Medicines:*\n";
    
    prescription.medicines?.forEach((med, index) => {
      shareText += `*${index + 1}. ${med.name}*\n`;
      shareText += `   - Dosage: ${med.dosage || 'N/A'}\n`;
      shareText += `   - Frequency: ${med.frequency || 'N/A'}\n`;
      shareText += `   - Timing: ${med.timing || 'N/A'}\n`;
      shareText += `   - Duration: ${med.duration || 'N/A'}\n`;
      if(med.instructions) shareText += `   - Instructions: ${med.instructions}\n`;
      shareText += '\n';
    });

    if (prescription.notes) {
        shareText += `*Additional Notes:*\n${prescription.notes}\n`;
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy: ', err);
      // Fallback for very old browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareText;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch (fallbackErr) {
        alert('Unable to copy. Please manually select and copy the text.');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleToggleArchive = async () => {
    setIsUpdating(true);
    try {
      const newIsActive = !prescription.is_active;
      await Prescription.update(prescription.id, { is_active: newIsActive });
      // Cascade: deactivate reminders when archiving so they stop firing
      if (!newIsActive) {
        try {
          await MedicationReminder.updateMany(
            { prescription_id: prescription.id, is_active: true },
            { $set: { is_active: false } }
          );
        } catch (e) {
          console.error("Failed to cascade-deactivate reminders", e);
        }
      }
      onUpdate();
    } catch (error) {
      console.error("Failed to update prescription status", error);
      alert("Could not update prescription. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleCall = (phoneNumber) => {
    if (phoneNumber) window.location.href = `tel:${phoneNumber}`;
  };

  const handleOpenMap = (address) => {
    if (address) window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, '_blank');
  };

  const generateMedicalInsights = async () => {
    if (loadingInsights || medicalInsights) return;
    
    setLoadingInsights(true);
    try {
      const medicinesList = prescription.medicines?.map(med => 
        `${med.name} (${med.dosage || 'N/A'}) - ${med.frequency || 'N/A'} ${med.timing ? '- ' + med.timing : ''}`
      ).join(', ') || 'No medicines listed';

      const insightsPrompt = `
        Provide a comprehensive medical insight based on this prescription. Use this format:

        DIAGNOSIS: ${prescription.diagnosis || 'Not specified'}
        MEDICINES: ${medicinesList}
        DOCTOR NOTES: ${prescription.notes || 'None'}

        Please provide a brief medical summary covering:
        
        **CONDITION OVERVIEW:**
        Explain what the diagnosed condition involves and its common symptoms (2-3 sentences).

        **TREATMENT APPROACH:**
        Explain why these specific medicines were prescribed and how they work together to treat the condition (3-4 sentences).

        **MEDICINE BREAKDOWN:**
        For each medicine, briefly explain its purpose and how it helps treat the condition (1-2 sentences per medicine).

        **IMPORTANT CONSIDERATIONS:**
        Any important side effects, interactions, or lifestyle considerations patients should be aware of.

        Guidelines:
        - Use simple, patient-friendly language
        - Avoid overly technical medical jargon
        - Focus on education, not medical advice
        - Be encouraging and informative
        - Keep response under 400 words
        - Include disclaimer about consulting healthcare provider

        IMPORTANT: Always end with disclaimer that this is educational information only and patients should consult their healthcare provider for medical advice.
      `;

      const insights = await InvokeLLM({
        prompt: insightsPrompt
      });

      setMedicalInsights(insights);
    } catch (error) {
      console.error("Error generating medical insights:", error);
      setMedicalInsights("Unable to generate insights at this time. Please try again later.");
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleReminderSave = () => {
    setEditingReminder(null);
    // Refresh data on the parent page
    if (onUpdate) {
      onUpdate();
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
        <div className="bg-white rounded-t-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-100 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Prescription Details</h2>
              <div className="flex items-center space-x-2">
                {copied && <span className="text-sm text-green-600 font-medium transition-opacity duration-300 hidden sm:inline">Copied!</span>}
                <button
                  onClick={handleShare}
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-full flex items-center justify-center"
                >
                  <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-full flex items-center justify-center"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 pb-40 sm:pb-44">
            {/* Hospital & Doctor Info */}
            <div className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-100 space-y-3 sm:space-y-4">
                {prescription.hospital_name && (
                  <div className="flex items-start space-x-3">
                    <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="font-medium text-gray-900 text-sm sm:text-base break-words">{prescription.hospital_name}</p>
                  </div>
                )}
                <div className="flex items-start space-x-3">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm sm:text-base break-words">{prescription.doctor_name || "Not specified"}</p>
                        {prescription.clinic_name && <p className="text-xs sm:text-sm text-gray-500 break-words">{prescription.clinic_name}</p>}
                    </div>
                </div>
                <div className="flex items-start space-x-3">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="font-medium text-gray-900 text-sm sm:text-base">{format(new Date(prescription.prescription_date || prescription.created_date), "MMM d, yyyy")}</p>
                </div>
                {prescription.doctor_phone && (
                    <button onClick={() => handleCall(prescription.doctor_phone)} className="flex items-start space-x-3 w-full text-left">
                        <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="font-medium text-blue-600 text-sm sm:text-base break-all">{prescription.doctor_phone}</p>
                    </button>
                )}
                {prescription.clinic_address && (
                    <button onClick={() => handleOpenMap(prescription.clinic_address)} className="flex items-start space-x-3 w-full text-left">
                        <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="font-medium text-blue-600 text-xs sm:text-sm break-words">{prescription.clinic_address}</p>
                    </button>
                )}
            </div>

            {/* Medicines */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-3 sm:p-4 border-b border-gray-100">
                <div className="flex items-center space-x-2">
                  <Pill className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                    Medicines ({prescription.medicines?.length || 0})
                  </h3>
                </div>
              </div>
              
              <div className="divide-y divide-gray-100">
                {prescription.medicines?.map((medicine, index) => (
                  <div key={index} className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 space-y-2 sm:space-y-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 mb-1">
                          <h4 className="font-semibold text-gray-900 text-sm sm:text-base break-words">
                            {medicine.name}
                          </h4>
                          {medicine.category && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${
                              categoryColors[medicine.category] || categoryColors.other
                            }`}>
                              {medicine.category}
                            </span>
                          )}
                        </div>
                        {medicine.generic_name && (
                          <p className="text-xs sm:text-sm text-gray-500 mb-2 break-words">
                            {medicine.generic_name}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 flex-shrink-0">
                          <button
                            onClick={() => setShowMedicineInsightFor(medicine)}
                            className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"
                            title="Get AI Insights"
                          >
                            <Brain className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                          {prescription.is_active && (
                            <button
                              onClick={() => setEditingReminder(medicine)}
                              className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors"
                              title="Set/Edit Reminders"
                            >
                              <Bell className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                      {medicine.dosage && (
                        <div>
                          <span className="text-gray-500">Dosage:</span>
                          <span className="ml-1 font-medium break-words">{medicine.dosage}</span>
                        </div>
                      )}
                      {medicine.frequency && (
                        <div>
                          <span className="text-gray-500">Frequency:</span>
                          <span className="ml-1 font-medium break-words">{medicine.frequency}</span>
                        </div>
                      )}
                      {medicine.timing && (
                        <div>
                          <span className="text-gray-500">Timing:</span>
                          <span className="ml-1 font-medium break-words">{medicine.timing}</span>
                        </div>
                      )}
                      {medicine.duration && (
                        <div>
                          <span className="text-gray-500">Duration:</span>
                          <span className="ml-1 font-medium break-words">{medicine.duration}</span>
                        </div>
                      )}
                    </div>
                    
                    {medicine.instructions && (
                      <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                        <p className="text-xs sm:text-sm text-blue-800 break-words">{medicine.instructions}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Diagnosis & Medical Insights */}
            {prescription.diagnosis && (
              <div className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-2 sm:space-y-0">
                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Diagnosis & Medical Insights</h3>
                  {!medicalInsights && !loadingInsights && (
                    <button
                      onClick={generateMedicalInsights}
                      className="flex items-center space-x-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm font-medium hover:bg-blue-200 transition-colors w-fit"
                    >
                      <Brain className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>Get Insights</span>
                    </button>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2 text-sm sm:text-base">Diagnosed Condition:</h4>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded-lg text-sm sm:text-base break-words">{prescription.diagnosis}</p>
                  </div>
                  
                  {loadingInsights && (
                    <div className="flex items-center justify-center py-6 sm:py-8">
                      <div className="flex items-center space-x-3">
                        <Loader className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-blue-500" />
                        <span className="text-blue-600 font-medium text-sm sm:text-base">Generating medical insights...</span>
                      </div>
                    </div>
                  )}
                  
                  {medicalInsights && (
                    <div className="border-t border-gray-100 pt-4">
                      <h4 className="font-medium text-blue-700 mb-3 flex items-center space-x-2 text-sm sm:text-base">
                        <Brain className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>Medical Insights</span>
                      </h4>
                      <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-100">
                        <p className="text-blue-900 whitespace-pre-wrap leading-relaxed text-xs sm:text-sm break-words">{medicalInsights}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recommended Tests & Follow-ups */}
            <div className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base flex items-center">
                  <FlaskConical className="w-4 h-4 sm:w-5 h-5 text-purple-500 mr-2" />
                  Recommended Tests & Follow-ups
                </h3>
                <button
                  onClick={extractRecommendedTests}
                  disabled={extractingTests}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium hover:bg-purple-200 transition-colors disabled:opacity-50 w-fit"
                >
                  {extractingTests ? <Loader className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                  <span>{extractingTests ? "Extracting..." : "Extract with AI"}</span>
                </button>
              </div>
              {linkedTasks.length > 0 ? (
                <div className="space-y-2">
                  {linkedTasks.map(t => (
                    <div key={t.id} className="flex items-center gap-2 p-2.5 bg-purple-50 rounded-lg">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${t.type === 'lab_test' ? 'bg-purple-100 text-purple-700' : t.type === 'follow_up' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                        {t.type === 'lab_test' ? 'Test' : t.type === 'follow_up' ? 'Follow-up' : 'Task'}
                      </span>
                      <p className="text-sm text-gray-800 flex-1 truncate">{t.title}</p>
                      {t.due_date && <span className="text-xs text-gray-500 flex-shrink-0">{format(parseISO(t.due_date), "MMM d")}</span>}
                      {t.status === 'done' && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                    </div>
                  ))}
                  <p className="text-xs text-gray-400 pt-1">You'll get reminders on the Dashboard to do these and upload results.</p>
                </div>
              ) : (
                <p className="text-xs text-gray-400">No tests extracted yet. Use AI to detect recommended tests from this prescription — you'll get reminders to complete them and upload results.</p>
              )}
            </div>

            {/* Additional Notes */}
            {prescription.notes && (
              <div className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Additional Notes</h3>
                <p className="text-gray-700 text-sm sm:text-base break-words">{prescription.notes}</p>
              </div>
            )}

            {/* Original File */}
            {prescription.original_file_url && (
              <div className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">Original Prescription</h3>
                <button
                  onClick={() => setShowFileViewer(true)}
                  className="w-full flex items-center space-x-3 p-3 bg-blue-50 rounded-xl border border-blue-100 text-left"
                >
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-blue-900 text-sm sm:text-base">View Original File</p>
                    <p className="text-xs sm:text-sm text-blue-700">Verify extracted data</p>
                  </div>
                  <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0" />
                </button>
              </div>
            )}
          </div>
          
          <div className="fixed bottom-0 left-0 right-0 pb-20 sm:pb-20 p-3 sm:p-4 bg-white/95 backdrop-blur-lg border-t border-gray-100">
              <div className="flex items-center space-x-2 sm:space-x-3">
                  <Button onClick={onEdit} variant="outline" className="flex-1 text-xs sm:text-sm">
                      <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> Edit
                  </Button>
                  <Button onClick={handleToggleArchive} disabled={isUpdating} variant={prescription.is_active ? "outline" : "default"} className="flex-1 text-xs sm:text-sm">
                      {prescription.is_active ? <><Archive className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> Move to History</> : <><CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> Make Active</>}
                  </Button>
                  <Button onClick={onDelete} variant="destructive" className="flex-1 text-xs sm:text-sm">
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> Delete
                  </Button>
              </div>
          </div>
        </div>
      </div>
      
      {showFileViewer && (
        <FileViewer fileUrl={prescription.original_file_url} onClose={() => setShowFileViewer(false)} />
      )}
      
      {editingReminder && (
        <MedicineReminderEditor
          medicine={editingReminder}
          prescriptionId={prescription.id}
          patientName={prescription.patient_name}
          onClose={() => setEditingReminder(null)}
          onSave={handleReminderSave}
        />
      )}

      {showMedicineInsightFor && (
        <MedicineInsightViewer
            medicine={showMedicineInsightFor}
            onClose={() => setShowMedicineInsightFor(null)}
        />
      )}
    </>
  );
}