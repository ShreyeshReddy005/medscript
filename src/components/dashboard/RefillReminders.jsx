import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Bell, Package, ShoppingCart } from 'lucide-react';
import { formatDistanceToNow, isPast, format } from 'date-fns';

export default function RefillReminders({ reminders }) {
  if (reminders.length === 0) return null;

  return (
    <div className="px-5 py-6">
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-5 h-5 text-orange-500" />
        <h3 className="text-lg font-bold text-gray-900">Refill Alerts</h3>
      </div>
      
      <div className="space-y-3">
        {reminders.map((reminder, index) => {
          const isOverdue = isPast(new Date(reminder.refill_reminder_date));
          
          return (
            <motion.div
              key={reminder.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative overflow-hidden rounded-2xl p-4 border ${isOverdue ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'}`}
            >
              <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl ${isOverdue ? 'bg-orange-200/50' : 'bg-blue-200/50'}`} />
              
              <div className="relative flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${isOverdue ? 'bg-gradient-to-br from-orange-400 to-amber-500' : 'bg-gradient-to-br from-blue-400 to-indigo-500'}`}>
                  {isOverdue ? <AlertTriangle className="w-6 h-6 text-white" /> : <Bell className="w-6 h-6 text-white" />}
                </div>
                
                <div className="flex-1">
                  <h4 className={`font-bold ${isOverdue ? 'text-orange-900' : 'text-blue-900'}`}>{reminder.medicine_name}</h4>
                  <p className={`text-sm ${isOverdue ? 'text-orange-700' : 'text-blue-700'}`}>
                    {isOverdue ? `Refill may be overdue` : `Refill needed ${formatDistanceToNow(new Date(reminder.refill_reminder_date), { addSuffix: true })}`}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{format(new Date(reminder.refill_reminder_date), 'MMMM d, yyyy')}</p>
                </div>
                
                <motion.button whileTap={{ scale: 0.95 }} className={`p-2 rounded-xl ${isOverdue ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                  <ShoppingCart className="w-5 h-5" />
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}