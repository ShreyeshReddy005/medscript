import React from 'react';
import { X } from 'lucide-react';

export default function FileViewer({ fileUrl, onClose }) {
  const isPdf = fileUrl.toLowerCase().endsWith('.pdf');

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative bg-white rounded-lg w-full max-w-3xl h-[90vh] shadow-xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-3 -right-3 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
          <X className="w-6 h-6 text-gray-800" />
        </button>

        {isPdf ? (
          <iframe src={fileUrl} className="w-full h-full border-0 rounded-lg" title="Prescription Document"></iframe>
        ) : (
          <img src={fileUrl} alt="Prescription" className="w-full h-full object-contain rounded-lg" />
        )}
      </div>
    </div>
  );
}