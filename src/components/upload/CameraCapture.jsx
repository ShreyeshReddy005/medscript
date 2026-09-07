import React, { useRef, useState, useEffect } from "react";
import { Camera, X, Zap, RotateCcw, Sun, ZoomIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CameraCapture({ onCapture, onCancel }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState(null);
  const [captured, setCaptured] = useState(false);
  const [flash, setFlash] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  useEffect(() => {
    startCamera(facingMode);
    return () => stopCamera();
  }, [facingMode]);

  const startCamera = async (mode) => {
    stopCamera();
    setIsCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 2560 },   // Higher resolution for better OCR
          height: { ideal: 1440 },
          focusMode: 'continuous',   // Auto-focus for sharp text
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setIsCameraReady(true);
      }
      setError(null);
    } catch (err) {
      setError("Camera access denied. Please allow camera permissions and try again.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const flipCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const capturePhoto = () => {
    if (!videoRef.current || !isCameraReady) return;

    // Flash effect
    setFlash(true);
    setTimeout(() => setFlash(false), 300);
    setCaptured(true);

    const canvas = document.createElement('canvas');
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');

    // Image enhancement for better OCR
    ctx.filter = 'contrast(1.15) brightness(1.05) saturate(0.9)';
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      const file = new File([blob], `prescription-${Date.now()}.jpg`, { type: 'image/jpeg' });
      stopCamera();
      onCapture(file);
    }, 'image/jpeg', 0.95); // High quality JPEG for OCR
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 text-center max-w-sm w-full">
          <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <Camera className="w-10 h-10 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Camera Unavailable</h3>
          <p className="text-gray-500 mb-6 text-sm leading-relaxed">{error}</p>
          <button onClick={onCancel} className="w-full py-3.5 bg-gray-900 text-white rounded-2xl font-semibold">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Flash overlay */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0.8 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-white z-50 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 px-5 pt-12 pb-4 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center justify-between">
          <button
            onClick={() => { stopCamera(); onCancel(); }}
            className="w-11 h-11 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="text-center">
            <p className="text-white font-semibold text-sm">Scan Prescription</p>
            <p className="text-white/60 text-xs mt-0.5">Align document within frame</p>
          </div>
          {isMobile ? (
            <button
              onClick={flipCamera}
              className="w-11 h-11 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20"
            >
              <RotateCcw className="w-5 h-5 text-white" />
            </button>
          ) : <div className="w-11" />}
        </div>
      </div>

      {/* Camera feed */}
      <video
        ref={videoRef}
        autoPlay playsInline muted
        className="w-full h-full object-cover"
      />

      {/* Loading overlay */}
      {!isCameraReady && (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="w-14 h-14 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-medium">Starting camera...</p>
          </div>
        </div>
      )}

      {/* Document frame overlay */}
      {isCameraReady && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* Dim corners */}
          <div className="absolute inset-0 bg-black/30" />
          {/* Clear window */}
          <div
            className="relative bg-transparent border-0"
            style={{ width: '85%', height: '65%' }}
          >
            {/* Corner markers */}
            {[
              'top-0 left-0 border-t-3 border-l-3 rounded-tl-2xl',
              'top-0 right-0 border-t-3 border-r-3 rounded-tr-2xl',
              'bottom-0 left-0 border-b-3 border-l-3 rounded-bl-2xl',
              'bottom-0 right-0 border-b-3 border-r-3 rounded-br-2xl',
            ].map((cls, i) => (
              <div key={i} className={`absolute w-10 h-10 border-[3px] border-white ${cls}`} />
            ))}
            {/* Scanning line animation */}
            <motion.div
              animate={{ y: ['0%', '100%', '0%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-80"
            />
            {/* Clear area */}
            <div className="absolute inset-0 bg-transparent mix-blend-normal" style={{ boxShadow: 'inset 0 0 0 9999px rgba(0,0,0,0.35)' }} />
          </div>
        </div>
      )}

      {/* Tips strip */}
      {isCameraReady && (
        <div className="absolute left-0 right-0 z-20" style={{ top: '78%', marginTop: 12 }}>
          <div className="flex justify-center gap-4 px-4">
            {[
              { icon: Sun, text: 'Good lighting' },
              { icon: ZoomIn, text: 'Fill the frame' },
              { icon: Zap, text: 'Hold steady' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full">
                <Icon className="w-3.5 h-3.5 text-blue-300" />
                <span className="text-white/80 text-xs font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shutter button */}
      <div className="absolute bottom-0 left-0 right-0 pb-12 pt-6 bg-gradient-to-t from-black/70 to-transparent flex flex-col items-center gap-4">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={capturePhoto}
          disabled={!isCameraReady || captured}
          className="relative w-20 h-20 rounded-full flex items-center justify-center disabled:opacity-50"
        >
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-4 border-white/80" />
          {/* Inner button */}
          <div className={`w-14 h-14 rounded-full transition-all ${captured ? 'bg-blue-500 scale-90' : 'bg-white'}`} />
        </motion.button>
        <p className="text-white/60 text-xs font-medium tracking-wide uppercase">
          {captured ? 'Processing...' : 'Tap to capture'}
        </p>
      </div>
    </div>
  );
}