"use client";

import { useState, useEffect, useRef } from "react";
import { BookmarkPlus, Check } from "lucide-react";
import { createPortal } from "react-dom";

interface FloatingSelectionToolbarProps {
  onSaveNote: (text: string, title?: string) => Promise<void> | void;
  language: "en" | "bn";
}

export function FloatingSelectionToolbar({ onSaveNote, language }: FloatingSelectionToolbarProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState("");
  const [saved, setSaved] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      // If clicking inside the toolbar itself, ignore
      if (toolbarRef.current && toolbarRef.current.contains(e.target as Node)) {
        return;
      }

      // Only respond to left click release
      if (e.button !== 0) return;

      // Small delay to allow browser to finalize native selection range
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          setVisible(false);
          return;
        }

        const text = selection.toString().trim();
        if (text.length <= 2) {
          setVisible(false);
          return;
        }

        // Check if selection is inside an assistant message prose container
        const anchorNode = selection.anchorNode;
        const parentEl = anchorNode instanceof HTMLElement ? anchorNode : anchorNode?.parentElement;
        const assistantProse = parentEl?.closest(".prose");

        // Do not trigger inside code blocks, interactive buttons, or input elements
        if (!assistantProse || parentEl?.closest("pre, code, input, textarea, button")) {
          setVisible(false);
          return;
        }

        // Calculate viewport coordinates of the selection
        try {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            setPosition({
              x: rect.left + rect.width / 2,
              y: rect.top - 10,
            });
            setSelectedText(text);
            setVisible(true);
            setSaved(false);
          }
        } catch {
          setVisible(false);
        }
      }, 15);
    };

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setVisible(false);
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedText) return;

    const firstLine = selectedText.split("\n")[0];
    const title = firstLine.slice(0, 45) + (firstLine.length > 45 ? "..." : "");
    onSaveNote(selectedText, title);
    setSaved(true);

    setTimeout(() => {
      setVisible(false);
      setSaved(false);
      setSelectedText("");
    }, 1200);
  };

  if (!mounted || !visible) return null;

  return createPortal(
    <div
      ref={toolbarRef}
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translate(-50%, -100%)",
        zIndex: 9999,
      }}
      className="animate-in fade-in-50 zoom-in-95 duration-150 pointer-events-auto"
    >
      <button
        type="button"
        onMouseDown={(e) => {
          // Crucial: prevent native selection from being deselected on mousedown
          e.preventDefault();
        }}
        onClick={handleSave}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/95 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold shadow-xl border border-slate-700/50 dark:border-slate-300 hover:scale-105 active:scale-95 transition-transform cursor-pointer backdrop-blur-md select-none"
      >
        {saved ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
            <span>{language === "bn" ? "নোট হিসেবে সেভ হয়েছে!" : "Saved to Notes!"}</span>
          </>
        ) : (
          <>
            <BookmarkPlus className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
            <span>{language === "bn" ? "নির্বাচিত অংশ নোটে সেভ করুন" : "Save selection as note"}</span>
          </>
        )}
      </button>
    </div>,
    document.body
  );
}
