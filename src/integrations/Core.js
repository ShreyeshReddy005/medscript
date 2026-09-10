import { supabase } from '../lib/AuthContext.jsx';

export const UploadFile = async ({ file }) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const filePath = `uploads/${fileName}`;

  const { data, error } = await supabase.storage
    .from('files')
    .upload(filePath, file);

  if (error) {
    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from('files')
    .getPublicUrl(filePath);

  return { file_url: publicUrlData.publicUrl };
};

export const InvokeLLM = async ({ prompt, system_prompt }) => {
  console.warn("LLM functionality needs to be configured with an API key.");
  return "LLM processing is currently disconnected from Base44. Please provide an OpenAI or Gemini API key to restore this functionality.";
};

export const TranscribeAudio = async () => {
  throw new Error("Transcribe Audio not implemented.");
};
