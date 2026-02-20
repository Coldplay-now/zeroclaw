import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sendMessage, type MessageResponse } from "@/lib/api";
import { Copy, Check, Wrench } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  model?: string;
  toolCalls?: string[];
  durationMs?: number;
}

export function Chat() {
  const { t } = useTranslation("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const result: MessageResponse = await sendMessage(text);
      if (result.response) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: result.response!,
            model: result.model,
            toolCalls: result.tool_calls,
            durationMs: result.duration_ms,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${result.error ?? "Unknown error"}`,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: t("errorReach") },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <ScrollArea className="flex-1 px-4">
        <div className="mx-auto max-w-3xl space-y-4 py-4">
          {messages.length === 0 && (
            <p className="text-center text-muted-foreground pt-20">
              {t("emptyHint")}
            </p>
          )}
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2 text-sm text-muted-foreground">
                <span className="animate-pulse">{t("thinking")}</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4">
        <form
          onSubmit={handleSend}
          className="mx-auto flex max-w-3xl gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("placeholder")}
            disabled={loading}
            autoFocus
          />
          <Button type="submit" disabled={!input.trim() || loading}>
            {t("send")}
          </Button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const { t } = useTranslation("chat");
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-2 text-sm ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : (
          <AssistantContent message={message} />
        )}
        {/* Metadata footer */}
        {!isUser && (message.model || message.toolCalls?.length || message.durationMs) && (
          <div className="flex flex-wrap items-center gap-2 mt-2 pt-1 border-t border-foreground/10">
            {message.toolCalls && message.toolCalls.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs opacity-60">
                <Wrench className="h-3 w-3" />
                {message.toolCalls.join(", ")}
              </span>
            )}
            {message.model && (
              <span className="text-xs opacity-50">{message.model}</span>
            )}
            {message.durationMs != null && (
              <span className="text-xs opacity-50">
                {message.durationMs}{t("ms")}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AssistantContent({ message }: { message: Message }) {
  const { t } = useTranslation("chat");
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [message.content]);

  return (
    <div className="group relative">
      <div className="prose prose-sm dark:prose-invert max-w-none [&_pre]:bg-background/50 [&_pre]:rounded [&_pre]:p-2 [&_pre]:text-xs [&_code]:text-xs [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1">
        <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
      </div>
      <button
        onClick={handleCopy}
        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-foreground/10"
        title={copied ? t("copied") : t("copy")}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5 opacity-50" />
        )}
      </button>
    </div>
  );
}
