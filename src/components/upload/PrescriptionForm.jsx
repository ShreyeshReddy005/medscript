import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, PlusCircle, Trash2, User } from 'lucide-react';
import { Prescription } from "@/entities/Prescription";

const medicineCategories = ["antibiotic", "painkiller", "vitamin", "supplement", "chronic", "other"];

export default function PrescriptionForm({ initialData, onSave, onCancel }) {
  const [formData, setFormData] = useState(initialData);
  const [existingPatients, setExistingPatients] = useState([]);
  const [showNewPatientInput, setShowNewPatientInput] = useState(false);

  useEffect(() => {
    loadExistingPatients();
  }, []);

  const loadExistingPatients = async () => {
    try {
      const allPrescriptions = await Prescription.list("-created_date");
      const uniquePatients = [...new Set(allPrescriptions.map(p => p.patient_name).filter(Boolean))];
      setExistingPatients(uniquePatients);
    } catch (error) {
      console.error("Error loading existing patients:", error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePatientChange = (value) => {
    if (value === "new_patient") {
      setShowNewPatientInput(true);
      setFormData(prev => ({ ...prev, patient_name: "" }));
    } else {
      setShowNewPatientInput(false);
      setFormData(prev => ({ ...prev, patient_name: value }));
    }
  };

  const handleMedicineChange = (index, field, value) => {
    const newMedicines = [...formData.medicines];
    newMedicines[index] = { ...newMedicines[index], [field]: value };
    setFormData(prev => ({ ...prev, medicines: newMedicines }));
  };

  const addMedicine = () => {
    const newMedicines = [...formData.medicines, { name: '', dosage: '', frequency: '', timing: '', duration: '', category: 'other' }];
    setFormData(prev => ({ ...prev, medicines: newMedicines }));
  };

  const removeMedicine = (index) => {
    const newMedicines = formData.medicines.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, medicines: newMedicines }));
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      <div className="px-5 py-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Edit Prescription</h2>
        </div>

        <div className="space-y-6">
          {/* Patient Selection */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <User className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900">Patient Information</h3>
            </div>
            
            <div>
              <Label htmlFor="patient_select">Select Patient</Label>
              <Select 
                value={showNewPatientInput ? "new_patient" : formData.patient_name || ""} 
                onValueChange={handlePatientChange}
              >
                <SelectTrigger id="patient_select">
                  <SelectValue placeholder="Choose existing or create new patient" />
                </SelectTrigger>
                <SelectContent>
                  {existingPatients.map(patient => (
                    <SelectItem key={patient} value={patient}>{patient}</SelectItem>
                  ))}
                  <SelectItem value="new_patient">+ Add New Patient</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showNewPatientInput && (
              <div>
                <Label htmlFor="new_patient_name">New Patient Name</Label>
                <Input 
                  id="new_patient_name"
                  value={formData.patient_name || ''} 
                  onChange={(e) => handleInputChange('patient_name', e.target.value)}
                  placeholder="Enter patient name"
                />
              </div>
            )}
          </div>

          {/* General Info */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-4">
            <div>
              <Label htmlFor="doctor_name">Doctor's Name</Label>
              <Input id="doctor_name" value={formData.doctor_name || ''} onChange={(e) => handleInputChange('doctor_name', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="clinic_name">Clinic Name</Label>
              <Input id="clinic_name" value={formData.clinic_name || ''} onChange={(e) => handleInputChange('clinic_name', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="prescription_date">Prescription Date</Label>
              <Input id="prescription_date" type="date" value={formData.prescription_date || ''} onChange={(e) => handleInputChange('prescription_date', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="diagnosis">Diagnosis</Label>
              <Input id="diagnosis" value={formData.diagnosis || ''} onChange={(e) => handleInputChange('diagnosis', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea id="notes" value={formData.notes || ''} onChange={(e) => handleInputChange('notes', e.target.value)} />
            </div>
          </div>

          {/* Medicines */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Medicines</h3>
            <div className="space-y-4">
              {formData.medicines.map((med, index) => (
                <div key={index} className="bg-white p-4 rounded-2xl border border-gray-100 space-y-3 relative">
                  <button onClick={() => removeMedicine(index)} className="absolute top-2 right-2 p-1 bg-red-100 rounded-full">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                  <h4 className="font-semibold text-gray-800">Medicine #{index + 1}</h4>
                  <div>
                    <Label>Name</Label>
                    <Input value={med.name || ''} onChange={(e) => handleMedicineChange(index, 'name', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Dosage</Label><Input value={med.dosage || ''} onChange={(e) => handleMedicineChange(index, 'dosage', e.target.value)} /></div>
                    <div><Label>Frequency</Label><Input value={med.frequency || ''} onChange={(e) => handleMedicineChange(index, 'frequency', e.target.value)} /></div>
                    <div><Label>Timing</Label><Input value={med.timing || ''} onChange={(e) => handleMedicineChange(index, 'timing', e.target.value)} /></div>
                    <div><Label>Duration</Label><Input value={med.duration || ''} onChange={(e) => handleMedicineChange(index, 'duration', e.target.value)} /></div>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={med.category || 'other'} onValueChange={(value) => handleMedicineChange(index, 'category', value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {medicineCategories.map(cat => <SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addMedicine} className="w-full flex items-center justify-center gap-2">
                <PlusCircle className="w-4 h-4" /> Add Medicine
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-white border-t border-gray-100">
        <div className="flex space-x-3">
          <button onClick={onCancel} className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 bg-gray-100 text-gray-700 rounded-full font-medium">
            <X className="w-4 h-4" /><span>Cancel</span>
          </button>
          <button onClick={() => onSave(formData)} className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 bg-blue-500 text-white rounded-full font-medium">
            <Save className="w-4 h-4" /><span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
}