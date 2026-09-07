import { db } from '../lib/AuthContext.jsx';

export const User = new Proxy({}, {
  get: (_, prop) => {
    if (prop === 'me') return db.auth.me;
    if (prop === 'loginWithRedirect' || prop === 'login') return db.auth.loginWithRedirect;
    if (prop === 'logout') return db.auth.logout;
    if (prop === 'updateMyUserData') return db.auth.updateMe;
    return db.entities.User[prop];
  }
});

export const FamilyMember = new Proxy({}, { get: (_, prop) => db.entities.FamilyMember[prop] });
export const Prescription = new Proxy({}, { get: (_, prop) => db.entities.Prescription[prop] });
export const MedicationReminder = new Proxy({}, { get: (_, prop) => db.entities.MedicationReminder[prop] });
export const MedicationLog = new Proxy({}, { get: (_, prop) => db.entities.MedicationLog[prop] });
export const HealthReport = new Proxy({}, { get: (_, prop) => db.entities.HealthReport[prop] });
export const UserProfile = new Proxy({}, { get: (_, prop) => db.entities.UserProfile[prop] });
export const Visit = new Proxy({}, { get: (_, prop) => db.entities.Visit[prop] });
export const HealthTask = new Proxy({}, { get: (_, prop) => db.entities.HealthTask[prop] });
