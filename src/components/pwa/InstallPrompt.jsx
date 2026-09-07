import React, { useEffect, useState } from "react";
import { Download, X, Share, PlusSquare } from "lucide-react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("install_dismissed") === "true") return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (standalone) return;

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios|edgios/i.test(navigator.userAgent);
    if (isIOS) {
      setIos(true);
      const t = setTimeout(() => setShow(true), 4000);
      return () => clearTimeout(t);
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShow(false);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("install_dismissed", "true");
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 max-w-md mx-auto animate-slide-down">
      <div className="bg-white rounded-2xl border border-blue-200 shadow-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center flex-shrink-0">
            <Download className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm">Add MediScan to Home Screen</h3>
            {ios ? (
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Tap <Share className="inline w-3.5 h-3.5 -mt-0.5 text-blue-500" /> Share, then{" "}
                <PlusSquare className="inline w-3.5 h-3.5 -mt-0.5 text-blue-500" /> Add to Home Screen
                for quick access and medication reminders.
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Install the app for instant access and medication reminders on your phone.
              </p>
            )}
            <div className="flex gap-2 mt-3">
              {!ios && (
                <button
                  onClick={handleInstall}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors"
                >
                  Install
                </button>
              )}
              <button
                onClick={handleDismiss}
                className={ios ? "flex-1 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-colors" : "py-2 px-3 bg-gray-100 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-colors"}
              >
                Maybe later
              </button>
            </div>
          </div>
          <button onClick={handleDismiss} className="p-1 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}