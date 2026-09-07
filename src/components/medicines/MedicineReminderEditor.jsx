import React, { useState, useEffect } from 'react';
import { MedicationReminder  } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Calendar, Save, PlusCircle, Trash2, Loader, X } from 'lucide-react';
import { add, format, parseISO } from 'date-fns';

export default function MedicineReminderEditor({ medicine, prescriptionId, patientName, onClose, onSave }) {
  const [reminder, setReminder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchReminder = async () => {
      setLoading(true);
      try {
        const existingReminders = await MedicationReminder.filter({
          prescription_id: prescriptionId,
          medicine_name: medicine.name,
        });
        
        if (existingReminders.length > 0) {
          setReminder(existingReminders[0]);
        } else {
          setReminder({
            prescription_id: prescriptionId,
            patient_name: patientName,
            medicine_name: medicine.name,
            dosage: medicine.dosage,
            reminder_times: ['09:00'],
            start_date: format(new Date(), 'yyyy-MM-dd'),
            duration_days: medicine.duration ? parseInt(medicine.duration.match(/\d+/)?.[0] || '7') : 7,
            is_active: true,
          });
        }
      } catch (error) {
        console.error("Error fetching reminder:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReminder();
  }, [prescriptionId, medicine]);

  const handleFieldChange = (field, value) => {
    setReminder(prev => ({ ...prev, [field]: value }));
  };
  
  const handleTimeChange = (timeIndex, value) => {
    const newTimes = [...(reminder.reminder_times || [])];
    newTimes[timeIndex] = value;
    handleFieldChange('reminder_times', newTimes);
  };

  const addTime = () => {
    const newTimes = [...(reminder.reminder_times || []), '17:00'];
    handleFieldChange('reminder_times', newTimes);
  };

  const removeTime = (timeIndex) => {
    const newTimes = (reminder.reminder_times || []).filter((_, i) => i !== timeIndex);
    handleFieldChange('reminder_times', newTimes);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
        const startDate = reminder.start_date ? parseISO(reminder.start_date) : new Date();
        const duration = reminder.duration_days || 0;
        const endDate = add(startDate, { days: duration });

        const dataToSave = { ...reminder, end_date: format(endDate, 'yyyy-MM-dd') };

        if (reminder.id) {
            await MedicationReminder.update(reminder.id, dataToSave);
        } else {
            await MedicationReminder.create(dataToSave);
        }
        onSave();
    } catch (error) {
        console.error("Error saving reminder:", error);
        alert("Failed to save reminder. Please try again.");
    } finally {
        setSaving(false);
    }
  };

  if (loading) {
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl p-8"><Loader className="w-8 h-8 animate-spin text-blue-500" /></div>
        </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
        <div className="bg-white rounded-t-3xl w-full max-h-[90vh] flex flex-col">
             <div className="sticky top-0 bg-white p-4 border-b border-gray-100 flex items-center justify-between z-10">
                <h2 className="text-xl font-bold text-gray-900">Set Reminder</h2>
                <div className="flex items-center space-x-2">
                    <Button onClick={handleSave} disabled={saving} className="bg-blue-500 hover:bg-blue-600">
                      {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span className="ml-2">{saving ? 'Saving...' : 'Save'}</span>
                    </Button>
                    <button onClick={onClose} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
            </div>

            <div className="overflow-y-auto px-4 pt-4 pb-6">
                {reminder && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-gray-800">{reminder.medicine_name}</h3>
                      {reminder.dosage && <p className="text-gray-500">{reminder.dosage}</p>}
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-3">
                      <Label className="flex items-center mb-1"><Clock className="w-4 h-4 mr-2" /> Reminder Times</Label>
                      <div className="space-y-2">
                          {(reminder.reminder_times || []).map((time, timeIndex) => (
                              <div key={timeIndex} className="flex items-center space-x-2">
                                  <Input type="time" value={time} onChange={(e) => handleTimeChange(timeIndex, e.target.value)} className="flex-grow" />
                                  <Button size="icon" variant="ghost" onClick={() => removeTime(timeIndex)}>
                                      <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                              </div>
                          ))}
                          <Button variant="outline" size="sm" onClick={addTime} className="w-full">
                              <PlusCircle className="w-4 h-4 mr-2" /> Add Time
                          </Button>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-3">
                      <Label className="flex items-center mb-1"><Calendar className="w-4 h-4 mr-2" /> Schedule</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-sm">Start Date</Label>
                            <Input type="date" value={reminder.start_date} onChange={(e) => handleFieldChange('start_date', e.target.value)} />
                        </div>
                        <div>
                            <Label className="text-sm">Duration (days)</Label>
                            <Input type="number" value={reminder.duration_days} onChange={(e) => handleFieldChange('duration_days', parseInt(e.target.value))} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
            </div>
        </div>
    </div>
  );
}