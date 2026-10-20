import { useState, useCallback, useRef } from "react";
import { useStore } from "@/hooks/use-store";
import { API_BASE_URL } from "@/lib/api";

export interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  image_url?: string;
  image_urls?: string[];
  isError?: boolean;
  is401?: boolean;
}

export function useStreamingChat(documentId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const lastPromptRef = useRef<{ content: string; images?: string[] } | null>(null);
  const { language } = useStore();

  const loadHistory = useCallback(async () => {
    if (!documentId) return;
    const token = localStorage.getItem("documind_token");
    const res = await fetch(`${API_BASE_URL}/chat/${documentId}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setMessages(data);
    }
  }, [documentId]);

  const sendMessage = useCallback(async (content: string, imagesData?: string[] | string) => {
    if (!documentId) return;
    
    // Normalize images list (max 3)
    let imagesList: string[] = [];
    if (Array.isArray(imagesData)) {
      imagesList = imagesData.filter(Boolean).slice(0, 3);
    } else if (imagesData) {
      imagesList = [imagesData];
    }

    lastPromptRef.current = { content, images: imagesList };

    // Optimistically add user message (with optional multi-image support)
    const userMsg: Message = { 
      role: "user", 
      content: content || "", 
      image_urls: imagesList.length > 0 ? imagesList : undefined,
      image_url: imagesList.length > 0 ? imagesList[0] : undefined,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    
    // Add empty assistant message that will be populated
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const token = localStorage.getItem("documind_token");
    
    try {
      const response = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          document_id: documentId, 
          content: content || "",
          images: imagesList,
          image_data: imagesList[0] || null,
        }),
      });

      if (response.status === 401) {
        throw new Error("401_UNAUTHORIZED");
      }

      if (!response.ok) {
        throw new Error(`HTTP_${response.status}`);
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        buffer += decoder.decode(value, { stream: !doneReading });
        
        // Extract data events by line
        const lines = buffer.split("\n");
        // Keep trailing partial line in buffer until completed
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data:")) {
            const raw = trimmed.slice(5).trim();
            if (!raw) continue;

            let textToAdd = "";
            try {
              const parsed = JSON.parse(raw);
              if (typeof parsed === "object" && parsed !== null && "text" in parsed) {
                textToAdd = parsed.text;
              } else if (typeof parsed === "string") {
                textToAdd = parsed;
              } else {
                textToAdd = String(parsed);
              }
            } catch {
              textToAdd = raw;
            }

            if (textToAdd) {
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastIndex = newMessages.length - 1;
                newMessages[lastIndex] = {
                  ...newMessages[lastIndex],
                  content: newMessages[lastIndex].content + textToAdd,
                  isError: false,
                };
                return newMessages;
              });
            }
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      const is401 = err?.message === "401_UNAUTHORIZED" || err?.message?.includes("401");
      
      const errorMsg = is401
        ? (language === "bn"
            ? "⚠️ **401 Unauthorized Error**: আপনার সেশনের অথেনটিকেশন বা অনুমতির মেয়াদ শেষ হয়েছে। অনুগ্রহ করে নিচে ক্লিক করে **আবার চেষ্টা করুন (Try Again)**।"
            : "⚠️ **401 Unauthorized**: Your session authentication has expired or is unauthorized. Please click below to **Try Again**.")
        : (language === "bn"
            ? "⚠️ রেসপন্স তৈরিতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।"
            : "⚠️ An error occurred while generating the response. Please try again.");

      setMessages((prev) => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        newMessages[lastIndex] = {
          ...newMessages[lastIndex],
          content: errorMsg,
          isError: true,
          is401,
        };
        return newMessages;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [documentId, language]);

  const retryLastMessage = useCallback(() => {
    if (!lastPromptRef.current) return;
    const { content, images } = lastPromptRef.current;
    // Remove the failed assistant message and re-send
    setMessages((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].role === "assistant") {
        return prev.slice(0, prev.length - 1);
      }
      return prev;
    });
    sendMessage(content, images);
  }, [sendMessage]);

  return { messages, isStreaming, sendMessage, loadHistory, setMessages, retryLastMessage };
}
