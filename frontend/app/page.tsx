"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { FileUploader } from "@/components/documents/file-uploader";
import { DocumentList } from "@/components/documents/document-list";
import { ChatContainer } from "@/components/chat/chat-container";
import { useStore } from "@/hooks/use-store";
import {
  BookOpen,
  User,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Lock,
  Mail,
  ChevronDown,
  Settings as SettingsIcon,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorModal, PopupState } from "@/components/ui/error-modal";
import { ProfilePopover } from "@/components/ui/profile-popover";
import { SettingsModal } from "@/components/ui/settings-modal";
import { NotesDrawer } from "@/components/notes/notes-drawer";
import { translations } from "@/lib/translations";
import { API_BASE_URL, api } from "@/lib/api";

export default function Home() {
  const {
    isAuthenticated,
    setIsAuthenticated,
    user,
    setUser,
    language,
    setLanguage,
    theme,
    setTheme,
    setNotes,
    isNotesOpen,
    setIsNotesOpen,
    activeDocument,
    setActiveDocument,
  } = useStore();

  const t = translations[language];

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Responsive & Resizable Sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(290);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const isDraggingRef = useRef(false);

  const [popup, setPopup] = useState<PopupState>({
    isOpen: false,
    type: "error",
    message: "",
  });

  const triggerPopup = useCallback(
    (message: string, type: "error" | "success" | "info" = "error", title?: string) => {
      setPopup({
        isOpen: true,
        type,
        message,
        title,
      });
    },
    []
  );

  const closePopup = useCallback(() => {
    setPopup((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Hydrate theme and language
  useEffect(() => {
    const savedTheme = localStorage.getItem("documind_theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    }
    const savedLang = localStorage.getItem("documind_lang");
    if (savedLang === "en" || savedLang === "bn") {
      setLanguage(savedLang);
    }
  }, [setTheme, setLanguage]);

  // Restore session
  useEffect(() => {
    const token = localStorage.getItem("documind_token");
    const savedUser = localStorage.getItem("documind_user");

    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error(e);
      }
    }

    if (token) {
      setIsAuthenticated(true);
      fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Session expired");
        })
        .then((userData) => {
          setUser(userData);
          localStorage.setItem("documind_user", JSON.stringify(userData));
        })
        .catch(() => {
          localStorage.removeItem("documind_token");
          localStorage.removeItem("documind_user");
          setIsAuthenticated(false);
          setUser(null);
        });

      // Fetch user notes
      fetch(`${API_BASE_URL}/notes`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((notesData) => setNotes(notesData))
        .catch((err) => console.error("Error loading notes:", err));

      // Restore active session document if present in localStorage
      const savedDoc = localStorage.getItem("documind_active_doc");
      if (savedDoc) {
        try {
          setActiveDocument(JSON.parse(savedDoc));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [setIsAuthenticated, setUser, setNotes, setActiveDocument]);

  // Keyboard shortcut Ctrl+Shift+, for Settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "," || e.key === "<")) {
        e.preventDefault();
        setIsSettingsOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Mouse drag handler for resizing sidebar
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const newWidth = Math.max(220, Math.min(480, event.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLogin && !fullName.trim()) {
      triggerPopup(t.nameRequired, "error", language === "bn" ? "নাম আবশ্যক" : "Name Required");
      return;
    }

    if (!isLogin && password.length < 8) {
      triggerPopup(
        language === "bn"
          ? "পাসওয়ার্ড অবশ্যই কমপক্ষে ৮ অক্ষরের হতে হবে।"
          : "Password must be at least 8 characters long.",
        "error",
        language === "bn" ? "দুর্বল পাসওয়ার্ড" : "Password Too Short"
      );
      return;
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const payload = isLogin
        ? { email: email.trim(), password }
        : { full_name: fullName.trim(), email: email.trim(), password };

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        if (isLogin) {
          localStorage.setItem("documind_token", data.access_token);
          if (data.user) {
            setUser(data.user);
            localStorage.setItem("documind_user", JSON.stringify(data.user));
          }
          setIsAuthenticated(true);

          // Fetch user notes
          fetch(`${API_BASE_URL}/notes`, {
            headers: { Authorization: `Bearer ${data.access_token}` },
          })
            .then((res) => (res.ok ? res.json() : []))
            .then((notesData) => setNotes(notesData))
            .catch((err) => console.error("Error loading notes:", err));

          triggerPopup(
            language === "bn"
              ? `স্বাগতম, ${data.user?.full_name || "ব্যবহারকারী"}!`
              : `Welcome back, ${data.user?.full_name || "Operator"}!`,
            "success",
            language === "bn" ? "লগইন সফল" : "Authentication Successful"
          );
        } else {
          setIsLogin(true);
          setPassword("");
          triggerPopup(
            language === "bn"
              ? "অ্যাকাউন্ট তৈরি সম্পন্ন হয়েছে! অনুগ্রহ করে লগইন করুন।"
              : "Your account has been created successfully! Please sign in with your password.",
            "success",
            language === "bn" ? "রেজিস্ট্রেশন সফল" : "Registration Successful"
          );
        }
      } else {
        const errorMsg =
          typeof data.detail === "string"
            ? data.detail
            : Array.isArray(data.detail)
            ? data.detail[0]?.msg || "Invalid input provided."
            : "Authentication failed. Please verify your credentials.";

        triggerPopup(errorMsg, "error", isLogin ? "Sign In Failed" : "Registration Failed");
      }
    } catch (err) {
      console.error(err);
      triggerPopup(
        "Could not connect to the backend server. Please verify the API server is running.",
        "error",
        "Connection Error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      console.warn("Backend logout notification failed:", e);
    }
    localStorage.removeItem("documind_token");
    localStorage.removeItem("documind_user");
    localStorage.removeItem("documind_active_doc");
    localStorage.removeItem("documind_active_doc_id");
    setUser(null);
    setActiveDocument(null);
    setIsAuthenticated(false);
    setIsProfileMenuOpen(false);
    triggerPopup(
      language === "bn" ? "আপনি সফলভাবে লগআউট হয়েছেন।" : "You have been signed out successfully.",
      "info",
      t.logOut
    );
  };

  const getAvatarLetter = (name?: string, emailStr?: string) => {
    if (name && name.trim()) {
      return name.trim()[0].toUpperCase();
    }
    if (emailStr && emailStr.trim()) {
      return emailStr.trim()[0].toUpperCase();
    }
    return "N";
  };

  // Auth View
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center digital-grid-bg relative overflow-hidden p-4 transition-colors duration-200">
        <ErrorModal popup={popup} onClose={closePopup} />

        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-300/30 dark:bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 -right-24 w-96 h-96 bg-cyan-300/30 dark:bg-cyan-900/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-24 left-1/3 w-80 h-80 bg-rose-200/30 dark:bg-rose-900/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md p-8 sm:p-10 digital-glass-card rounded-3xl relative z-10 shadow-2xl shadow-indigo-500/10 border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-[#0e1320]">
          <div className="flex flex-col items-center mb-7">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[2px] shadow-lg shadow-indigo-500/25 mb-4 hover:scale-105 transition-transform">
              <div className="w-full h-full bg-white dark:bg-[#0a0e18] rounded-2xl flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
              <span>{t.tagline}</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{t.appName}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1 text-center">
              {isLogin
                ? language === "bn" ? "আপনার সুরক্ষিত ওয়ার্কস্পেসে প্রবেশ করুন" : "Sign in to access your grounded document intelligence"
                : language === "bn" ? "নতুন অ্যাকাউন্ট তৈরি করুন ও আরএজি ব্যবহার করুন" : "Create your account with isolated workspace storage"}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{t.fullName}</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  placeholder="e.g. Nuron Ahmed"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t.emailAddress}</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                placeholder="engineer@documind.ai"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{language === "bn" ? "পাসওয়ার্ড" : "Password"}</span>
                </label>
                {!isLogin && (
                  <span
                    className={`text-[11px] font-medium ${
                      password.length >= 8 ? "text-emerald-600 font-semibold" : "text-slate-400"
                    }`}
                  >
                    {password.length}/8 min chars
                  </span>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={!isLogin ? 8 : undefined}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                placeholder={!isLogin ? (language === "bn" ? "কমপক্ষে ৮ অক্ষর" : "Minimum 8 characters") : "••••••••••••"}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-sm font-semibold rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <span className="flex items-center justify-center gap-2">
                {loading
                  ? (language === "bn" ? "যাচাই করা হচ্ছে..." : "Authenticating...")
                  : isLogin
                  ? (language === "bn" ? "লগইন করুন" : "Launch Workspace")
                  : (language === "bn" ? "অ্যাকাউন্ট তৈরি করুন" : "Create Account")}
                <ArrowRight className="w-4 h-4" />
              </span>
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                closePopup();
              }}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 hover:underline cursor-pointer transition-colors"
            >
              {isLogin
                ? (language === "bn" ? "নতুন অ্যাকাউন্ট প্রয়োজন? নাম ও ইমেইল দিয়ে রেজিস্টার করুন" : "Need a new account? Register with name & email")
                : (language === "bn" ? "ইতিমধ্যে অ্যাকাউন্ট আছে? সাইন ইন করুন" : "Already have an account? Sign in instead")}
            </button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Multi-Tenant Row-Level Security & AES-256 Storage</span>
          </div>
        </div>
      </div>
    );
  }

  // Workspace Main View
  const displayName = user?.full_name || email.split("@")[0] || "Nuron";

  return (
    <div className="flex h-screen bg-slate-100/70 dark:bg-[#070a12] text-foreground overflow-hidden font-sans relative transition-colors duration-200">
      <ErrorModal popup={popup} onClose={closePopup} />

      {/* Settings Modal */}
      <SettingsModal
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        onSuccessToast={(msg) => triggerPopup(msg, "success", t.settings)}
      />

      {/* Session Notes Drawer */}
      <NotesDrawer
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        onToast={(msg, type) => triggerPopup(msg, type || "success", t.notes)}
      />

      {/* Mobile Drawer Backdrop */}
      {isMobileDrawerOpen && (
        <div
          onClick={() => setIsMobileDrawerOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar (Desktop inline resizable, Mobile slide-out drawer) */}
      <aside
        style={{
          width: isSidebarCollapsed ? 0 : `${sidebarWidth}px`,
        }}
        className={`fixed md:static inset-y-0 left-0 z-50 md:z-20 bg-white dark:bg-[#0b0f19] border-r border-slate-200/90 dark:border-slate-800/90 flex flex-col shadow-xl md:shadow-xs flex-shrink-0 transition-transform md:transition-none duration-300 ease-in-out ${
          isMobileDrawerOpen ? "translate-x-0 w-80" : "-translate-x-full md:translate-x-0"
        } ${isSidebarCollapsed ? "md:overflow-hidden md:border-r-0" : ""}`}
      >
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/60 dark:bg-[#0e1322]/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[2px] shadow-sm shadow-indigo-500/20 flex-shrink-0">
              <div className="w-full h-full bg-white dark:bg-[#0b0f19] rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight truncate">
                {t.appName}
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                  {t.digitalCoreActive}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Desktop Collapse Button */}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:flex p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>

            {/* Mobile Close Drawer Button */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(false)}
              className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Uploader */}
        <div className="p-3 sm:p-4 pb-2">
          <FileUploader />
        </div>

        {/* Documents */}
        <DocumentList />

        {/* Floating Profile Popover */}
        <ProfilePopover
          isOpen={isProfileMenuOpen}
          onClose={() => setIsProfileMenuOpen(false)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onLogout={handleLogout}
        />

        {/* Footer: User Profile Card */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0e1322]/80 mt-auto">
          <div
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            role="button"
            tabIndex={0}
            className="flex items-center justify-between bg-white dark:bg-[#121726] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-2.5 px-3 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800 hover:shadow-md cursor-pointer transition-all duration-200 select-none group"
          >
            <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#27272a] text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm border border-white/10 group-hover:bg-indigo-600 transition-colors">
                {getAvatarLetter(user?.full_name, user?.email)}
              </div>

              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {displayName}
                </span>
                <span className="text-slate-400 dark:text-slate-500 text-xs">•</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {t.freePlan}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ml-0.5 ${
                    isProfileMenuOpen ? "rotate-180 text-indigo-500" : ""
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded-lg transition-colors">
              <SettingsIcon className="w-4 h-4" />
            </div>
          </div>
        </div>
      </aside>

      {/* Mouse Drag Resizer Line (Desktop only) */}
      {!isSidebarCollapsed && (
        <div
          onMouseDown={handleMouseDown}
          onDoubleClick={() => setSidebarWidth(290)}
          title="Drag to resize sidebar (Double click to reset)"
          className="hidden md:block w-1.5 hover:w-2 hover:bg-indigo-500/50 cursor-col-resize transition-all duration-150 relative z-30 group"
        >
          <div className="w-full h-full bg-transparent group-hover:bg-indigo-500/40" />
        </div>
      )}

      {/* Uncollapse Sidebar Floating Button */}
      {isSidebarCollapsed && (
        <button
          type="button"
          onClick={() => setIsSidebarCollapsed(false)}
          className="hidden md:flex absolute top-4 left-4 z-30 p-2.5 rounded-xl bg-white dark:bg-[#121624] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 shadow-lg hover:border-indigo-400 cursor-pointer"
          title="Expand sidebar"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      )}

      {/* Main Content (Chat View) */}
      <main className="flex-1 flex flex-col h-full min-h-0 overflow-hidden relative">
        <ChatContainer onToggleSidebar={() => setIsMobileDrawerOpen(true)} />
      </main>
    </div>
  );
}
