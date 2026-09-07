import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Pause, Play, Square, AlertCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AudioRecorder({ onRecordingComplete, onCancel }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const [permissionAsked, setPermissionAsked] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => stopAll();
  }, []);

  const stopAll = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const startRecording = async () => {
    setError(null);
    setPermissionAsked(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        onRecordingComplete(blob, duration);
        stopAll();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      setError(
        "Could not access microphone. Please grant microphone permission in your browser settings and try again."
      );
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 px-5 max-w-5xl mx-auto">
      {/* Timer */}
      <div className="mb-8">
        <motion.div
          animate={{ scale: isRecording && !isPaused ? [1, 1.05, 1] : 1 }}
          transition={{ duration: 2, repeat: isRecording && !isPaused ? Infinity : 0 }}
          className="text-5xl font-bold text-gray-900 tabular-nums tracking-tight"
        >
          {formatTime(duration)}
        </motion.div>
        <p className="text-center text-sm text-gray-400 mt-1">
          {isRecording ? (isPaused ? "Paused" : "Recording…") : "Ready to record"}
        </p>
      </div>

      {/* Mic button */}
      <div className="relative mb-8">
        {isRecording && !isPaused && (
          <>
            <motion.div
              animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
              className="absolute inset-0 rounded-full bg-red-400"
            />
            <motion.div
              animate={{ scale: [1, 1.4], opacity: [0.3, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
              className="absolute inset-0 rounded-full bg-red-400"
            />
          </>
        )}
        <button
          onClick={isRecording ? (isPaused ? resumeRecording : pauseRecording) : startRecording}
          className={`relative w-28 h-28 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${
            isRecording
              ? isPaused
                ? "bg-amber-500"
                : "bg-red-500"
              : "bg-blue-600"
          }`}
        >
          {isRecording ? (
            isPaused ? (
              <Play className="w-10 h-10 text-white" fill="white" />
            ) : (
              <Pause className="w-10 h-10 text-white" fill="white" />
            )
          ) : (
            <Mic className="w-10 h-10 text-white" />
          )}
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-semibold shadow-sm active:scale-95 transition-all"
          >
            <Mic className="w-5 h-5" />
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl font-semibold shadow-sm active:scale-95 transition-all"
          >
            <Square className="w-5 h-5" fill="white" />
            Finish & Summarize
          </button>
        )}
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-5 py-3 bg-gray-100 text-gray-600 rounded-2xl font-semibold active:scale-95 transition-all"
        >
          <X className="w-5 h-5" />
          Cancel
        </button>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 flex items-start gap-2 max-w-sm bg-red-50 border border-red-200 rounded-2xl p-4"
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips */}
      {!isRecording && !permissionAsked && (
        <div className="mt-8 max-w-sm text-center">
          <p className="text-sm text-gray-400">
            Place your phone between you and the doctor. Kin Health will capture the
            conversation so you can stay present — no note-taking needed.
          </p>
        </div>
      )}
    </div>
  );
}