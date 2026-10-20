"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User, Copy, Check, Sparkles, Maximize2, X, BookmarkPlus, BookmarkCheck, RotateCcw, AlertCircle, Code2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useStore } from "@/hooks/use-store";
import { translations } from "@/lib/translations";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  imageUrls?: string[];
  onSaveNote?: (text: string, title?: string) => void;
  isStreaming?: boolean;
  isError?: boolean;
  is401?: boolean;
  onRetry?: () => void;
}

// Dedicated ChatGPT/Claude style Code Block with horizontal scrolling & copy button
function CodeBlock({ language, code }: { language?: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayLang = (language || "code").toLowerCase();

  return (
    <div className="my-3.5 rounded-xl border border-slate-700/80 dark:border-slate-800 bg-[#0d1117] dark:bg-[#070b14] shadow-md max-w-full overflow-hidden not-prose">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#161b22] dark:bg-[#0e1424] border-b border-slate-700/60 dark:border-slate-800/80 text-xs font-mono text-slate-300 select-none">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Code2 className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">{displayLang}</span>
        </div>
        <button
          type="button"
          onClick={handleCopyCode}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-sans text-slate-300 hover:text-white hover:bg-slate-700/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>

      {/* Horizontally swipable / scrollable code content */}
      <div className="overflow-x-auto p-3.5 sm:p-4 digital-scrollbar overscroll-x-contain select-text selection:bg-indigo-600 selection:text-white">
        <pre className="font-mono text-xs sm:text-[13px] leading-relaxed text-slate-100 whitespace-pre tab-4 m-0 p-0 bg-transparent select-text selection:bg-indigo-600 selection:text-white">
          <code className="select-text selection:bg-indigo-600 selection:text-white">{code}</code>
        </pre>
      </div>
    </div>
  );
}

// Progressive AI Thinking Block (No seconds, realistic thought phases)
function ThinkingBlock({ language }: { language: string }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 1600);
    const t2 = setTimeout(() => setStage(2), 3600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const stageTextsEn = [
    "Thinking..........",
    "Analyzing document..........",
    "Synthesizing response..........",
  ];

  const stageTextsBn = [
    "চিন্তা করছে..........",
    "ডকুমেন্ট বিশ্লেষণ করছে..........",
    "রেসপন্স তৈরি করছে..........",
  ];

  const currentText = language === "bn" ? stageTextsBn[stage] : stageTextsEn[stage];

  return (
    <div className="flex flex-col gap-2 py-2.5 px-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-slate-50/70 to-cyan-50/40 dark:from-indigo-950/40 dark:via-[#101524] dark:to-cyan-950/20 border border-indigo-100/90 dark:border-indigo-900/50 shadow-xs w-fit max-w-sm animate-in fade-in duration-200 not-prose my-1">
      <div className="flex items-center gap-2.5">
        <div className="w-5 h-5 rounded-lg bg-indigo-100 dark:bg-indigo-900/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 animate-spin" />
        </div>
        <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 tracking-wide font-sans">
          {currentText}
        </span>
        <span className="flex items-center gap-1 ml-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"></span>
        </span>
      </div>

      {/* Subtle modern Shimmer Bar */}
      <div className="h-1 rounded-full bg-gradient-to-r from-indigo-300/70 via-cyan-300/60 to-indigo-200/40 dark:from-indigo-800/70 dark:via-cyan-800/60 dark:to-indigo-900/40 animate-pulse w-36 ml-7" />
    </div>
  );
}

export function MessageBubble({ role, content, imageUrl, imageUrls, onSaveNote, isStreaming, isError, is401, onRetry }: MessageBubbleProps) {
  const isUser = role === "user";
  const { language } = useStore();
  const t = translations[language];

  const [copied, setCopied] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Compute all attached images (supports both imageUrls array and single imageUrl string)
  const allImages: string[] = useMemo(() => {
    if (imageUrls && imageUrls.length > 0) return imageUrls;
    if (!imageUrl) return [];
    try {
      const parsed = JSON.parse(imageUrl);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return [imageUrl];
  }, [imageUrl, imageUrls]);

  const contentRef = useRef<HTMLDivElement>(null);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveFullNote = () => {
    if (!content || !onSaveNote) return;
    const selected = typeof window !== "undefined" ? window.getSelection()?.toString().trim() : "";
    if (selected && selected.length > 2 && contentRef.current && contentRef.current.contains(window.getSelection()?.anchorNode || null)) {
      const firstLine = selected.split("\n")[0];
      const title = firstLine.slice(0, 45) + (firstLine.length > 45 ? "..." : "");
      onSaveNote(selected, title);
    } else {
      onSaveNote(content);
    }
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  };

  return (
    <div className={`flex w-full mb-5 ${isUser ? "justify-end" : "justify-start"} animate-in fade-in-50 duration-300`}>
      <div className={`flex w-full ${isUser ? "max-w-[85%] sm:max-w-[78%] flex-row-reverse" : "max-w-full sm:max-w-[92%] md:max-w-[88%] flex-row"} items-start gap-3 min-w-0`}>
        {/* Avatar */}
        <Avatar className={`w-8.5 h-8.5 flex-shrink-0 shadow-2xs border ${
          isUser 
            ? "border-slate-300 dark:border-slate-700 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900" 
            : "border-indigo-200 dark:border-indigo-800 bg-gradient-to-tr from-indigo-500 via-indigo-600 to-cyan-500 text-white"
        }`}>
          <AvatarFallback className="bg-transparent font-semibold">
            {isUser ? <User className="w-4 h-4 text-white dark:text-slate-900" /> : <Bot className="w-4 h-4 text-white" />}
          </AvatarFallback>
        </Avatar>
        
        {/* Bubble */}
        <div className="flex flex-col group/msg relative min-w-0 max-w-full w-full select-text">
          <div
            className={`px-4.5 py-3.5 rounded-2xl relative transition-all duration-200 min-w-0 max-w-full select-text ${
              isUser
                ? "bg-slate-100/95 dark:bg-[#192033] text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800/80 rounded-tr-xs shadow-2xs hover:border-slate-300 dark:hover:border-slate-700/80 selection:bg-indigo-600 selection:text-white dark:selection:bg-indigo-500 dark:selection:text-white"
                : "bg-white/95 dark:bg-[#111625] text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-800/90 rounded-tl-xs shadow-xs hover:shadow-sm dark:hover:border-slate-700/80 backdrop-blur-md overflow-hidden select-text selection:bg-indigo-600 selection:text-white dark:selection:bg-indigo-500 dark:selection:text-white"
            }`}
          >
            {/* Attached Images (1, 2, or 3 images grid) */}
            {allImages.length > 0 && (
              <div className={`mb-3 ${
                allImages.length === 1 
                  ? "inline-block max-w-full sm:max-w-xs md:max-w-sm" 
                  : allImages.length === 2 
                  ? "grid grid-cols-2 gap-2 max-w-sm sm:max-w-md" 
                  : "grid grid-cols-3 gap-2 max-w-md sm:max-w-lg"
              }`}>
                {allImages.map((img, idx) => (
                  <div key={idx} className="relative group/img rounded-xl overflow-hidden border border-white/20 dark:border-slate-800 shadow-sm bg-black/5">
                    <img
                      src={img}
                      alt={`Attachment ${idx + 1}`}
                      onClick={() => setPreviewImage(img)}
                      className={`w-full ${allImages.length === 1 ? "max-h-64 object-cover" : "h-28 sm:h-36 object-cover"} cursor-pointer hover:opacity-95 transition-all`}
                    />
                    <button
                      type="button"
                      onClick={() => setPreviewImage(img)}
                      className="absolute bottom-1.5 right-1.5 p-1 rounded-lg bg-black/60 text-white opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-black/80 cursor-pointer"
                      title="Expand image"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Role Header for Assistant */}
            {!isUser && (
              <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
                  <span>DocuMind Intelligence</span>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                  {/* Save Full Response as Note Button */}
                  {onSaveNote && content && (
                    <button
                      type="button"
                      onClick={handleSaveFullNote}
                      title={noteSaved ? (language === "bn" ? "নোট সেভ হয়েছে!" : "Saved to notes!") : (t.saveAsNote || "Save as Note")}
                      className={`cursor-pointer p-1 rounded transition-colors flex items-center gap-1 text-xs ${
                        noteSaved
                          ? "text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40"
                          : "text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                      }`}
                    >
                      {noteSaved ? (
                        <>
                          <BookmarkCheck className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">Saved</span>
                        </>
                      ) : (
                        <BookmarkPlus className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}

                  {/* Copy Button */}
                  <button
                    type="button"
                    onClick={handleCopy}
                    title="Copy message"
                    className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {isUser ? (
              <div className="whitespace-pre-wrap text-sm md:text-[14.5px] leading-relaxed font-normal break-words selection:bg-indigo-600 selection:text-white dark:selection:bg-indigo-500 dark:selection:text-white">
                {content}
              </div>
            ) : (
              <div
                ref={contentRef}
                className="prose prose-slate dark:prose-invert max-w-none text-sm md:text-[14.5px] leading-relaxed break-words [overflow-wrap:anywhere] select-text selection:bg-indigo-600 selection:text-white dark:selection:bg-indigo-500 dark:selection:text-white prose-headings:font-semibold prose-headings:text-slate-800 dark:prose-headings:text-white prose-p:my-2 prose-pre:p-0 prose-pre:bg-transparent prose-pre:border-0"
              >
                {isError ? (
                  <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 not-prose space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 flex-shrink-0" />
                      <div className="text-xs leading-relaxed font-medium">
                        <ReactMarkdown>{content}</ReactMarkdown>
                      </div>
                    </div>
                    {onRetry && (
                      <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/40 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={onRetry}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{language === "bn" ? "আবার চেষ্টা করুন (Try Again)" : "Try Again"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : !content ? (
                  <ThinkingBlock language={language} />
                ) : (
                  <>
                    {isStreaming && (
                      <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 not-prose">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                        <span>{language === "bn" ? "রেসপন্স তৈরি হচ্ছে..." : "Generating response..."}</span>
                      </div>
                    )}
                    <ReactMarkdown
                      components={{
                        code({ node, inline, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || "");
                          const codeString = String(children).replace(/\n$/, "");
                          const isMultiLine = codeString.includes("\n");

                          if (!inline && (match || isMultiLine)) {
                            return (
                              <CodeBlock
                                language={match ? match[1] : undefined}
                                code={codeString}
                              />
                            );
                          }

                          return (
                            <code
                              className="font-mono text-xs px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 text-indigo-600 dark:text-indigo-400 font-semibold border border-slate-200/80 dark:border-slate-700/60 break-all inline-block select-text selection:bg-indigo-600 selection:text-white"
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        },
                        pre({ children }: any) {
                          return <div className="my-2 select-text">{children}</div>;
                        },
                        table({ children }: any) {
                          return (
                            <div className="overflow-x-auto my-3 rounded-xl border border-slate-200 dark:border-slate-800 digital-scrollbar overscroll-x-contain select-text">
                              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm select-text">
                                {children}
                              </table>
                            </div>
                          );
                        },
                        th({ children }: any) {
                          return (
                            <th className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/60 font-semibold text-slate-700 dark:text-slate-200 text-xs text-left select-text">
                              {children}
                            </th>
                          );
                        },
                        td({ children }: any) {
                          return (
                            <td className="px-3.5 py-2 border-t border-slate-100 dark:border-slate-800/60 text-slate-600 dark:text-slate-300 text-xs select-text">
                              {children}
                            </td>
                          );
                        },
                        p({ children }: any) {
                          return <p className="leading-relaxed my-2 break-words select-text">{children}</p>;
                        },
                        ul({ children }: any) {
                          return <ul className="list-disc pl-5 my-2 space-y-1 select-text">{children}</ul>;
                        },
                        ol({ children }: any) {
                          return <ol className="list-decimal pl-5 my-2 space-y-1 select-text">{children}</ol>;
                        },
                        li({ children }: any) {
                          return <li className="leading-relaxed break-words select-text">{children}</li>;
                        },
                      }}
                    >
                      {content}
                    </ReactMarkdown>
                    {isStreaming && (
                      <span className="inline-block w-1.5 h-4 ml-0.5 bg-indigo-500 animate-pulse align-middle" />
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Fullscreen Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewImage}
              alt="Expanded preview"
              className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain border border-white/10"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 p-2 bg-slate-900 text-white rounded-full hover:bg-slate-800 shadow-lg border border-white/20 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
