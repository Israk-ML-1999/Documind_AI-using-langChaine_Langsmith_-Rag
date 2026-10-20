"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, Loader2, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useStore } from "@/hooks/use-store";
import { translations } from "@/lib/translations";

export function FileUploader() {
  const [isUploading, setIsUploading] = useState(false);
  const { addDocument, language } = useStore();
  const t = translations[language];

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      addDocument(res.data);
    } catch (err) {
      console.error(err);
      alert(
        language === "bn"
          ? "ডকুমেন্ট আপলোড ও প্রসেসিং ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।"
          : "Failed to upload and process document. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  }, [addDocument, language]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <div
      {...getRootProps()}
      role="button"
      tabIndex={0}
      className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all duration-300 group ${
        isDragActive
          ? "border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 scale-[1.01] shadow-lg shadow-indigo-500/10"
          : isUploading
          ? "border-indigo-300 bg-indigo-50/40 dark:bg-indigo-950/20 cursor-wait"
          : "border-slate-300/80 dark:border-slate-700 bg-white dark:bg-slate-900/60 hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/30 hover:shadow-md hover:shadow-indigo-500/5"
      }`}
    >
      <input {...getInputProps()} />
      {isUploading ? (
        <div className="flex flex-col items-center justify-center space-y-2 py-1">
          <div className="relative">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
            <Sparkles className="w-3.5 h-3.5 text-cyan-500 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-300">{t.extracting}</p>
          <p className="text-[10px] text-slate-400">{t.embeddingChroma}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-1.5 py-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-cyan-500 p-[1.5px] shadow-sm group-hover:scale-110 transition-transform duration-200">
            <div className="w-full h-full bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center">
              <UploadCloud className="w-5 h-5 text-indigo-600 dark:text-indigo-400 group-hover:text-cyan-600 transition-colors" />
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">
            {t.dropPdf} <span className="underline decoration-indigo-300 text-indigo-600 dark:text-indigo-400">{t.browse}</span>
          </p>
          <p className="text-[10px] text-slate-400">{t.pdfSpecs}</p>
        </div>
      )}
    </div>
  );
}
