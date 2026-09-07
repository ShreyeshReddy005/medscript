import React, { useState, useEffect } from "react";
import { User as UserEntity, FamilyMember } from "@/entities/all";
import { User, Calendar, Pill, Edit3, X, Phone, MapPin, Building2, CheckCircle2, Stethoscope, Clock, Info, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CATEGORY_CONFIG = {
  antibiotic: { label: "Antibiotic", bg: "bg-red-100", text: "text-red-700", dot: "bg-red-400" },
  painkiller: { label: "Painkiller", bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-400" },
  vitamin:    { label: "Vitamin",    bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-400" },
  supplement: { label: "Supplement", bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-400" },
  chronic:    { label: "Chronic",    bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-400" },
  other:      { label: "Other",      bg: "bg-gray-100",   text: "text-gray-600",   dot: "bg-gray-400" },
};

function MedicineCard({ medicine, index }) {
  const [expanded, setExpanded] = useState(index === 0); // first card open by default
  const cat = CATEGORY_CONFIG[medicine.category] || CATEGORY_CONFIG.other;

  const details = [
    { label: "Dosage",    value: medicine.dosage },
    { label: "Frequency", value: medicine.frequency },
    { label: "Timing",    value: medicine.timing },
    { label: "Duration",  value: medicine.duration },
    { label: "Strength",  value: medicine.strength },
  ].filter(d => d.value);

  return (