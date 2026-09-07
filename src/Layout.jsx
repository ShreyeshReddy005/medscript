import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { HeartPulse, Plus, History, Home, User, FileHeart, TrendingUp, Mic } from "lucide-react";
import UserProfileManager from "./components/profile/UserProfileManager";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [showProfile, setShowProfile] = useState(false);

  const navigationItems = [
    {
      title: "Home",
      url: createPageUrl("Dashboard"),
      icon: Home,
    },
    {
      title: "Insights",
      url: "/Insights",
      icon: TrendingUp,
    },
    {
      title: "Visits",
      url: "/Visits",
      icon: Mic,
    },
    {
      title: "Report",
      url: createPageUrl("DoctorsReport"),
      icon: FileHeart,
    },
    {
      title: "History",
      url: createPageUrl("History"),
      icon: History,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <style>
        {`
          :root {
            --medical-blue: #007AFF;
            --success-green: #34C759;
            --warning-orange: #FF9500;
            --text-primary: #1C1C1E;
            --text-secondary: #8E8E93;
            --background-primary: #FFFFFF;
            --background-secondary: #F2F2F7;
            --border-light: #E5E5EA;
          }
          /* Hide scrollbar for Chrome, Safari and Opera */
          body::-webkit-scrollbar {
            display: none;
          }
          /* Hide scrollbar for IE, Edge and Firefox */
          body {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
          }
          
          /* Animation for notification slide down */
          @keyframes slide-down {
            from { transform: translateY(-100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }

          .animate-slide-down {
            animation: slide-down 0.3s ease-out;
          }

          /* Apple-like smooth scrolling */
          html {
            scroll-behavior: smooth;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          /* Improved tap targets */
          button, a {
            -webkit-tap-highlight-color: transparent;
          }

          /* Smooth transitions globally */
          * {
            transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          }

          /* Mobile-first responsive adjustments */
          @media (max-width: 640px) {
            .mobile-padding { padding-left: 1rem; padding-right: 1rem; }
          }

          /* Safe area insets for notched devices */
          .safe-top { padding-top: env(safe-area-inset-top); }
          .safe-bottom { padding-bottom: env(safe-area-inset-bottom); }

          /* Glass morphism utilities */
          .glass {
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
          }
        `}
      </style>

      {/* Header */}
      <header className="bg-white/95 backdrop-blur-xl border-b border-gray-100/80 sticky top-0 z-40 safe-top">
        <div className="px-4 sm:px-6 py-2.5 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-sm">
                <HeartPulse className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-none">MedScript</h1>
                <p className="text-[10px] text-gray-400 font-medium leading-none mt-0.5 hidden sm:block">Your Health Companion</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Link
                to={createPageUrl("Upload")}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Record</span>
                <span className="sm:hidden">Add</span>
              </Link>
              <button
                onClick={() => setShowProfile(true)}
                className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center active:scale-95 transition-all"
              >
                <User className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20 sm:pb-24">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 z-50 safe-bottom">
        <div className="flex justify-around items-center py-1.5 px-2 max-w-lg mx-auto">
          {navigationItems.map((item) => {
            const isActive = item.url ? location.pathname === item.url : false;
            return (
              <Link
                key={item.title}
                to={item.url}
                className={`flex flex-col items-center justify-center py-2 px-4 rounded-2xl transition-all active:scale-90 min-w-0 ${
                  isActive ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                <div className={`flex items-center justify-center w-10 h-7 rounded-2xl transition-all ${isActive ? 'bg-blue-100' : ''}`}>
                  <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                </div>
                <span className={`text-[10px] font-semibold mt-0.5 transition-colors ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                  {item.title}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Profile Modal */}
      {showProfile && (
        <UserProfileManager onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
}