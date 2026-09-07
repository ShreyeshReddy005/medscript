import React, { useState, useEffect } from 'react';
import { MedicationReminder } from '@/entities/MedicationReminder';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Save, Trash2, PlusCircle, ArrowLeft, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

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