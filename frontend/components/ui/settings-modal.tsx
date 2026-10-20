"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/hooks/use-store";
import { translations } from "@/lib/translations";
import { API_BASE_URL } from "@/lib/api";
import { Sun, Moon, Globe, User, Check, Loader2, Sparkles } from "lucide-react";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccessToast?: (msg: string) => void;
}

export function SettingsModal({ open, onOpenChange, onSuccessToast }: SettingsModalProps) {
  const { user, setUser, theme, setTheme, language, setLanguage } = useStore();
  const [name, setName] = useState(user?.full_name || "");
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "appearance">("general");

  const t = translations[language];

  useEffect(() => {
    if (user?.full_name) {
      setName(user.full_name);
    }
  }, [user]);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const token = localStorage.getItem("documind_token");
      const res = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ full_name: name.trim() }),
      });

      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
        localStorage.setItem("documind_user", JSON.stringify(updated));
        if (onSuccessToast) {
          onSuccessToast(t.nameUpdated);
        }
        onOpenChange(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.tagline}</span>
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
            {t.settings}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === "bn"
              ? "আপনার নাম, থিম ও ইন্টারফেস ভাষা পরিবর্তন করুন।"
              : "Customize your profile name, visual theme and interface language."}
          </DialogDescription>

          {/* Sub Navigation */}
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "general"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              }`}
            >
              {language === "bn" ? "প্রোফাইল সেটিংস" : "Profile & Name"}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("appearance")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "appearance"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              }`}
            >
              {language === "bn" ? "থিম ও ভাষা" : "Theme & Language"}
            </button>
          </div>
        </div>

        {/* Tab 1: Profile & Name */}
        {activeTab === "general" && (
          <form onSubmit={handleSaveName} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t.fullName}</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
                className="h-10 text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl focus-visible:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-400">
                {language === "bn"
                  ? "এই নামটি আপনার ওয়ার্কস্পেস সাইডবার ও প্রোফাইল মেন্যুতে প্রদর্শিত হবে।"
                  : "This name will appear on your workspace sidebar and profile card."}
              </p>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t.emailAddress}
              </label>
              <Input
                value={user?.email || ""}
                disabled
                className="h-10 text-sm bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-400">
                {language === "bn" ? "ইমেইল পরিবর্তনের সুযোগ সংরক্ষিত।" : "Account primary email cannot be altered."}
              </p>
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="cursor-pointer rounded-xl text-xs h-9"
              >
                {t.cancel}
              </Button>
              <Button
                type="submit"
                disabled={isSaving || !name.trim()}
                className="cursor-pointer rounded-xl text-xs h-9 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isSaving ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {t.saving}
                  </span>
                ) : (
                  <span>{t.saveChanges}</span>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Tab 2: Theme & Language */}
        {activeTab === "appearance" && (
          <div className="p-6 space-y-5">
            {/* Theme Selection */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2.5 block">
                {t.theme}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`cursor-pointer p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                    theme === "light"
                      ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 shadow-sm"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                      <Sun className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">{t.themeLight}</div>
                      <div className="text-[10px] text-slate-400">Crisp & Colorful</div>
                    </div>
                  </div>
                  {theme === "light" && <Check className="w-4 h-4 text-indigo-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`cursor-pointer p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                    theme === "dark"
                      ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 shadow-sm"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 text-indigo-400 flex items-center justify-center">
                      <Moon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">{t.themeDark}</div>
                      <div className="text-[10px] text-slate-400">Cyber Obsidian</div>
                    </div>
                  </div>
                  {theme === "dark" && <Check className="w-4 h-4 text-indigo-400" />}
                </button>
              </div>
            </div>

            {/* Language Selection */}
            <div className="pt-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t.language}</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={`cursor-pointer p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                    language === "en"
                      ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200 font-bold"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span className="text-xs">English (US)</span>
                  {language === "en" && <Check className="w-4 h-4 text-indigo-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => setLanguage("bn")}
                  className={`cursor-pointer p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                    language === "bn"
                      ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200 font-bold"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span className="text-xs">বাংলা (Bangla)</span>
                  {language === "bn" && <Check className="w-4 h-4 text-indigo-600" />}
                </button>
              </div>
            </div>

            <div className="pt-4 flex justify-end border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                className="cursor-pointer rounded-xl text-xs h-9 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {language === "bn" ? "সম্পন্ন" : "Done"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
