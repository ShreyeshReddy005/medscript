import { db } from '../lib/AuthContext.jsx';

export const UploadFile = new Proxy({}, { get: (_, prop) => db.integrations.Core.UploadFile[prop] });
export const TranscribeAudio = new Proxy({}, { get: (_, prop) => db.integrations.Core.TranscribeAudio[prop] });
export const InvokeLLM = new Proxy({}, { get: (_, prop) => db.integrations.Core.InvokeLLM[prop] });
