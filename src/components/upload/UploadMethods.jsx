import React, { useRef } from "react";
import { Camera, Upload, FileText, Smartphone } from "lucide-react";

export default function UploadMethods({ onFileSelect, onCameraClick }) {
  const fileInputRef = useRef(null);
  const [isMobile] = React.useState(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const uploadMethods = [
    {
      title: "Take Photo",
      subtitle: isMobile ? "Use camera" : "Use webcam",
      icon: isMobile ? Smartphone : Camera,
      onClick: onCameraClick,
      color: "bg-blue-500",
      textColor: "text-white"
    },
    {
      title: "Upload File",
      subtitle: "PDF or Image",
      icon: Upload,
      onClick: handleFileClick,
      color: "bg-green-500",
      textColor: "text-white"
    }
  ];

  return (
    <div className="px-4 py-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={onFileSelect}
        className="hidden"
      />
      
      <h2 className="text-xl font-bold text-gray-900 mb-2">Upload Prescription</h2>
      <p className="text-gray-500 mb-6">Choose how you'd like to add your prescription</p>
      
      <div className="grid grid-cols-2 gap-4">
        {uploadMethods.map((method, index) => (
          <button
            key={index}
            onClick={method.onClick}
            className={`flex flex-col items-center p-6 rounded-2xl transition-all active:scale-95 ${method.color}`}
          >
            <method.icon className={`w-8 h-8 mb-3 ${method.textColor}`} />
            <span className={`text-lg font-semibold ${method.textColor} text-center mb-1`}>
              {method.title}
            </span>
            <span className={`text-sm ${method.textColor} opacity-80 text-center`}>
              {method.subtitle}
            </span>
          </button>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
        <div className="flex items-start space-x-3">
          <FileText className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900 mb-1">Supported formats</p>
            <p className="text-xs text-blue-700">PDF files, JPEG, PNG images</p>
          </div>
        </div>
      </div>
    </div>
  );
}