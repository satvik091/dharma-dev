import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, SendHorizontal, User } from "lucide-react";
import { toast } from "sonner";
import { GuidanceAnswer, parseGuidance } from "@/components/GuidanceAnswer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";

type Msg = { role: "user" | "assistant"; content: string };

export const Route = createFileRoute("/guidance")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search["q"] === "string" ? (search["q"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Ask for Guidance — Wisdom Weaver" },
      {
        name: "description",
        content:
          "A compassionate Gita guide: describe your situation and receive a verse, its meaning and a practice you can do today.",
      },
      { property: "og:title", content: "Ask for Guidance — Wisdom Weaver" },
      {
        property: "og:description",
        content: "Bhagavad Gita answers with Sanskrit, transliteration, meaning and practice.",
      },
    ],
  }),
  component: GuidancePage,
});

function GuidancePage() {
  const { q } = Route.useSearch();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const started = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  useEffect(() => {
    if (q && !started.current) {
      started.current = true;
      void send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function persist(role: Msg["role"], content: string) {
    if (!user) return;
    await supabase.from("chat_messages").insert({ user_id: user.id, role, content });
  }

  async function send(question: string) {
    const text = question.trim();
    if (!text || streaming) return;
    setInput("");
    const history = messages.slice(-6);
    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setStreaming(true);
    void persist("user", text);

    try {
      const res = await fetch("/api/guidance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: text, history }),
      });

      if (!res.ok || !res.body) {
        throw new Error(await res.text().catch(() => "Guidance unavailable"));
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let answer = "";

      let finished = false;
      while (!finished) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data) continue;
          if (data === "[DONE]") {
            finished = true;
            void reader.cancel().catch(() => {});
            break;
          }
          try {
            const delta = JSON.parse(data).delta as string | undefined;
            if (delta) {
              answer += delta;
              setMessages((m) => {
                const next = [...m];
                next[next.length - 1] = { role: "assistant", content: answer };
                return next;
              });
            }
          } catch {
            /* ignore partial frame */
          }
        }
      }

      void persist("assistant", answer);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
      setMessages((m) => m.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  }

  async function saveVerse(verseRef: string) {
    if (!user) {
      toast.error("Sign in to save verses to your journal.");
      return;
    }
    const { data } = await supabase
      .from("verses")
      .select("id")
      .ilike("verse_ref", `%${verseRef.replace(/[^0-9.]/g, "").trim()}%`)
      .limit(1);
    if (!data?.length) {
      toast.error("Couldn't match that verse in the library.");
      return;
    }
    const { error } = await supabase
      .from("bookmarks")
      .insert({ user_id: user.id, verse_id: data[0]!.id });
    if (error) toast.error("Already saved or could not save.");
    else toast.success("Saved to your journal.");
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-61px)] max-w-3xl flex-col px-4 py-8">
      <header className="mb-6">
        <h1 className="font-display text-4xl font-semibold">
          Ask the <span className="text-gradient-gold">Gita</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Write in English, Hindi or Hinglish. Answers cite a real chapter and verse.
        </p>
      </header>

      <div className="flex-1 space-y-5">
        {messages.length === 0 && !streaming && (
          <div className="panel p-6 text-sm leading-relaxed text-muted-foreground">
            Try: “I feel stuck between what my parents want and what I want.”
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="flex max-w-[85%] items-start gap-2 rounded-2xl border border-border/70 bg-secondary/50 px-4 py-3 text-sm">
                <User className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span>{m.content}</span>
              </div>
            </div>
          ) : m.content ? (
            <GuidanceAnswer key={i} parsed={parseGuidance(m.content)} onSaveVerse={saveVerse} />
          ) : (
            <div
              key={i}
              className="panel flex items-center gap-2 p-5 text-sm text-muted-foreground"
            >
              <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
              Turning to the shlokas…
            </div>
          ),
        )}
        <div ref={bottom} />
      </div>

      <div className="panel sticky bottom-4 mt-6 p-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          rows={2}
          placeholder="Ask anything…"
          className="resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <div className="flex justify-end px-1">
          <Button onClick={() => void send(input)} disabled={streaming || !input.trim()} size="sm">
            {streaming ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <SendHorizontal className="size-4" />
            )}
            Send
          </Button>
        </div>
      </div>
    </main>
  );
}
