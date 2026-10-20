"use client";

import { useState, useMemo } from "react";
import {
  BookmarkCheck,
  Search,
  Trash2,
  Copy,
  Check,
  FileText,
  Calendar,
  X,
  StickyNote,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useStore, Note } from "@/hooks/use-store";
import { translations } from "@/lib/translations";
import { API_BASE_URL } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onToast?: (msg: string, type?: "success" | "error") => void;
}

export function NotesDrawer({ isOpen, onClose, onToast }: NotesDrawerProps) {
  const { notes, removeNote, activeDocument, language } = useStore();
  const t = translations[language];

  const [search, setSearch] = useState("");
  const [filterDoc, setFilterDoc] = useState<"all" | "current">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [selectedNoteForModal, setSelectedNoteForModal] = useState<Note | null>(null);

  // Toggle individual note expand state
  const toggleExpand = (noteId: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [noteId]: !prev[noteId],
    }));
  };

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      // Document filter
      if (filterDoc === "current" && activeDocument) {
        if (n.document_id !== activeDocument.id) return false;
      }
      // Search filter
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesContent = n.content.toLowerCase().includes(query);
        const matchesTitle = n.title?.toLowerCase().includes(query);
        const matchesDoc = n.document_title?.toLowerCase().includes(query);
        return matchesContent || matchesTitle || matchesDoc;
      }
      return true;
    });
  }, [notes, filterDoc, activeDocument, search]);

  const handleCopyNote = (note: Note) => {
    navigator.clipboard.writeText(note.content);
    setCopiedId(note.id);
    if (onToast) onToast(t.copied, "success");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const token = localStorage.getItem("documind_token");
      const res = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        removeNote(noteId);
        if (selectedNoteForModal?.id === noteId) {
          setSelectedNoteForModal(null);
        }
        if (onToast) onToast(language === "bn" ? "নোট সফলভাবে মুছে ফেলা হয়েছে!" : "Note deleted successfully!", "success");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-xs z-40 animate-in fade-in duration-200"
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] md:w-[540px] bg-white dark:bg-[#0d121f] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#0f1526]/80 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 flex items-center justify-center flex-shrink-0">
              <StickyNote className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {t.sessionNotes}
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800">
                  {notes.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {language === "bn"
                  ? "আপনার সেভ করা সব গুরুত্বপূর্ণ নোট ও পয়েন্টসমূহ"
                  : "All your saved AI insights & session takeaways"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3 bg-white dark:bg-[#0d121f] flex-shrink-0">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchNotes}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFilterDoc("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterDoc === "all"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {t.allNotes} ({notes.length})
            </button>
            {activeDocument && (
              <button
                type="button"
                onClick={() => setFilterDoc("current")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 truncate max-w-[240px] ${
                  filterDoc === "current"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <FileText className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{activeDocument.filename}</span>
              </button>
            )}
          </div>
        </div>

        {/* Notes List Viewport */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5 digital-scrollbar overscroll-contain">
          {filteredNotes.map((note) => {
            const isExpanded = !!expandedIds[note.id];
            const isLong = note.content.length > 200 || note.content.split("\n").length > 4;

            return (
              <div
                key={note.id}
                className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#121726] shadow-xs hover:shadow-md hover:border-indigo-300 dark:hover:border-slate-700 transition-all duration-200 group flex flex-col"
              >
                {/* Note Header: Title & Actions */}
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                    {note.title || (language === "bn" ? "সংরক্ষিত নোট" : "Saved Note")}
                  </h4>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Expand Reader Modal Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedNoteForModal(note)}
                      title={t.expandFull}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Copy Button */}
                    <button
                      type="button"
                      onClick={() => handleCopyNote(note)}
                      title={t.copyNote}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {copiedId === note.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      title={t.deleteNote}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Note Content (Scrollable & Expandable) */}
                <div
                  className={`rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60 p-3.5 transition-all duration-200 ${
                    isExpanded
                      ? "max-h-none"
                      : "max-h-60 overflow-y-auto digital-scrollbar overscroll-contain"
                  }`}
                >
                  <div className="prose prose-slate dark:prose-invert max-w-none text-xs leading-relaxed prose-p:my-1 prose-headings:text-xs prose-headings:font-bold prose-headings:my-1.5 prose-ul:my-1 prose-li:my-0.5 prose-pre:p-2 prose-pre:bg-slate-900 dark:prose-pre:bg-slate-950 prose-code:text-indigo-600 dark:prose-code:text-indigo-400 prose-code:text-[11px] prose-code:bg-indigo-50 dark:prose-code:bg-indigo-950/40 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
                    <ReactMarkdown>{note.content}</ReactMarkdown>
                  </div>
                </div>

                {/* Show More / Show Less Toggle for Long Notes */}
                {isLong && (
                  <button
                    type="button"
                    onClick={() => toggleExpand(note.id)}
                    className="mt-2 self-start flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer py-0.5"
                  >
                    <span>{isExpanded ? t.showLess : t.showMore}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                )}

                {/* Footer Meta: Document Name & Date */}
                <div className="flex items-center justify-between mt-3 text-[10px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400 truncate max-w-[240px]">
                    <FileText className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{note.document_title || "General Note"}</span>
                  </span>
                  <span className="flex items-center gap-1 flex-shrink-0">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(note.created_at).toLocaleDateString()}</span>
                  </span>
                </div>
              </div>
            );
          })}

          {/* Empty State */}
          {filteredNotes.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center p-8 mt-12 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-500 border border-amber-200 dark:border-amber-900/40 flex items-center justify-center">
                <BookmarkCheck className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {t.noNotes}
              </h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed">
                {t.noNotesDesc}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Full Note Detail Modal */}
      {selectedNoteForModal && (
        <Dialog
          open={!!selectedNoteForModal}
          onOpenChange={(open) => !open && setSelectedNoteForModal(null)}
        >
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col bg-white dark:bg-[#0e1322] border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-start justify-between pr-6">
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                  {selectedNoteForModal.title || (language === "bn" ? "সংরক্ষিত নোট" : "Saved Note")}
                </DialogTitle>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                  <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{selectedNoteForModal.document_title || "General Note"}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(selectedNoteForModal.created_at).toLocaleString()}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyNote(selectedNoteForModal)}
                  title={t.copyNote}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-semibold cursor-pointer transition-colors"
                >
                  {copiedId === selectedNoteForModal.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{t.copied}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{t.copyNote}</span>
                    </>
                  )}
                </button>
              </div>
            </DialogHeader>

            {/* Note Full Text Body */}
            <div className="flex-1 min-h-0 overflow-y-auto py-4 px-2 digital-scrollbar overscroll-contain">
              <div className="prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-white prose-pre:bg-slate-900 dark:prose-pre:bg-slate-950 prose-pre:rounded-xl prose-pre:p-4 prose-code:text-indigo-600 dark:prose-code:text-indigo-400 prose-code:bg-indigo-50 dark:prose-code:bg-indigo-950/40 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded">
                <ReactMarkdown>{selectedNoteForModal.content}</ReactMarkdown>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
