"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Send,
  Loader2,
  ArrowDown,
  Sparkles,
  FileText,
  Cpu,
  Compass,
  HelpCircle,
  Zap,
  Image as ImageIcon,
  X,
  Menu,
  Paperclip,
  StickyNote,
  Plus,
} from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { useStreamingChat } from "@/hooks/use-streaming-chat";
import { MessageBubble } from "./message-bubble";
import { FloatingSelectionToolbar } from "./floating-selection-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { translations } from "@/lib/translations";
import { API_BASE_URL } from "@/lib/api";

interface ChatContainerProps {
  onToggleSidebar?: () => void;
}

export function ChatContainer({ onToggleSidebar }: ChatContainerProps) {
  const { activeDocument, language, notes, addNote, setIsNotesOpen } = useStore();
  const t = translations[language];
  const { messages, isStreaming, sendMessage, loadHistory, setMessages, retryLastMessage } = useStreamingChat(activeDocument?.id);

  interface AttachedImage {
    id: string;
    url: string;
    name: string;
  }

  const [input, setInput] = useState("");
  const [selectedImages, setSelectedImages] = useState<AttachedImage[]>([]);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Save note handler for full response or selected snippet
  const handleSaveNote = async (contentToSave: string, customTitle?: string) => {
    if (!contentToSave.trim()) return;
    const token = localStorage.getItem("documind_token");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          document_id: activeDocument?.id,
          document_title: activeDocument?.filename,
          title: customTitle,
          content: contentToSave.trim(),
        }),
      });

      if (res.ok) {
        const saved = await res.json();
        addNote(saved);
      }
    } catch (err) {
      console.error("Failed to save note:", err);
    }
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAutoScrollingRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Dynamic auto-expanding height & scrolling (ChatGPT / Gemini style)
  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = 190; // max height (~8 lines) before vertical scrolling kicks in
    const scrollHeight = el.scrollHeight;
    if (scrollHeight > maxHeight) {
      el.style.height = `${maxHeight}px`;
      el.style.overflowY = "auto";
    } else {
      el.style.height = `${Math.max(scrollHeight, 42)}px`;
      el.style.overflowY = "hidden";
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send message on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Load history when active document changes
  useEffect(() => {
    if (activeDocument) {
      setMessages([]);
      loadHistory();
      isAutoScrollingRef.current = true;
    } else {
      setMessages([]);
    }
  }, [activeDocument, loadHistory, setMessages]);

  // Handle scroll detection for previous chat reading
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom > 120) {
      isAutoScrollingRef.current = false;
      setShowScrollBottom(true);
    } else {
      isAutoScrollingRef.current = true;
      setShowScrollBottom(false);
    }
  }, []);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior });
    }
  };

  useEffect(() => {
    if (isAutoScrollingRef.current) {
      scrollToBottom("smooth");
    }
  }, [messages]);

  // Multiple image file select handler (supports 1, 2, or max 3 images)
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = 3 - selectedImages.length;
    if (remainingSlots <= 0) {
      setUploadWarning(
        language === "bn"
          ? "সর্বোচ্চ ৩টি ছবি আপলোড করা যাবে।"
          : "Maximum 3 images can be attached."
      );
      setTimeout(() => setUploadWarning(null), 3500);
      e.target.value = "";
      return;
    }

    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      alert(
        language === "bn"
          ? "অনুগ্রহ করে ভ্যালিড ছবি ফাইল (PNG, JPG, WEBP) সিলেক্ট করুন।"
          : "Please select valid image files (PNG, JPG, WEBP)."
      );
      e.target.value = "";
      return;
    }

    if (imageFiles.length > remainingSlots) {
      setUploadWarning(
        language === "bn"
          ? `সর্বোচ্চ ৩টি ছবি নেওয়া সম্ভব। প্রথম ${remainingSlots}টি ছবি যোগ করা হয়েছে।`
          : `Only ${remainingSlots} more image(s) allowed (maximum 3 total).`
      );
      setTimeout(() => setUploadWarning(null), 4000);
    }

    const filesToProcess = imageFiles.slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const resultUrl = event.target?.result as string;
        if (resultUrl) {
          setSelectedImages((prev) => {
            if (prev.length >= 3) return prev;
            return [
              ...prev,
              {
                id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                url: resultUrl,
                name: file.name,
              },
            ];
          });
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  // Clipboard paste support for images (up to 3 total)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const remainingSlots = 3 - selectedImages.length;
    if (remainingSlots <= 0) return;

    const imageItems: DataTransferItem[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        imageItems.push(items[i]);
      }
    }

    if (imageItems.length === 0) return;

    const itemsToProcess = imageItems.slice(0, remainingSlots);
    itemsToProcess.forEach((item, index) => {
      const file = item.getAsFile();
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const resultUrl = event.target?.result as string;
          if (resultUrl) {
            setSelectedImages((prev) => {
              if (prev.length >= 3) return prev;
              return [
                ...prev,
                {
                  id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                  url: resultUrl,
                  name: file.name || `Pasted Image ${index + 1}`,
                },
              ];
            });
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeSelectedImage = (id: string) => {
    setSelectedImages((prev) => prev.filter((img) => img.id !== id));
    setUploadWarning(null);
  };

  const clearAllSelectedImages = () => {
    setSelectedImages([]);
    setUploadWarning(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && selectedImages.length === 0) || isStreaming || !activeDocument || activeDocument.status === "processing") return;

    isAutoScrollingRef.current = true;
    const imageUrlsToSend = selectedImages.map((img) => img.url);
    sendMessage(input.trim(), imageUrlsToSend.length > 0 ? imageUrlsToSend : undefined);

    setInput("");
    setSelectedImages([]);
    setUploadWarning(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "42px";
      textareaRef.current.style.overflowY = "hidden";
    }
    setTimeout(() => scrollToBottom("smooth"), 50);
  };

  const handleSuggestionClick = (question: string) => {
    if (isStreaming) return;
    isAutoScrollingRef.current = true;
    sendMessage(question);
    setTimeout(() => scrollToBottom("smooth"), 50);
  };

  if (!activeDocument) {
    return (
      <div className="flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-[#090d16] digital-grid-bg relative overflow-hidden transition-colors duration-200">
        {/* Mobile Header Bar */}
        <div className="md:hidden h-14 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center px-4 justify-between bg-white/80 dark:bg-[#0e1320]/90 backdrop-blur-md sticky top-0 z-20">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="cursor-pointer text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <span className="text-xs font-bold text-slate-800 dark:text-white">{t.appName}</span>
          <div className="w-8" />
        </div>

        {/* Subtle Ambient Color Spheres */}
        <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-indigo-200/40 dark:bg-indigo-900/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-cyan-200/40 dark:bg-cyan-900/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center relative z-10 p-8 digital-glass-card rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-indigo-500/5 bg-white/95 dark:bg-[#101524]">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-tr from-indigo-500 via-violet-500 to-cyan-400 p-[2px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-white dark:bg-[#0c101c] rounded-2xl flex items-center justify-center">
                <Cpu className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{t.welcomeTitle}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              {t.welcomeDesc}
            </p>
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 py-2 px-3 rounded-full">
              <Sparkles className="w-4 h-4 text-cyan-500" />
              <span>Gemini 1.5 Flash • Multimodal RAG Active</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const suggestions = [
    { text: t.suggest1, icon: Compass, color: "text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/60 hover:border-indigo-300 bg-indigo-50/30 dark:bg-indigo-950/20" },
    { text: t.suggest2, icon: Sparkles, color: "text-cyan-600 dark:text-cyan-400 border-cyan-100 dark:border-cyan-900/60 hover:border-cyan-300 bg-cyan-50/30 dark:bg-cyan-950/20" },
    { text: t.suggest3, icon: Zap, color: "text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/60 hover:border-amber-300 bg-amber-50/30 dark:bg-amber-950/20" },
    { text: t.suggest4, icon: HelpCircle, color: "text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900/60 hover:border-violet-300 bg-violet-50/30 dark:bg-violet-950/20" },
  ];

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-slate-50/50 dark:bg-[#090d16] digital-grid-bg relative overflow-hidden transition-colors duration-200">
      {/* Header */}
      <header className="h-16 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center px-4 sm:px-6 justify-between bg-white/85 dark:bg-[#0e1320]/95 backdrop-blur-md sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile hamburger menu */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="md:hidden cursor-pointer text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0"
            title={t.toggleSidebar}
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400">
            <FileText className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate max-w-[180px] sm:max-w-xs md:max-w-md lg:max-w-lg">
              {activeDocument.filename}
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              {activeDocument.status === "processing" ? (
                <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                  <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-500" />
                  {t.docProcessing}
                </span>
              ) : activeDocument.status === "failed" ? (
                <span className="flex items-center gap-1 font-medium text-rose-500">
                  {t.docFailed}
                </span>
              ) : (
                <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {t.ragIndexed}
                </span>
              )}
              <span>•</span>
              <span>{new Date(activeDocument.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
          {/* Notes Drawer Toggle Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsNotesOpen(true)}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-xl border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 hover:border-amber-400 dark:hover:border-amber-500 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all hover:bg-amber-50/50 dark:hover:bg-amber-950/20"
            title={t.sessionNotes}
          >
            <StickyNote className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">{t.notes}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400">
              {notes.length}
            </span>
          </Button>

          {/* Thinking Status Indicator (Shown only while AI is thinking/streaming) */}
          {isStreaming && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50/90 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 text-xs font-semibold animate-pulse shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
              </span>
              <span>{language === "bn" ? "চিন্তা করছে..." : "Thinking..."}</span>
            </div>
          )}
        </div>
      </header>

      {/* Celery & Redis Background Processing Banner */}
      {activeDocument.status === "processing" && (
        <div className="mx-4 sm:mx-8 mt-3 p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex items-center gap-3 text-xs text-amber-800 dark:text-amber-200 shadow-xs animate-in fade-in">
          <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <span className="font-bold">{t.docProcessing}</span> — {t.docProcessingNotice}
          </div>
        </div>
      )}

      {/* Messages Scroll Viewport */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-6 space-y-4 digital-scrollbar relative"
        id="chat-scroll-container"
      >
        <div className="max-w-3xl mx-auto pb-6 w-full min-w-0">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center mt-6 sm:mt-10 space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-400 p-[2px] shadow-md shadow-indigo-500/15">
                <div className="w-full h-full bg-white dark:bg-[#0c101c] rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">{t.askAnything}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                  {language === "bn" ? (
                    <>ডকুমাইন্ড <span className="font-semibold text-slate-700 dark:text-slate-200">{activeDocument.filename}</span> এবং সংযুক্ত ছবি থেকে রিয়েল-টাইমে বিশ্লেষণ প্রদান করে।</>
                  ) : (
                    <>DocuMind extracts context-specific knowledge from <span className="font-semibold text-slate-700 dark:text-slate-200">{activeDocument.filename}</span> & multimodal images.</>
                  )}
                </p>
              </div>

              {/* Suggestions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl pt-2">
                {suggestions.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSuggestionClick(item.text)}
                      className={`cursor-pointer group flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${item.color} bg-white dark:bg-[#121624]`}
                    >
                      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white leading-snug">
                        {item.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <MessageBubble
                key={i}
                role={msg.role}
                content={msg.content}
                imageUrl={msg.image_url}
                imageUrls={msg.image_urls}
                onSaveNote={handleSaveNote}
                isStreaming={isStreaming && i === messages.length - 1 && msg.role === "assistant"}
                isError={msg.isError}
                is401={msg.is401}
                onRetry={retryLastMessage}
              />
            ))
          )}
        </div>
      </div>

      {/* Floating Jump to Bottom Button */}
      {showScrollBottom && (
        <div className="absolute bottom-28 right-6 sm:right-8 z-30 animate-in fade-in-50 zoom-in-95 duration-200">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              isAutoScrollingRef.current = true;
              scrollToBottom("smooth");
              setShowScrollBottom(false);
            }}
            className="cursor-pointer shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-3.5 py-1.5 text-xs flex items-center gap-1.5 border border-indigo-400/30 transition-all hover:scale-105"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>{t.latestMessage}</span>
          </Button>
        </div>
      )}

      {/* Chat Input Area */}
      <div className="p-3 sm:p-4 bg-white/90 dark:bg-[#0c101c]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 z-20">
        <div className="max-w-3xl mx-auto">
          {/* Warning Banner if user tries to attach > 3 images */}
          {uploadWarning && (
            <div className="mb-2 p-2 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between animate-in fade-in duration-200">
              <span className="font-medium">{uploadWarning}</span>
              <button
                type="button"
                onClick={() => setUploadWarning(null)}
                className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 ml-2 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Attached Images Preview Strip (Supports 1, 2, or 3 images) */}
          {selectedImages.length > 0 && (
            <div className="mb-2.5 p-2.5 rounded-2xl bg-indigo-50/80 dark:bg-[#141a29] border border-indigo-100 dark:border-indigo-900/60 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>
                      {language === "bn" ? "সংযুক্ত ছবি" : "Attached Images"}
                    </span>
                  </div>
                  <Badge className="text-[10px] h-4 px-1.5 bg-indigo-600 text-white font-medium">
                    {selectedImages.length}/3
                  </Badge>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                    • {language === "bn" ? "জেমিনাই ১.৫ ফ্ল্যাশ ভিশন প্রস্তুত" : "Gemini 1.5 Flash Vision Ready"}
                  </span>
                </div>
                {selectedImages.length > 1 && (
                  <button
                    type="button"
                    onClick={clearAllSelectedImages}
                    className="text-[11px] font-medium text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    {language === "bn" ? "সব মুছুন" : "Clear all"}
                  </button>
                )}
              </div>

              {/* Thumbnails Row */}
              <div className="flex items-center gap-2.5 overflow-x-auto py-0.5">
                {selectedImages.map((img, idx) => (
                  <div
                    key={img.id}
                    className="relative group flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex-shrink-0 max-w-[200px]"
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800 bg-black flex-shrink-0">
                      <img
                        src={img.url}
                        alt={img.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col min-w-0 pr-1">
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate max-w-[95px]">
                        {img.name}
                      </span>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                        Image {idx + 1}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSelectedImage(img.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer ml-auto flex-shrink-0"
                      title={t.removeImage}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* Add Image Slot if < 3 */}
                {selectedImages.length < 3 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-13 px-3 flex items-center gap-1.5 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800/80 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-medium transition-colors cursor-pointer flex-shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === "bn" ? "+ ছবি যোগ করুন" : "+ Add image"}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            onPaste={handlePaste}
            className="relative flex items-end shadow-lg shadow-indigo-500/5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121624] focus-within:border-indigo-500 dark:focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all duration-200 p-1.5 md:p-2"
          >
            {/* Hidden File Input for Multiple Images */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />

            {/* Image Attach Button */}
            <button
              type="button"
              onClick={() => {
                if (selectedImages.length >= 3) {
                  setUploadWarning(
                    language === "bn"
                      ? "সর্বোচ্চ ৩টি ছবি আপলোড করা যাবে।"
                      : "Maximum 3 images can be attached."
                  );
                  setTimeout(() => setUploadWarning(null), 3000);
                  return;
                }
                fileInputRef.current?.click();
              }}
              className={`p-2 rounded-xl transition-colors cursor-pointer flex-shrink-0 relative mb-0.5 ${
                selectedImages.length > 0
                  ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60"
                  : "text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/80"
              }`}
              title={
                selectedImages.length >= 3
                  ? (translations[language].maxImagesReached || "Maximum 3 images limit reached")
                  : (translations[language].attachImages || "Attach up to 3 images")
              }
            >
              <ImageIcon className="w-5 h-5" />
              {selectedImages.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {selectedImages.length}
                </span>
              )}
            </button>

            {/* Dynamic Auto-expanding Textarea (ChatGPT / Gemini style) */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedImages.length > 0
                  ? language === "bn"
                    ? `${selectedImages.length}টি ছবি বা ডকুমেন্ট সম্পর্কে প্রশ্ন লিখুন...`
                    : `Ask a question about ${selectedImages.length === 1 ? "this image" : `these ${selectedImages.length} images`} or document...`
                  : language === "bn"
                  ? `${activeDocument.filename} সম্পর্কে প্রশ্ন করুন...`
                  : `Ask a question about ${activeDocument.filename}...`
              }
              disabled={isStreaming}
              className="flex-1 min-h-[42px] max-h-[190px] py-2.5 px-3 resize-none bg-transparent border-0 focus:outline-none focus:ring-0 text-sm md:text-base text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 leading-relaxed digital-scrollbar"
            />

            {/* Send Button */}
            <div className="mb-0.5">
              <Button
                type="submit"
                size="icon"
                disabled={(!input.trim() && selectedImages.length === 0) || isStreaming}
                className={`w-9 h-9 md:w-10 md:h-10 rounded-xl cursor-pointer transition-all duration-300 ${
                  (input.trim() || selectedImages.length > 0) && !isStreaming
                    ? "bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 text-white shadow-md shadow-indigo-500/30 hover:scale-105 active:scale-95"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                }`}
              >
                {isStreaming ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <Send className="w-4 h-4 ml-0.5" />
                )}
              </Button>
            </div>
          </form>

          {/* Footer Shortcuts */}
          <div className="flex items-center justify-center gap-3 text-center text-[11px] text-slate-400 dark:text-slate-500 mt-2">
            <span>{t.pressEnter}</span>
            <span>•</span>
            <span>Paste images (Ctrl+V)</span>
            <span>•</span>
            <span>{t.groundedRag}</span>
          </div>
        </div>
      </div>

      {/* Floating Note Selection Toolbar (Isolated Portal, does not re-render bubbles) */}
      <FloatingSelectionToolbar onSaveNote={handleSaveNote} language={language} />
    </div>
  );
}
