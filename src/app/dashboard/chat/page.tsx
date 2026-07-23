"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowser } from "@/lib/supabase";
import { Send, Bot, User, Sparkles, Paperclip, X, Image } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  imageUrl?: string;
}

const quickQuestions = [
  "What is the current exchange rate?",
  "I want to exchange SAR",
  "What's the minimum amount?",
  "How long does verification take?",
];

export default function ChatPage() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createSupabaseBrowser();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setPendingImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadReceipt = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `receipt-${crypto.randomUUID()}.${fileExt}`;
    const { error } = await supabase.storage
      .from("payment-receipts")
      .upload(fileName, file);

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("payment-receipts")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText && !pendingImage) return;

    let imageUrl: string | undefined;
    let userContent = messageText;

    if (pendingImage) {
      setLoading(true);
      const uploadedUrl = await uploadReceipt(pendingImage);
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
        userContent = messageText
          ? `${messageText}\n\n[Payment Receipt Uploaded](${uploadedUrl})`
          : `[Payment Receipt Uploaded](${uploadedUrl})`;
      }
      removeImage();
    }

    const userTimestamp = new Date();
    const userId = `user-${userTimestamp.getTime()}`;

    const userMessage: Message = {
      id: userId,
      role: "user",
      content: userContent,
      timestamp: userTimestamp,
      imageUrl,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    const conversationHistory = [...messages, userMessage].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversationHistory,
          userId: profile?.id || "",
          accessToken: session?.access_token || "",
        }),
      });

      const data = await res.json();

      const assistantTimestamp = new Date();
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${assistantTimestamp.getTime()}`,
          role: "assistant",
          content: data.reply || "I'm sorry, something went wrong. Please try again.",
          timestamp: assistantTimestamp,
        },
      ]);
    } catch {
      const errorTimestamp = new Date();
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${errorTimestamp.getTime()}`,
          role: "assistant",
          content: "I'm experiencing connectivity issues. Please try again in a moment.",
          timestamp: errorTimestamp,
        },
      ]);
    }

    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-10rem)]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">AI Exchange Assistant</h1>
          <p className="text-sm text-muted-foreground">Powered by Gemini AI • Guides you through every step</p>
        </div>
      </div>

      <div className="flex-1 bg-card rounded-xl border border-border flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4" role="log" aria-label="Chat messages">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}
              >
                {msg.imageUrl && (
                  <div className="mb-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={msg.imageUrl}
                      alt="Payment receipt"
                      className="rounded-lg max-w-[200px] border border-white/20"
                    />
                  </div>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <p
                  className={`text-[10px] mt-1 ${
                    msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"
                  }`}
                >
                  {msg.timestamp.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {messages.length === 0 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-muted-foreground mb-2">Quick questions:</p>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-full hover:bg-primary/20 transition-colors border border-primary/20"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {imagePreview && (
          <div className="px-4 pb-2">
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="Receipt preview" className="h-20 rounded-lg border border-border" />
              <button
                onClick={removeImage}
                className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs hover:bg-destructive/90"
                aria-label="Remove attached image"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              aria-label="Upload payment receipt image"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-10 h-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center hover:bg-accent disabled:opacity-50 transition-colors flex-shrink-0"
              title="Upload payment receipt"
              aria-label="Upload payment receipt"
            >
              {pendingImage ? <Image className="w-4 h-4" /> : <Paperclip className="w-4 h-4" />}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-all"
              disabled={loading}
              aria-label="Type your message"
            />
            <button
              onClick={() => handleSend()}
              disabled={(!input.trim() && !pendingImage) || loading}
              className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
