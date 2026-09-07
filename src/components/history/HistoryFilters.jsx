import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function HistoryFilters({ onFilterChange, prescriptions }) {
  const [doctors, setDoctors] = useState([]);
  const [categories, setCategories] = useState([]);
  
  useEffect(() => {
    const uniqueDoctors = [...new Set(prescriptions.map(p => p.doctor_name).filter(Boolean))];
    const uniqueCategories = [...new Set(prescriptions.flatMap(p => p.medicines.map(m => m.category)).filter(Boolean))];
    setDoctors(uniqueDoctors);
    setCategories(uniqueCategories);
  }, [prescriptions]);

  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      <Select onValueChange={(value) => onFilterChange('doctor', value === 'all' ? null : value)}>
        <SelectTrigger><SelectValue placeholder="Filter by Doctor" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Doctors</SelectItem>
          {doctors.map(doctor => <SelectItem key={doctor} value={doctor}>{doctor}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select onValueChange={(value) => onFilterChange('category', value === 'all' ? null : value)}>
        <SelectTrigger><SelectValue placeholder="Filter by Category" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map(category => <SelectItem key={category} value={category}>{category.charAt(0).toUpperCase() + category.slice(1)}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}