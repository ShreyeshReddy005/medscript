import React, { useEffect, useState } from 'react';
import { MedicationReminder, MedicationLog  } from "@/entities/all";
import { format, parseISO, isFuture, isToday, differenceInMinutes } from 'date-fns';
import { Bell, Check, SkipForward, X } from 'lucide-react';

export default function NotificationManager({ patientName }) {
  const [activeNotification, setActiveNotification] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (patientName) {
      loadReminders();
    }
  }, [patientName]);

  useEffect(() => {
    if (reminders.length > 0) {
      // Check for notifications every 30 seconds for better accuracy
      const interval = setInterval(checkForNotifications, 30000);
      
      // Check immediately
      checkForNotifications();
      
      return () => clearInterval(interval);
    }
  }, [reminders, logs]);

  const loadReminders = async () => {
    try {
      const [remindersData, logsData] = await Promise.all([
        MedicationReminder.filter({ patient_name: patientName, is_active: true }),
        MedicationLog.filter({ patient_name: patientName }, "-created_date", 100)
      ]);
      setReminders(remindersData);
      setLogs(logsData);
    } catch (error) {
      console.error("Error loading reminders:", error);
    }
  };

  const checkForNotifications = () => {
    const now = new Date();
    const currentTime = format(now, 'HH:mm');
    const todayString = format(now, 'yyyy-MM-dd');

    // Find reminders for current time (within 2 minutes window)
    const dueReminders = reminders.filter(reminder => {
      // Skip reminders whose course has ended or not yet started
      if (reminder.end_date && reminder.end_date < todayString) return false;
      if (reminder.start_date && reminder.start_date > todayString) return false;

      return reminder.reminder_times.some(time => {
        const scheduledDateTime = `${todayString}T${time}:00`;
        const scheduledTime = parseISO(scheduledDateTime);
        
        // Check if it's within 2 minutes of scheduled time and not already logged
        const timeDifference = Math.abs(differenceInMinutes(now, scheduledTime));
        const isAlreadyLogged = logs.some(log => 
          log.reminder_id === reminder.id && 
          log.scheduled_time === scheduledDateTime
        );
        
        return timeDifference <= 2 && !isAlreadyLogged && isToday(scheduledTime);
      });
    });

    if (dueReminders.length > 0 && !activeNotification) {
      const reminder = dueReminders[0];
      const currentScheduledTime = `${todayString}T${currentTime}:00`;
      
      setActiveNotification({
        ...reminder,
        scheduled_time: currentScheduledTime,
        time_only: currentTime
      });

      // Request notification permission and show browser notification
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(`💊 Time for ${reminder.medicine_name}`, {
            body: `${reminder.dosage} - Scheduled for ${currentTime}`,
            icon: '/favicon.ico',
            tag: reminder.id
          });
        } else if (Notification.permission === 'default') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification(`💊 Time for ${reminder.medicine_name}`, {
                body: `${reminder.dosage} - Scheduled for ${currentTime}`,
                icon: '/favicon.ico',
                tag: reminder.id
              });
            }
          });
        }
      }
    }
  };

  const handleTake = async (reminder) => {
    try {
      const newLogEntry = {
        reminder_id: reminder.id,
        patient_name: reminder.patient_name,
        medicine_name: reminder.medicine_name,
        scheduled_time: reminder.scheduled_time,
        taken_time: new Date().toISOString(),
        status: "taken"
      };
      await MedicationLog.create(newLogEntry);
      setActiveNotification(null);
      await loadReminders(); // Refresh data
    } catch (error) {
      console.error("Error logging medication:", error);
    }
  };

  const handleSkip = async (reminder) => {
    try {
      const newLogEntry = {
        reminder_id: reminder.id,
        patient_name: reminder.patient_name,
        medicine_name: reminder.medicine_name,
        scheduled_time: reminder.scheduled_time,
        taken_time: null,
        status: "skipped"
      };
      await MedicationLog.create(newLogEntry);
      setActiveNotification(null);
      await loadReminders(); // Refresh data
    } catch (error) {
      console.error("Error logging medication:", error);
    }
  };

  const handleDismiss = () => {
    setActiveNotification(null);
  };

  if (!activeNotification) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-slide-down">
      <div className="bg-white rounded-2xl p-4 border border-blue-200 shadow-xl max-w-sm mx-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Bell className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Medicine Time</p>
              <p className="text-xs text-gray-500">{activeNotification.time_only}</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="mb-4">
          <h4 className="font-semibold text-gray-900">{activeNotification.medicine_name}</h4>
          <p className="text-sm text-gray-600">{activeNotification.dosage}</p>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => handleTake(activeNotification)}
            className="flex-1 flex items-center justify-center space-x-2 py-2 px-3 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>Take</span>
          </button>
          <button
            onClick={() => handleSkip(activeNotification)}
            className="flex-1 flex items-center justify-center space-x-2 py-2 px-3 bg-gray-500 text-white rounded-xl text-sm font-medium hover:bg-gray-600 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
            <span>Skip</span>
          </button>
        </div>
      </div>
    </div>
  );
}