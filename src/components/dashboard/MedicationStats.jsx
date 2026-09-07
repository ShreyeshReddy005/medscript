import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Prescription, MedicationLog } from "@/entities/all";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { eachDayOfInterval, format, subDays } from "date-fns";
import { BarChart3, PieChart as PieChartIcon, TrendingUp } from "lucide-react";

const CATEGORY_COLORS = { 'Antibiotic': '#ef4444', 'Painkiller': '#f97316', 'Vitamin': '#22c55e', 'Supplement': '#3b82f6', 'Chronic': '#a855f7', 'Other': '#6b7280' };

export default function MedicationStats({ patientName }) {
  const [stats, setStats] = useState({ adherenceData: [], categoryBreakdown: [], activeMedicines: 0 });
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState('adherence');

  useEffect(() => {
    if (patientName) loadStats();
  }, [patientName]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [prescriptions, logs] = await Promise.all([
        Prescription.filter({ patient_name: patientName, is_active: true }),
        MedicationLog.filter({ patient_name: patientName }, "-created_date", 500),
      ]);
      
      const today = new Date();
      const days = eachDayOfInterval({ start: subDays(today, 6), end: today });
      
      const adherenceData = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayLogs = logs.filter(log => format(new Date(log.scheduled_time), 'yyyy-MM-dd') === dayStr);
        const total = dayLogs.length;
        const taken = dayLogs.filter(log => log.status === 'taken').length;
        const adherence = total > 0 ? Math.round((taken / total) * 100) : 0;
        return { name: format(day, 'EEE'), fullDate: format(day, 'MMM d'), adherence, taken, total };
      });
      
      const categoryCount = {};
      prescriptions.forEach(p => p.medicines.forEach(m => {
        const category = m.category || 'other';
        const displayName = category.charAt(0).toUpperCase() + category.slice(1);
        categoryCount[displayName] = (categoryCount[displayName] || 0) + 1;
      }));
      
      const categoryBreakdown = Object.entries(categoryCount).map(([name, value]) => ({ name, value, color: CATEGORY_COLORS[name] || CATEGORY_COLORS['Other'] }));
      
      setStats({ adherenceData, categoryBreakdown, activeMedicines: prescriptions.flatMap(p => p.medicines).length });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) return <div className="px-5 py-6"><div className="h-72 bg-white rounded-3xl animate-pulse shadow-sm"></div></div>;
  if (stats.adherenceData.every(d => d.total === 0) && stats.categoryBreakdown.length === 0) return null;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-sm px-4 py-3 rounded-xl shadow-lg border border-gray-100">
          <p className="font-semibold text-gray-900">{data.fullDate}</p>
          <p className="text-sm text-gray-600">{data.taken}/{data.total} doses taken</p>
          <p className="text-sm font-bold text-blue-600">{data.adherence}% adherence</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="px-5 py-6 pb-32">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-bold text-gray-900">Health Insights</h3>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button onClick={() => setActiveChart('adherence')} className={`p-2 rounded-lg transition-all ${activeChart === 'adherence' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}><BarChart3 className="w-4 h-4" /></button>
          <button onClick={() => setActiveChart('categories')} className={`p-2 rounded-lg transition-all ${activeChart === 'categories' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}><PieChartIcon className="w-4 h-4" /></button>
        </div>
      </div>
      
      <motion.div key={activeChart} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
        {activeChart === 'adherence' ? (
          <>
            <h4 className="font-semibold text-gray-900 mb-1">Weekly Adherence</h4>
            <p className="text-sm text-gray-500 mb-4">Your medication tracking over 7 days</p>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer>
                <BarChart data={stats.adherenceData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#9ca3af' }} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} tick={{ fill: '#9ca3af' }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.1)', radius: 8 }} />
                  <Bar dataKey="adherence" radius={[8, 8, 0, 0]}>
                    {stats.adherenceData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.adherence >= 80 ? '#22c55e' : entry.adherence >= 50 ? '#f59e0b' : '#ef4444'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4 text-xs">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-green-500 rounded-full" /><span className="text-gray-600">≥80% Great</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-amber-500 rounded-full" /><span className="text-gray-600">50-79%</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-red-500 rounded-full" /><span className="text-gray-600">&lt;50%</span></div>
            </div>
          </>
        ) : (
          <>
            <h4 className="font-semibold text-gray-900 mb-1">Medicine Categories</h4>
            <p className="text-sm text-gray-500 mb-4">Breakdown of your active medications</p>
            {stats.categoryBreakdown.length > 0 ? (
              <div className="flex items-center">
                <div style={{ width: '50%', height: 180 }}>
                  <ResponsiveContainer>
                    <PieChart><Pie data={stats.categoryBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4}>{stats.categoryBreakdown.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie></PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {stats.categoryBreakdown.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-gray-700">{item.name}</span>
                      <span className="text-sm font-semibold text-gray-900 ml-auto">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <div className="text-center py-8 text-gray-500">No category data available</div>}
          </>
        )}
      </motion.div>
    </div>
  );
}