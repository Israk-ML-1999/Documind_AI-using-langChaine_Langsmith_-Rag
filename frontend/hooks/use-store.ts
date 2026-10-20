import { create } from "zustand";
import { Language, ThemeMode } from "@/lib/translations";

export interface Document {
  id: string;
  filename: string;
  status?: "processing" | "ready" | "failed";
  error_message?: string;
  created_at: string;
}

export interface UserProfile {
  id?: string;
  full_name?: string;
  email?: string;
}

export interface Note {
  id: string;
  user_id: string;
  document_id?: string;
  document_title?: string;
  title?: string;
  content: string;
  created_at: string;
}

interface AppState {
  documents: Document[];
  activeDocument: Document | null;
  setDocuments: (docs: Document[]) => void;
  addDocument: (doc: Document) => void;
  removeDocument: (id: string) => void;
  setActiveDocument: (doc: Document | null) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (status: boolean) => void;
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  notes: Note[];
  setNotes: (notes: Note[]) => void;
  addNote: (note: Note) => void;
  removeNote: (id: string) => void;
  isNotesOpen: boolean;
  setIsNotesOpen: (open: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  documents: [],
  activeDocument: null,
  setDocuments: (docs) =>
    set((state) => {
      let active = state.activeDocument;
      if (!active && typeof window !== "undefined") {
        const savedId = localStorage.getItem("documind_active_doc_id");
        if (savedId) {
          active = docs.find((d) => d.id === savedId) || null;
        }
      }
      return { documents: docs, activeDocument: active };
    }),
  addDocument: (doc) => set((state) => ({ documents: [...state.documents, doc] })),
  removeDocument: (id) =>
    set((state) => {
      const isCurrent = state.activeDocument?.id === id;
      if (isCurrent && typeof window !== "undefined") {
        localStorage.removeItem("documind_active_doc_id");
        localStorage.removeItem("documind_active_doc");
      }
      return {
        documents: state.documents.filter((d) => d.id !== id),
        activeDocument: isCurrent ? null : state.activeDocument,
      };
    }),
  setActiveDocument: (doc) => {
    if (typeof window !== "undefined") {
      if (doc) {
        localStorage.setItem("documind_active_doc_id", doc.id);
        localStorage.setItem("documind_active_doc", JSON.stringify(doc));
      } else {
        localStorage.removeItem("documind_active_doc_id");
        localStorage.removeItem("documind_active_doc");
      }
    }
    set({ activeDocument: doc });
  },
  isAuthenticated: false,
  setIsAuthenticated: (status) => set({ isAuthenticated: status }),
  user: null,
  setUser: (user) => set({ user }),
  language: "en",
  setLanguage: (language) => {
    localStorage.setItem("documind_lang", language);
    set({ language });
  },
  theme: "light",
  setTheme: (theme) => {
    localStorage.setItem("documind_theme", theme);
    if (typeof document !== "undefined") {
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
    set({ theme });
  },
  notes: [],
  setNotes: (notes) => set({ notes }),
  addNote: (note) => set((state) => ({ notes: [note, ...state.notes] })),
  removeNote: (id) => set((state) => ({ notes: state.notes.filter((n) => n.id !== id) })),
  isNotesOpen: false,
  setIsNotesOpen: (open) => set({ isNotesOpen: open }),
}));
