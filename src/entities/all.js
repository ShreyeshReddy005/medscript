import { supabase } from '../lib/AuthContext.jsx';

// A generic factory to mock Base44 SDK entity behavior using Supabase
const createEntityProxy = (tableName) => {
  return {
    filter: async (query = {}, sort = null, limit = null) => {
      let req = supabase.from(tableName).select('*');
      
      for (const [key, value] of Object.entries(query)) {
        req = req.eq(key, value);
      }

      if (sort) {
        // sort is like "-created_date" for desc, or "created_date" for asc
        const isDesc = sort.startsWith('-');
        const column = isDesc ? sort.substring(1) : sort;
        req = req.order(column, { ascending: !isDesc });
      }

      if (limit) {
        req = req.limit(limit);
      }

      const { data, error } = await req;
      if (error) throw error;
      return data || [];
    },

    create: async (payload) => {
      // Supabase RLS policies require the user_id for inserts if we want them tied to a user.
      const userRes = await supabase.auth.getUser();
      if (userRes.data?.user) {
         payload.user_id = userRes.data.user.id;
      }

      const { data, error } = await supabase.from(tableName).insert(payload).select().single();
      if (error) throw error;
      return data;
    },

    update: async (id, payload) => {
      const { data, error } = await supabase.from(tableName).update(payload).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },

    delete: async (id) => {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
      return true;
    }
  };
};

export const User = {
  me: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) throw new Error("Not logged in");
    return data.user;
  },
  logout: async () => {
    return await supabase.auth.signOut();
  },
  updateMyUserData: async (payload) => {
    const { data, error } = await supabase.auth.updateUser({ data: payload });
    if (error) throw error;
    return data;
  }
};

export const FamilyMember = createEntityProxy('FamilyMember');
export const Prescription = createEntityProxy('Prescription');
export const MedicationReminder = createEntityProxy('MedicationReminder');
export const MedicationLog = createEntityProxy('MedicationLog');
export const HealthReport = createEntityProxy('HealthReport');
export const UserProfile = createEntityProxy('UserProfile');
export const Visit = createEntityProxy('Visit');
export const HealthTask = createEntityProxy('HealthTask');
