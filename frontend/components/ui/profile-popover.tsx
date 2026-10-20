"use client";

import { useEffect, useRef } from "react";
import { Settings, Globe, HelpCircle, ArrowUpCircle, LogOut, Check, ChevronRight } from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { translations } from "@/lib/translations";

interface ProfilePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export function ProfilePopover({
  isOpen,
  onClose,
  onOpenSettings,
  onLogout,
}: ProfilePopoverProps) {
  const { user, language, setLanguage } = useStore();
  const popoverRef = useRef<HTMLDivElement>(null);
  const t = translations[language];

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-18 left-3 right-3 z-50 animate-in fade-in-50 zoom-in-95 slide-in-from-bottom-3 duration-200"
    >
      <div className="bg-[#18181b] dark:bg-[#121214] text-slate-100 rounded-2xl shadow-2xl border border-white/10 p-2 backdrop-blur-2xl">
        {/* Email Header */}
        <div className="px-3 py-2 text-xs font-medium text-slate-400 truncate border-b border-white/5 pb-2.5 mb-1">
          {user?.email || "user@documind.ai"}
        </div>

        {/* Menu Items */}
        <div className="space-y-0.5">
          {/* Settings */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSettings();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <Settings className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
              <span>{t.settings}</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Ctrl+Shift+,</span>
          </button>

          {/* Quick Language Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = language === "en" ? "bn" : "en";
              setLanguage(next);
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
              <span>{t.language}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
              <span>{language === "en" ? "English" : "বাংলা"}</span>
            </div>
          </button>

          {/* Help */}
          <button
            type="button"
            onClick={() => {
              alert(
                language === "bn"
                  ? "ডকুমাইন্ড এআই সহায়তা: যেকোনো পিডিএফ আপলোড করুন এবং চ্যাটবক্সের মাধ্যমে ডকুমেন্ট থেকে তথ্য জানুন।"
                  : "DocuMind Help: Upload any document and query grounded context in real-time."
              );
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <HelpCircle className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
              <span>{t.help}</span>
            </div>
          </button>
        </div>

        {/* Divider */}
        <div className="my-1.5 border-t border-white/5" />

        {/* Upgrade Plan */}
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => {
              alert(
                language === "bn"
                  ? "শীঘ্রই আসছে: প্রো এআই প্ল্যান (সীমাহীন বড় ফাইল এবং মাল্টিপল আরএজি ইনডেক্সিং)!"
                  : "Coming Soon: Pro AI Plan with unlimited multi-document indexing!"
              );
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <ArrowUpCircle className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
              <span>{t.upgradePlan}</span>
            </div>
            <span className="text-[10px] text-amber-400 font-semibold bg-amber-400/10 px-1.5 py-0.5 rounded">Pro</span>
          </button>

          {/* Log Out */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.logOut}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
