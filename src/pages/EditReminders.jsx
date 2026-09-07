import React, { useState, useEffect } from 'react';
import { MedicationReminder  } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Save, Trash2, PlusCircle, ArrowLeft, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function EditReminders() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      const data = await MedicationReminder.filter({ is_active: true }, "-created_date");
      setReminders(data);
    } catch (error) {
      console.error("Error loading reminders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeChange = (reminderId, timeIndex, newTime) => {
    setReminders(prevReminders =>
      prevReminders.map(reminder => {
        if (reminder.id === reminderId) {
          const updatedTimes = [...(reminder.reminder_times || [])];
          updatedTimes[timeIndex] = newTime;
          return { ...reminder, reminder_times: updatedTimes };
        }
        return reminder;
      })
    );
  };

  const handleAddTime = (reminderId) => {
    setReminders(prevReminders =>
      prevReminders.map(reminder => {
        if (reminder.id === reminderId) {
          return { ...reminder, reminder_times: [...(reminder.reminder_times || []), "08:00"] };
        }
        return reminder;
      })
    );
  };

  const handleRemoveTime = (reminderId, timeIndex) => {
    setReminders(prevReminders =>
      prevReminders.map(reminder => {
        if (reminder.id === reminderId) {
          const updatedTimes = [...(reminder.reminder_times || [])];
          updatedTimes.splice(timeIndex, 1);
          return { ...reminder, reminder_times: updatedTimes };
        }
        return reminder;
      })
    );
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      // Save each reminder individually
      for (const reminder of reminders) {
        await MedicationReminder.update(reminder.id, {
          reminder_times: reminder.reminder_times
        });
      }
      toast.success("Reminders updated successfully");
    } catch (error) {
      console.error("Error saving reminders:", error);
      toast.error("Failed to save some reminders");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading reminders...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to={createPageUrl('Home')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex-1">Edit Reminders</h1>
        <Button onClick={saveChanges} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save All"}
        </Button>
      </div>

      {reminders.length === 0 ? (
        <div className="text-center p-12 bg-gray-50 rounded-2xl border border-gray-100">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No active medication reminders found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reminders.map((reminder) => (
            <div key={reminder.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="mb-4">
                <h3 className="font-semibold text-lg text-gray-900">{reminder.medicine_name}</h3>
                <p className="text-sm text-gray-500">
                  {reminder.dosage} • {reminder.frequency}
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reminder Times</Label>
                
                {(reminder.reminder_times || []).map((time, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => handleTimeChange(reminder.id, index, e.target.value)}
                      className="w-32"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemoveTime(reminder.id, index)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleAddTime(reminder.id)}
                  className="mt-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-100"
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Add Time
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}