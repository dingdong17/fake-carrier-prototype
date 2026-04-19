"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  checkId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatPanel({ checkId, isOpen, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMessage: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

    // Add placeholder assistant message
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkId, message: trimmed }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Chat request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6);
          try {
            const data = JSON.parse(jsonStr) as {
              text?: string;
              done?: boolean;
              error?: string;
            };

            if (data.error) {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: `Fehler: ${data.error}`,
                };
                return updated;
              });
              setIsStreaming(false);
              return;
            }

            if (data.done) {
              setIsStreaming(false);
              return;
            }

            if (data.text) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: last.content + data.text,
                };
                return updated;
              });
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Verbindungsfehler. Bitte versuchen Sie es erneut.",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("files", file);
    formData.append("checkId", checkId);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setInput(
          `Neues Dokument hochgeladen: ${file.name}. Bitte analysiere es.`,
        );
        inputRef.current?.focus();
      }
    } catch {
      // Upload failed silently
    }

    // Reset file input
    e.target.value = "";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-ec-dark-blue px-4 py-3">
          <h2 className="text-base font-semibold text-white font-barlow">
            Chat mit Agent
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-ec-grey-70 text-center">
                Stellen Sie Fragen zu den Prüfergebnissen.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-ec-dark-blue text-white whitespace-pre-wrap"
                    : "bg-ec-light-grey text-ec-grey-80"
                }`}
              >
                {msg.role === "assistant" ? (
                  msg.content ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: (props) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                        ul: (props) => <ul className="mb-2 last:mb-0 list-disc pl-5 space-y-1" {...props} />,
                        ol: (props) => <ol className="mb-2 last:mb-0 list-decimal pl-5 space-y-1" {...props} />,
                        li: (props) => <li className="leading-relaxed" {...props} />,
                        strong: (props) => <strong className="font-semibold text-ec-grey-80" {...props} />,
                        em: (props) => <em className="italic" {...props} />,
                        code: (props) => <code className="rounded bg-ec-medium-grey/40 px-1 py-0.5 font-mono text-xs" {...props} />,
                        pre: (props) => <pre className="mb-2 last:mb-0 rounded bg-ec-medium-grey/40 p-2 font-mono text-xs overflow-x-auto" {...props} />,
                        h1: (props) => <h3 className="mb-1 mt-1 font-barlow text-base font-semibold" {...props} />,
                        h2: (props) => <h3 className="mb-1 mt-1 font-barlow text-sm font-semibold" {...props} />,
                        h3: (props) => <h4 className="mb-1 mt-1 font-barlow text-sm font-semibold" {...props} />,
                        a: (props) => <a className="text-ec-dark-blue underline hover:no-underline" target="_blank" rel="noreferrer" {...props} />,
                        table: (props) => <table className="mb-2 last:mb-0 w-full border-collapse text-xs" {...props} />,
                        th: (props) => <th className="border border-ec-medium-grey px-2 py-1 text-left font-semibold" {...props} />,
                        td: (props) => <td className="border border-ec-medium-grey px-2 py-1" {...props} />,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : isStreaming && i === messages.length - 1 ? (
                    <span className="inline-block animate-pulse">...</span>
                  ) : null
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-ec-medium-grey px-4 py-3">
          <div className="flex items-center gap-2">
            <label className="cursor-pointer text-ec-grey-70 hover:text-ec-dark-blue transition-colors">
              <span className="text-lg" role="img" aria-label="Datei anhängen">
                📎
              </span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif"
                onChange={handleFileUpload}
              />
            </label>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nachricht eingeben..."
              disabled={isStreaming}
              className="flex-1 rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-grey-80 placeholder:text-ec-grey-70/50 focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue disabled:opacity-50"
            />

            <button
              type="button"
              onClick={handleSend}
              disabled={isStreaming || !input.trim()}
              className="rounded-lg bg-ec-dark-blue px-3 py-2 text-sm font-medium text-white hover:bg-ec-dark-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
