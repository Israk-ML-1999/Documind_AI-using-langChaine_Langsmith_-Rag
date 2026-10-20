"use client";

import { useEffect, useState } from "react";
import { FileText, Trash2, Layers, CheckCircle2, StickyNote, Loader2 } from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { translations } from "@/lib/translations";

export function DocumentList() {
  const {
    documents,
    setDocuments,
    activeDocument,
    setActiveDocument,
    removeDocument,
    language,
    notes,
    setIsNotesOpen,
  } = useStore();
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const t = translations[language];

  useEffect(() => {
    async function fetchDocs() {
      try {
        const res = await api.get("/documents/list");
        const docs = res.data || [];
        setDocuments(docs);

        // Auto restore active document on page reload/refresh
        const savedDocId = typeof window !== "undefined" ? localStorage.getItem("documind_active_doc_id") : null;
        if (savedDocId && docs.length > 0) {
          const matched = docs.find((d: any) => d.id === savedDocId);
          if (matched) {
            setActiveDocument(matched);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchDocs();
  }, [setDocuments, setActiveDocument]);

  // Polling for processing documents (updates status in real-time when Celery finishes)
  useEffect(() => {
    const hasProcessing = documents.some((d) => d.status === "processing");
    if (!hasProcessing) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get("/documents/list");
        const docs = res.data || [];
        setDocuments(docs);
        if (activeDocument) {
          const updatedActive = docs.find((d: any) => d.id === activeDocument.id);
          if (updatedActive && updatedActive.status !== activeDocument.status) {
            setActiveDocument(updatedActive);
          }
        }
      } catch (e) {
        console.error("Failed to poll document status:", e);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [documents, activeDocument, setDocuments, setActiveDocument]);

  const handleDelete = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/documents/${docToDelete}`);
      removeDocument(docToDelete);
      setDocToDelete(null);
    } catch (err) {
      console.error("Failed to delete document:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 mt-3 px-3">
      {/* Session Notes Quick Access in Sidebar */}
      <button
        type="button"
        onClick={() => setIsNotesOpen(true)}
        className="mb-3.5 flex items-center justify-between p-2.5 rounded-xl border border-amber-200/70 dark:border-amber-900/60 bg-gradient-to-r from-amber-50/70 via-amber-50/30 to-orange-50/30 dark:from-amber-950/30 dark:to-orange-950/20 text-slate-800 dark:text-slate-100 hover:border-amber-300 dark:hover:border-amber-800 hover:shadow-sm transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <StickyNote className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
            {t.sessionNotes}
          </span>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-100/80 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800/80">
          {notes.length}
        </span>
      </button>

      <div className="flex items-center justify-between px-2 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Layers className="w-3.5 h-3.5 text-indigo-500" />
          <span>{t.knowledgeBase}</span>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-100 dark:border-indigo-900">
          {documents.length}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 digital-scrollbar pr-1">
        {documents.map((doc) => {
          const isActive = activeDocument?.id === doc.id;
          return (
            <div
              key={doc.id}
              onClick={() => setActiveDocument(doc)}
              role="button"
              tabIndex={0}
              className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 border ${
                isActive
                  ? "bg-gradient-to-r from-indigo-50 to-cyan-50/50 dark:from-indigo-950/60 dark:to-cyan-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-950 dark:text-indigo-200 shadow-sm"
                  : "bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/80 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <div className="flex items-center space-x-2.5 overflow-hidden min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-rose-50 dark:bg-rose-950/40 text-rose-500 border border-rose-100 dark:border-rose-900 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/60"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-xs font-semibold leading-tight">
                    {doc.filename}
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                    {doc.status === "processing" ? (
                      <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 animate-pulse">
                        <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-500" />
                        {t.docProcessing}
                      </span>
                    ) : doc.status === "failed" ? (
                      <span className="text-rose-500 font-medium flex items-center gap-1">
                        {t.docFailed}
                      </span>
                    ) : isActive ? (
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-indigo-500" />
                        {language === "bn" ? "সক্রিয় ভেক্টর" : "Active Vector"}
                      </span>
                    ) : (
                      <span>{language === "bn" ? "ইনডেক্সড ডকুমেন্ট" : "Indexed Document"}</span>
                    )}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDocToDelete(doc.id);
                }}
                title={language === "bn" ? "ডকুমেন্ট মুছে ফেলুন" : "Delete document"}
                className="cursor-pointer opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 text-slate-400 rounded-lg transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        {documents.length === 0 && (
          <div className="text-center p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.noDocuments}</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{t.uploadPrompt}</p>
          </div>
        )}
      </div>

      <Dialog open={!!docToDelete} onOpenChange={() => setDocToDelete(null)}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">{t.deleteDocTitle}</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
              {t.deleteDocDesc}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDocToDelete(null)}
              className="cursor-pointer border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="cursor-pointer bg-rose-600 hover:bg-rose-700 text-white min-w-[75px]"
            >
              {isDeleting ? (
                <div className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{language === "bn" ? "মুছে ফেলা হচ্ছে..." : "Deleting..."}</span>
                </div>
              ) : (
                t.delete
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
