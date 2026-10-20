"use client";

import { useEffect } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

export interface PopupState {
  isOpen: boolean;
  type: "error" | "success" | "info";
  title?: string;
  message: string;
}

interface ErrorModalProps {
  popup: PopupState;
  onClose: () => void;
}

export function ErrorModal({ popup, onClose }: ErrorModalProps) {
  useEffect(() => {
    if (!popup.isOpen) return;
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [popup.isOpen, onClose]);

  if (!popup.isOpen) return null;

  const isError = popup.type === "error";
  const isSuccess = popup.type === "success";

  return (
    <div className="fixed top-6 right-6 z-50 max-w-sm sm:max-w-md w-full animate-in slide-in-from-top-4 fade-in duration-300">
      <div
        className={`p-4 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-start gap-3.5 transition-all ${
          isError
            ? "bg-white/95 border-rose-200 text-slate-800 shadow-rose-500/10"
            : isSuccess
            ? "bg-white/95 border-emerald-200 text-slate-800 shadow-emerald-500/10"
            : "bg-white/95 border-indigo-200 text-slate-800 shadow-indigo-500/10"
        }`}
      >
        {/* Icon */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
            isError
              ? "bg-rose-50 text-rose-600 border border-rose-100"
              : isSuccess
              ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
              : "bg-indigo-50 text-indigo-600 border border-indigo-100"
          }`}
        >
          {isError ? (
            <AlertCircle className="w-5 h-5 animate-bounce" />
          ) : (
            <CheckCircle2 className="w-5 h-5" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          <h4
            className={`text-sm font-bold ${
              isError
                ? "text-rose-700"
                : isSuccess
                ? "text-emerald-700"
                : "text-indigo-700"
            }`}
          >
            {popup.title || (isError ? "Action Error" : isSuccess ? "Success" : "Notice")}
          </h4>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed break-words font-medium">
            {popup.message}
          </p>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
