import React, { useState, useEffect } from "react";
import { Prescription, MedicationReminder, MedicationLog, User, FamilyMember  } from "@/entities/all";
import { isFuture, parseISO, format } from "date-fns";
import WelcomeHeader from "../components/dashboard/WelcomeHeader.jsx";
import PatientSwitcher from "../components/dashboard/PatientSwitcher.jsx";
import NextDoses from "../components/dashboard/NextDoses.jsx";
import TodaysMedications from "../components/dashboard/TodaysMedications.jsx";
import RecentPrescriptions from "../components/dashboard/RecentPrescriptions.jsx";
import QuickStats from "../components/dashboard/QuickStats.jsx";
import MedicationsView from "../components/dashboard/MedicationsView.jsx";
import HealthTasks from "../components/dashboard/HealthTasks.jsx";
import RefillReminders from "../components/dashboard/RefillReminders.jsx";
import QuickActions from "../components/dashboard/QuickActions.jsx";
import NotificationManager from "../components/reminders/NotificationManager";
import TaskNotifications from "../components/reminders/TaskNotifications";
import UserProfileManager from "../components/profile/UserProfileManager";
import { useLocation } from "react-router-dom";

export default function Dashboard() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [allPrescriptions, setAllPrescriptions] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [logs, setLogs] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFamilyProfile, setShowFamilyProfile] = useState(false);
  const [showMedications, setShowMedications] = useState(false);
  
  const location = useLocation();

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      loadDataForPatient(selectedPatient);
    }
  }, [selectedPatient, location.key]);

  const loadInitialData = async () => {
    try {
      const [me, familyMembers] = await Promise.all([User.me(), FamilyMember.list("-created_date")]);
      const myName = me.preferred_name || me.full_name || "Myself";
      const familyNames = familyMembers.map(fm => fm.full_name);
      
      const allPatients = [...new Set([myName, ...familyNames])];
      
      if (allPatients.length > 0) {
        setPatients(allPatients);
        setSelectedPatient(allPatients[0]);
      } else {
        setPatients([myName]);
        setSelectedPatient(myName);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error loading initial data:", error);
      setPatients(["Myself"]);
      setSelectedPatient("Myself");
      setLoading(false);
    }
  };

  const loadDataForPatient = async (patientName) => {
    setLoading(true);
    try {
      const [prescriptionsData, allPrescriptionsData, remindersData, logsData] = await Promise.all([
        Prescription.filter({ patient_name: patientName, is_active: true }, "-created_date", 50),
        Prescription.filter({ patient_name: patientName }, "-created_date", 100),
        MedicationReminder.filter({ patient_name: patientName, is_active: true }),
        MedicationLog.filter({ patient_name: patientName }, "-created_date", 100)
      ]);
      setPrescriptions(prescriptionsData);
      setAllPrescriptions(allPrescriptionsData);
      setReminders(remindersData);
      setLogs(logsData);
    } catch (error) {
      console.error(`Error loading data for ${patientName}:`, error);
      // For new users or errors, set empty arrays
      setPrescriptions([]);
      setAllPrescriptions([]);
      setReminders([]);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // Function to refresh data after prescription updates
  const handleDataUpdate = async () => {
    if (selectedPatient) {
      await loadDataForPatient(selectedPatient);
    }
  };

  const handleLogAction = async (reminder, status) => {
    try {
      const newLogEntry = {
        reminder_id: reminder.id,
        patient_name: reminder.patient_name,
        medicine_name: reminder.medicine_name,
        scheduled_time: reminder.scheduled_time,
        taken_time: status === "taken" ? new Date().toISOString() : null,
        status: status
      };
      const savedLog = await MedicationLog.create(newLogEntry);
      setLogs(prevLogs => [savedLog, ...prevLogs]);
    } catch (error) {
      console.error("Error logging medication:", error);
    }
  };

  const upcomingReminders = reminders
    .filter(reminder => {
      // Exclude reminders whose course has already ended or not yet started
      const todayStr = format(new Date(), "yyyy-MM-dd");
      if (reminder.end_date && reminder.end_date < todayStr) return false;
      if (reminder.start_date && reminder.start_date > todayStr) return false;
      return true;
    })
    .flatMap(reminder => {
      const today = new Date();
      const todaysDate = format(today, "yyyy-MM-dd");
      return reminder.reminder_times.map(time => ({
        ...reminder,
        scheduled_time: `${todaysDate}T${time}:00`,
        time_only: time,
      }));
    })
    .filter(r => {
      if (!isFuture(parseISO(r.scheduled_time))) return false;
      // Deduplicate: exclude if already logged (taken or skipped) today
      const alreadyLogged = logs.some(
        log => log.reminder_id === r.id &&
          log.scheduled_time &&
          log.scheduled_time.startsWith(format(new Date(), "yyyy-MM-dd")) &&
          log.scheduled_time.includes(r.time_only)
      );
      return !alreadyLogged;
    })
    .sort((a, b) => a.time_only.localeCompare(b.time_only));

  const refillNeededReminders = reminders.filter(r => r.refill_reminder_date && isFuture(new Date(r.refill_reminder_date)));

  if (!selectedPatient) {
    return (
       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
         <div className="animate-pulse h-32 w-full max-w-sm bg-gray-200 rounded-2xl"></div>
       </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <NotificationManager patientName={selectedPatient} />
      <TaskNotifications patientName={selectedPatient} />
      
      <WelcomeHeader patientName={selectedPatient} logs={logs} />
      
      <div className="max-w-5xl mx-auto">
        <PatientSwitcher 
          patients={patients} 
          selectedPatient={selectedPatient} 
          onSelectPatient={setSelectedPatient}
          onAddFamily={() => setShowFamilyProfile(true)}
        />
        
        {loading ? (
          <div className="px-5 py-4 space-y-3">
            <div className="h-24 bg-white rounded-2xl animate-pulse shadow-sm" />
            <div className="h-20 bg-white rounded-2xl animate-pulse shadow-sm" />
            <div className="h-36 bg-white rounded-2xl animate-pulse shadow-sm" />
            <div className="h-52 bg-white rounded-2xl animate-pulse shadow-sm" />
          </div>
        ) : (
          <div>
            <QuickStats prescriptions={prescriptions} logs={logs} onActiveMedsClick={() => setShowMedications(true)} />
            <QuickActions />
            <NextDoses reminders={upcomingReminders} logs={logs} onTake={(r) => handleLogAction(r, 'taken')} onSkip={(r) => handleLogAction(r, 'skipped')} />
            <TodaysMedications patientName={selectedPatient} reminders={reminders} logs={logs} />
            <HealthTasks patientName={selectedPatient} />
            {refillNeededReminders.length > 0 && <RefillReminders reminders={refillNeededReminders} />}
            <RecentPrescriptions prescriptions={prescriptions} onUpdate={handleDataUpdate} />
          </div>
        )}
      </div>
      
      {showFamilyProfile && (
        <UserProfileManager onClose={() => setShowFamilyProfile(false)} />
      )}

      {showMedications && (
        <MedicationsView
          prescriptions={allPrescriptions}
          onClose={() => setShowMedications(false)}
          onUpdate={handleDataUpdate}
        />
      )}
    </div>
  );
}