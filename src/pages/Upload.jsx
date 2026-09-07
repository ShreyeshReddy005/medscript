import React, { useState, useEffect } from "react";
import { UploadFile } from "@/integrations/Core";
import { Prescription, HealthReport, User, FamilyMember } from "@/entities/all";
import { processPrescription, processHealthReport, checkDrugInteractions as runDrugInteractionCheck, ExtractionError, isPrescriptionCourseCompleted } from "@/lib/extractionPipeline";
import UploadMethods from "../components/upload/UploadMethods";
import UploadTips from "../components/upload/UploadTips";
import CameraCapture from "../components/upload/CameraCapture.jsx";
import ProcessingView from "../components/upload/ProcessingView.jsx";
import PrescriptionPreview from "../components/upload/PrescriptionPreview.jsx";
import PrescriptionForm from "../components/upload/PrescriptionForm";
import ReminderSetup from "../components/reminders/ReminderSetup";
import UploadTypeSelector from "../components/upload/UploadTypeSelector.jsx";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { AlertTriangle, X, FileText, Pill, ArrowLeft, CheckCircle, Upload as UploadIcon, Camera, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { useRef } from "react";

// Main Upload Component
export default function Upload() {
    const [uploadType, setUploadType] = useState(null); // 'prescription' or 'report'

    if (!uploadType) {
        return <UploadTypeSelector onSelect={setUploadType} />;
    }

    if (uploadType === 'prescription') {
        return <PrescriptionUploader onBack={() => setUploadType(null)} />;
    }
    
    if (uploadType === 'report') {
        return <ReportUploader onBack={() => setUploadType(null)} />;
    }

    return null;
}

// UploadTypeSelector is now a separate component imported above

// Enhanced Prescription Uploader with Multi-File Support
function PrescriptionUploader({ onBack }) {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState("upload");
    const [selectedFile, setSelectedFile] = useState(null);
    const [extractedData, setExtractedData] = useState(null);
    const [savedPrescription, setSavedPrescription] = useState(null);
    const [progress, setProgress] = useState(0);
    const [saving, setSaving] = useState(false);
    const [interactionWarning, setInteractionWarning] = useState(null);
    const [patientProfiles, setPatientProfiles] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState('');
    const [extractionError, setExtractionError] = useState(null);
    const [errorType, setErrorType] = useState(null);

    useEffect(() => {
        loadPatientProfiles();
    }, []);

    const loadPatientProfiles = async () => {
        try {
            const [me, familyMembers] = await Promise.all([
                User.me(),
                FamilyMember.list("-created_date")
            ]);
            
            const myName = me.preferred_name || me.full_name || "Myself";
            const profiles = [
                { name: myName, id: 'self' },
                ...familyMembers.map(fm => ({ name: fm.full_name, id: fm.id }))
            ];
            
            setPatientProfiles(profiles);
            setSelectedPatient(myName); // Default to self
        } catch (error) {
            console.error("Error loading patient profiles:", error);
        }
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            setSelectedFile(files[0]);
            processFiles(files);
        }
    };

    const handleCameraCapture = (file) => {
        setSelectedFile(file);
        processFiles([file]);
    };

    const processFiles = async (files) => {
        setCurrentStep("processing");
        setProgress(0);
        let progressInterval = null;
        try {
            progressInterval = setInterval(() => { setProgress(prev => Math.min(prev + 7, 85)); }, 350);

            // Upload all pages, then let the AI stitch them into one record
            const uploadResults = await Promise.all(files.map(f => UploadFile({ file: f })));
            const fileUrls = uploadResults.map(r => r.file_url);
            setProgress(45);

            const extractedData = await processPrescription(fileUrls);
            clearInterval(progressInterval);
            setProgress(100);

            const finalData = {
                ...extractedData,
                original_file_url: fileUrls[0],
                patient_name: selectedPatient,
                is_active: true
            };
            setExtractedData(finalData);
            setCurrentStep("preview");
        } catch (error) {
            if (progressInterval) clearInterval(progressInterval);
            console.error("Error processing prescription:", error);
            if (error instanceof ExtractionError) {
                setExtractionError(error.message);
                setErrorType(error.type);
            } else {
                setExtractionError("Something went wrong while processing. Please check your connection and try again.");
                setErrorType("general");
            }
            setCurrentStep("error");
        }
    };

    const handleEdit = () => setCurrentStep("edit");
    
    const handleCancel = () => {
        setCurrentStep("upload");
        setSelectedFile(null);
        setExtractedData(null);
        setSavedPrescription(null);
        setProgress(0);
        setExtractionError(null);
        setErrorType(null);
    };

    const handleSaveEdited = (data) => {
        setExtractedData(data);
        setCurrentStep("preview");
    };
  
    const handleSave = async (dataToSave) => {
        setSaving(true);
        try {
            // Auto-archive if the prescription's medication course has already ended
            const finalData = isPrescriptionCourseCompleted(dataToSave)
                ? { ...dataToSave, is_active: false }
                : dataToSave;
            const saved = await Prescription.create(finalData);
            setSavedPrescription(saved);
            await checkDrugInteractions(saved);
            setCurrentStep("reminders");
        } catch (error) {
            console.error("Error saving prescription:", error);
            setExtractionError("Failed to save prescription. Please try again.");
            setCurrentStep("error");
        } finally {
            setSaving(false);
        }
    };

    const checkDrugInteractions = async (newPrescription) => {
        if (!newPrescription?.medicines || newPrescription.medicines.length < 2) return;
        try {
            const interactions = await runDrugInteractionCheck(newPrescription.medicines);
            if (interactions.length > 0) {
                // Save interactions to the prescription record
                await Prescription.update(newPrescription.id, { drug_interactions: interactions });
                const severeOnes = interactions.filter(i => i.severity === "severe");
                const moderateOnes = interactions.filter(i => i.severity === "moderate");
                let warningText = "⚠️ Drug Interaction Alert\n\n";
                if (severeOnes.length > 0) {
                    warningText += "🔴 SEVERE:\n";
                    severeOnes.forEach(i => { warningText += `• ${i.drug_a} + ${i.drug_b}: ${i.description}\n`; });
                    warningText += "\n";
                }
                if (moderateOnes.length > 0) {
                    warningText += "🟡 MODERATE:\n";
                    moderateOnes.forEach(i => { warningText += `• ${i.drug_a} + ${i.drug_b}: ${i.description}\n`; });
                }
                warningText += "\nPlease consult your doctor or pharmacist before taking these medicines together.";
                setInteractionWarning(warningText);
            }
        } catch (e) {
            console.error("Interaction check failed:", e);
        }
    };

    const handleRemindersComplete = () => {
        if (interactionWarning) {
            setCurrentStep("warning");
        } else {
            navigate(createPageUrl("Dashboard"));
        }
    };

    const handleSkipReminders = () => {
        if (interactionWarning) {
            setCurrentStep("warning");
        } else {
            navigate(createPageUrl("Dashboard"));
        }
    };
  
    const closeWarningAndNavigate = () => {
        setInteractionWarning(null);
        navigate(createPageUrl("Dashboard"));
    };

    const renderStep = () => {
        switch(currentStep) {
            case "upload":
                return (
                    <>
                        <div className="px-5 pt-4">
                            <Button variant="ghost" onClick={onBack}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back
                            </Button>
                        </div>
                        
                        {/* Patient Selection */}
                        {patientProfiles.length > 1 && (
                            <div className="px-5 pb-4">
                                <Label>Upload for:</Label>
                                <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select patient" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {patientProfiles.map(profile => (
                                            <SelectItem key={profile.id} value={profile.name}>
                                                {profile.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        
                        <MultiFileUploadMethods 
                            onFileSelect={handleFileSelect} 
                            onCameraClick={() => setCurrentStep("camera")} 
                        />
                        <UploadTips />
                    </>
                );
            case "camera":
                return <CameraCapture onCapture={handleCameraCapture} onCancel={() => setCurrentStep("upload")} />;
            case "processing":
                return <ProcessingView fileName={selectedFile?.name || "prescription"} progress={progress} />;
            case "error":
                return (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
                        <div className={`w-20 h-20 ${errorType === 'not_medical' ? 'bg-orange-100' : 'bg-red-100'} rounded-2xl flex items-center justify-center mx-auto mb-5`}>
                            {errorType === 'not_medical'
                                ? <ShieldAlert className="w-10 h-10 text-orange-500" />
                                : <AlertTriangle className="w-10 h-10 text-red-500" />
                            }
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                            {errorType === 'not_medical' ? 'Not a Medical Document' : 'Extraction Failed'}
                        </h2>
                        <p className="text-gray-500 text-sm leading-relaxed mb-8 max-w-sm">{extractionError}</p>
                        <div className="space-y-3 w-full max-w-xs">
                            <Button onClick={handleCancel} className="w-full bg-blue-600 hover:bg-blue-700">
                                Try Again
                            </Button>
                            <Button variant="outline" onClick={handleCancel} className="w-full">
                                Go Back
                            </Button>
                        </div>
                    </div>
                );
            case "preview":
                return <PrescriptionPreview prescriptionData={extractedData} onEdit={handleEdit} onCancel={handleCancel} onSave={handleSave} saving={saving} />;
            case "edit":
                return <PrescriptionForm initialData={extractedData} onSave={handleSaveEdited} onCancel={() => setCurrentStep("preview")} />;
            case "reminders":
                return <ReminderSetup prescription={savedPrescription} onClose={handleSkipReminders} onSave={handleRemindersComplete} />;
            case "warning":
                return (
                    <DrugInteractionModal warning={interactionWarning} onClose={closeWarningAndNavigate} />
                );
            default:
                return <p>Unknown step</p>;
        }
    };

    return <div className="min-h-screen bg-gray-50"><div className="max-w-5xl mx-auto">{renderStep()}</div></div>;
}

// Enhanced Upload Methods with Multi-File Support
function MultiFileUploadMethods({ onFileSelect, onCameraClick, title = "Upload Document" }) {
    const fileInputRef = React.useRef(null);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    return (
        <div className="px-5 pt-4 pb-6">
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.heic,.webp"
                onChange={onFileSelect}
                multiple
                className="hidden"
            />

            <h2 className="text-xl font-bold text-gray-900 mb-1">{title}</h2>
            <p className="text-sm text-gray-400 mb-5">PDF, JPG, PNG supported · Multiple files at once</p>

            <div className="grid grid-cols-2 gap-3">
                <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={onCameraClick}
                    className="flex flex-col items-center justify-center gap-3 py-7 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200/50"
                >
                    <Camera className="w-8 h-8" />
                    <div className="text-center">
                        <p className="font-bold text-base">Scan</p>
                        <p className="text-xs opacity-75">{isMobile ? 'Use camera' : 'Use webcam'}</p>
                    </div>
                </motion.button>

                <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-3 py-7 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200/50"
                >
                    <UploadIcon className="w-8 h-8" />
                    <div className="text-center">
                        <p className="font-bold text-base">Upload</p>
                        <p className="text-xs opacity-75">Files or photos</p>
                    </div>
                </motion.button>
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-2xl flex items-start gap-3">
                <FileText className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700 leading-relaxed">
                    <strong>Tip:</strong> For best AI accuracy, ensure good lighting, the document fills the frame, and text is sharp. Multiple pages are automatically combined into one record.
                </p>
            </div>
        </div>
    );
}

// Drug Interaction Modal
function DrugInteractionModal({ warning, onClose }) {
    // Parse warning text into structured interactions
    const parseWarning = (text) => {
        if (!text) return { severe: [], moderate: [] };
        const lines = text.split('\n').filter(l => l.trim().startsWith('•'));
        const severe = [];
        const moderate = [];
        let currentSeverity = null;
        text.split('\n').forEach(line => {
            if (line.includes('SEVERE')) currentSeverity = 'severe';
            else if (line.includes('MODERATE')) currentSeverity = 'moderate';
            else if (line.trim().startsWith('•')) {
                const content = line.replace('•', '').trim();
                if (currentSeverity === 'severe') severe.push(content);
                else if (currentSeverity === 'moderate') moderate.push(content);
            }
        });
        return { severe, moderate };
    };

    const { severe, moderate } = parseWarning(warning);

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-red-600 p-5 text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                            <ShieldAlert className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Drug Interaction Alert</h2>
                            <p className="text-orange-100 text-xs mt-0.5">Detected in your prescription</p>
                        </div>
                    </div>
                </div>

                <div className="p-5 space-y-3 max-h-72 overflow-y-auto">
                    {severe.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                                <span className="text-xs font-bold text-red-700 uppercase tracking-wider">Severe</span>
                            </div>
                            {severe.map((item, i) => (
                                <div key={i} className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 mb-2">
                                    <p className="text-sm text-red-900 leading-relaxed">{item}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {moderate.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Moderate</span>
                            </div>
                            {moderate.map((item, i) => (
                                <div key={i} className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-2">
                                    <p className="text-sm text-amber-900 leading-relaxed">{item}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {severe.length === 0 && moderate.length === 0 && (
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{warning}</p>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50">
                    <p className="text-xs text-gray-500 text-center mb-3">Please consult your doctor or pharmacist before taking these medicines together.</p>
                    <button onClick={onClose} className="w-full py-3.5 bg-gray-900 text-white rounded-2xl font-bold text-sm active:scale-95 transition-transform">
                        Understood — Continue
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// Report Uploader (Enhanced similarly)
function ReportUploader({ onBack }) {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState("upload");
    const [selectedFile, setSelectedFile] = useState(null);
    const [progress, setProgress] = useState(0);
    const [extractedData, setExtractedData] = useState(null);
    const [patientProfiles, setPatientProfiles] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState('');
    const [extractionError, setExtractionError] = useState(null);
    const [errorType, setErrorType] = useState(null);

    useEffect(() => {
        loadPatientProfiles();
    }, []);

    const loadPatientProfiles = async () => {
        try {
            const [me, familyMembers] = await Promise.all([
                User.me(),
                FamilyMember.list("-created_date")
            ]);
            
            const myName = me.preferred_name || me.full_name || "Myself";
            const profiles = [
                { name: myName, id: 'self' },
                ...familyMembers.map(fm => ({ name: fm.full_name, id: fm.id }))
            ];
            
            setPatientProfiles(profiles);
            setSelectedPatient(myName);
        } catch (error) {
            console.error("Error loading patient profiles:", error);
        }
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            setSelectedFile(files[0]);
            processFiles(files);
        }
    };

    const handleCameraCapture = (file) => {
        setSelectedFile(file);
        processFiles([file]);
    };

    const processFiles = async (files) => {
        setCurrentStep("processing");
        setProgress(0);
        let progressInterval = null;
        try {
            progressInterval = setInterval(() => { setProgress(prev => Math.min(prev + 7, 85)); }, 350);
            // Upload all pages, then let the AI stitch them into one record
            const uploadResults = await Promise.all(files.map(f => UploadFile({ file: f })));
            const fileUrls = uploadResults.map(r => r.file_url);
            setProgress(45);

            const extractedData = await processHealthReport(fileUrls);
            clearInterval(progressInterval);
            setProgress(100);

            setExtractedData({ ...extractedData, original_file_url: fileUrls[0], patient_name: selectedPatient });
            setCurrentStep("preview");
        } catch (error) {
            if (progressInterval) clearInterval(progressInterval);
            console.error("Error processing report:", error);
            if (error instanceof ExtractionError) {
                setExtractionError(error.message);
                setErrorType(error.type);
            } else {
                setExtractionError("Something went wrong while processing. Please try again.");
                setErrorType("general");
            }
            setCurrentStep("error");
        }
    };

    const handleSave = async (data) => {
        try {
            await HealthReport.create(data);
            navigate(createPageUrl("History"));
        } catch (error) {
            console.error("Failed to save health report:", error);
            setExtractionError("Failed to save health report. Please try again.");
            setCurrentStep("error");
        }
    };

    switch (currentStep) {
        case "upload":
            return (
                <div className="max-w-5xl mx-auto">
                    <div className="p-4">
                        <Button variant="ghost" onClick={onBack}>
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back
                        </Button>
                    </div>
                    
                    {patientProfiles.length > 1 && (
                        <div className="px-4 pb-4">
                            <Label>Upload for:</Label>
                            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select patient" />
                                </SelectTrigger>
                                <SelectContent>
                                    {patientProfiles.map(profile => (
                                        <SelectItem key={profile.id} value={profile.name}>
                                            {profile.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    
                    <MultiFileUploadMethods onFileSelect={handleFileSelect} onCameraClick={() => setCurrentStep("camera")} />
                    <UploadTips />
                </div>
            );
        case "camera":
            return <CameraCapture onCapture={handleCameraCapture} onCancel={() => setCurrentStep("upload")} />;
        case "processing":
            return <ProcessingView fileName={selectedFile?.name || "report"} progress={progress} mode="report" />;
        case "error":
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
                    <div className={`w-20 h-20 ${errorType === 'not_medical' ? 'bg-orange-100' : 'bg-red-100'} rounded-2xl flex items-center justify-center mx-auto mb-5`}>
                        {errorType === 'not_medical'
                            ? <ShieldAlert className="w-10 h-10 text-orange-500" />
                            : <AlertTriangle className="w-10 h-10 text-red-500" />
                        }
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                        {errorType === 'not_medical' ? 'Not a Medical Document' : 'Extraction Failed'}
                    </h2>
                    <p className="text-gray-500 text-sm leading-relaxed mb-8 max-w-sm">{extractionError}</p>
                    <Button onClick={() => { setCurrentStep("upload"); setExtractionError(null); setErrorType(null); }} className="w-full max-w-xs bg-blue-600 hover:bg-blue-700">
                        Try Again
                    </Button>
                </div>
            );
        case "preview":
            return <ReportPreviewForm initialData={extractedData} onSave={handleSave} onCancel={() => setCurrentStep("upload")} />;
        default:
            return <p>Unknown step</p>;
    }
}

// Enhanced Report Preview Form
function ReportPreviewForm({ initialData, onSave, onCancel }) {
    const [data, setData] = useState(initialData);

    const handleSave = () => {
        onSave(data);
    };

    return (
        <div className="p-4 space-y-4">
            <h2 className="text-2xl font-bold">Review Health Report</h2>
            
            <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-4">
                <div>
                    <Label>Report Name</Label>
                    <Input 
                        value={data.report_name || ''} 
                        onChange={(e) => setData({...data, report_name: e.target.value})} 
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label>Report Type</Label>
                        <Select 
                            value={data.report_type || ''} 
                            onValueChange={(value) => setData({...data, report_type: value})}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Lab Result">Lab Result</SelectItem>
                                <SelectItem value="Imaging Scan">Imaging Scan</SelectItem>
                                <SelectItem value="Pathology">Pathology</SelectItem>
                                <SelectItem value="Cardiology">Cardiology</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div>
                        <Label>Report Date</Label>
                        <Input 
                            type="date" 
                            value={data.report_date || ''} 
                            onChange={(e) => setData({...data, report_date: e.target.value})} 
                        />
                    </div>
                </div>

                {data.results && data.results.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Test Results</h3>
                        <div className="space-y-3">
                            {data.results.map((result, index) => (
                                <div key={index} className={`p-3 rounded-lg border ${
                                    result.is_abnormal ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
                                }`}>
                                    <div className="grid grid-cols-4 gap-2">
                                        <div>
                                            <Label className="text-xs">Test</Label>
                                            <p className="font-medium">{result.test_name}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs">Value</Label>
                                            <p className="font-medium">{result.value} {result.units}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs">Reference</Label>
                                            <p className="text-sm">{result.reference_range}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs">Status</Label>
                                            <p className={`text-sm font-medium ${
                                                result.is_abnormal ? 'text-red-600' : 'text-green-600'
                                            }`}>
                                                {result.is_abnormal ? 'Abnormal' : 'Normal'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {data.summary && (
                    <div>
                        <Label>Summary/Impression</Label>
                        <Textarea
                            value={data.summary}
                            onChange={(e) => setData({...data, summary: e.target.value})}
                            rows={3}
                        />
                    </div>
                )}
            </div>

            <div className="flex space-x-2">
                <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
                <Button onClick={handleSave} className="flex-1">Save Report</Button>
            </div>
        </div>
    );
}