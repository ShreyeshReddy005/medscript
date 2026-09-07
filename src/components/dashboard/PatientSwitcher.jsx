import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, User, Plus, ChevronDown, Check } from 'lucide-react';
import { FamilyMember } from "@/entities/all";
import { User as UserEntity } from '@/entities/User';

export default function PatientSwitcher({ patients, selectedPatient, onSelectPatient, onAddFamily }) {
  const [allPatients, setAllPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const loadAllPatients = useCallback(async () => {
    setLoading(true);
    try {
      const [me, familyMembers] = await Promise.all([
        UserEntity.me(),
        FamilyMember.list("-created_date")
      ]);
      
      const myName = me.preferred_name || me.full_name || "Myself";
      
      const finalPatientList = [
        { name: myName, relation: 'You', color: 'blue', id: 'self' },
        ...familyMembers.map(fm => ({
          name: fm.full_name,
          relation: fm.relation_to_user,
          color: fm.profile_color || 'violet',
          id: fm.id
        }))
      ];

      setAllPatients(finalPatientList);
      
      if (!selectedPatient && finalPatientList.length > 0) {
        onSelectPatient(finalPatientList[0].name);
      }
    } catch (error) {
      console.error("Error loading patients:", error);
      const fallbackPatients = [{ name: "Myself", relation: 'You', color: 'blue', id: 'self' }];
      setAllPatients(fallbackPatients);
      if (!selectedPatient) {
        onSelectPatient("Myself");
      }
    } finally {
      setLoading(false);
    }
  }, [selectedPatient, onSelectPatient]);

  useEffect(() => {
    loadAllPatients();
  }, [loadAllPatients]);

  const getColorClasses = (color) => {
    const colors = {
      blue: { bg: 'bg-blue-500', light: 'bg-blue-100', ring: 'ring-blue-200' },
      green: { bg: 'bg-green-500', light: 'bg-green-100', ring: 'ring-green-200' },
      purple: { bg: 'bg-purple-500', light: 'bg-purple-100', ring: 'ring-purple-200' },
      violet: { bg: 'bg-violet-500', light: 'bg-violet-100', ring: 'ring-violet-200' },
      pink: { bg: 'bg-pink-500', light: 'bg-pink-100', ring: 'ring-pink-200' },
      orange: { bg: 'bg-orange-500', light: 'bg-orange-100', ring: 'ring-orange-200' },
      red: { bg: 'bg-red-500', light: 'bg-red-100', ring: 'ring-red-200' }
    };
    return colors[color] || colors.blue;
  };

  const selectedPatientData = allPatients.find(p => p.name === selectedPatient);

  if (loading) {
    return (
      <div className="px-5 py-4">
        <div className="animate-pulse">
          <div className="h-14 bg-gray-100 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (allPatients.length === 1) {
    return (
      <div className="px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${getColorClasses(selectedPatientData?.color).bg} rounded-xl flex items-center justify-center`}>
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Viewing records for</p>
              <p className="font-semibold text-gray-900">{selectedPatient}</p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onAddFamily && onAddFamily()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Family</span>
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-4">
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-white rounded-2xl border border-gray-200 shadow-sm hover:border-gray-300 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${getColorClasses(selectedPatientData?.color).bg} rounded-xl flex items-center justify-center shadow-lg`}>
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="text-xs text-gray-500 font-medium">Viewing for</p>
            <p className="font-semibold text-gray-900">{selectedPatient}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {allPatients.slice(0, 3).map((patient) => (
              <div 
                key={patient.id}
                className={`w-7 h-7 ${getColorClasses(patient.color).bg} rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold`}
              >
                {patient.name.charAt(0)}
              </div>
            ))}
          </div>
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </motion.div>
        </div>
      </motion.button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-2">
              {allPatients.map((patient) => {
                const isSelected = selectedPatient === patient.name;
                const colorClasses = getColorClasses(patient.color);
                
                return (
                  <motion.button
                    key={patient.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onSelectPatient(patient.name);
                      setIsExpanded(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all ${
                      isSelected ? `${colorClasses.light} ring-2 ${colorClasses.ring}` : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${colorClasses.bg} rounded-xl flex items-center justify-center`}>
                        <span className="text-white font-bold">{patient.name.charAt(0)}</span>
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">{patient.name}</p>
                        <p className="text-xs text-gray-500">{patient.relation}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className={`w-6 h-6 ${colorClasses.bg} rounded-full flex items-center justify-center`}>
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
              
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setIsExpanded(false);
                  onAddFamily && onAddFamily();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl border-2 border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Plus className="w-5 h-5 text-gray-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-600">Add Family Member</p>
                  <p className="text-xs text-gray-400">Track their medications too</p>
                </div>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}