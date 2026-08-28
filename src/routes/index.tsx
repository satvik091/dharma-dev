import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, BookOpenText, Compass, NotebookPen, Sparkles } from "lucide-react";
import heroImage from "@/assets/gita-hero.jpg";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Wisdom Weaver — Gita Guidance for Real Life" },
      {
        name: "description",
        content:
          "Ask anything about anxiety, work, love or purpose and receive a Bhagavad Gita verse, its meaning and a practice for today.",
      },
      { property: "og:title", content: "Wisdom Weaver — Gita Guidance for Real Life" },
      {
        property: "og:description",
        content:
          "AI guidance grounded in all 700 shlokas of the Bhagavad Gita, with Sanskrit, meaning and daily practice.",
      },
    ],
  }),
  component: Index,
});

const PROMPTS = [
  "I'm anxious about my exam results",
  "Mujhe apne kaam mein motivation nahi mil raha",
  "How do I let go of someone who left?",
  "I keep comparing myself to my friends",
];

function Index() {
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");

  const { data: verse } = useQuery({
    queryKey: ["verse-of-day"],
    queryFn: async () => {
      const seed = new Date().toISOString().slice(0, 10);
      const offset =
        [...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % 600;
      const { data, error } = await supabase
        .from("verses")
        .select("verse_ref, chapter_title, translation")
        .range(offset, offset)
        .limit(1);
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  function ask(q: string) {
    const text = q.trim();
    if (!text) return;
    navigate({ to: "/guidance", search: { q: text } });
  }

  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/50 px-3 py-1 text-xs tracking-[0.16em] text-muted-foreground uppercase">
              <Sparkles className="size-3.5 text-primary" aria-hidden /> 700 shlokas · one answer
            </span>
            <h1 className="mt-5 font-display text-5xl leading-[1.05] font-semibold md:text-6xl">
              Life's questions,
              <br />
              answered by the <span className="text-gradient-gold">Gita</span>.
            </h1>
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
              Describe what you're going through in English, Hindi or Hinglish. Wisdom Weaver finds
              the shloka that speaks to it — with Sanskrit, plain meaning, and a practice for today.
            </p>

            <div className="panel mt-8 p-3">
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    ask(question);
                  }
                }}
                rows={3}
                placeholder="What is weighing on you right now?"
                className="resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
              />
              <div className="flex items-center justify-between gap-3 px-1 pt-2">
                <p className="text-xs text-muted-foreground">Press Enter to seek guidance</p>
                <Button onClick={() => ask(question)} disabled={!question.trim()}>
                  Seek guidance <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => ask(p)}
                  className="rounded-full border border-border/70 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <img
              src={heroImage}
              alt="Krishna counselling Arjuna on the battlefield at dusk"
              className="lamp-glow w-full rounded-3xl border border-border/60 object-cover"
              loading="eager"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Compass,
              title: "Guidance that cites",
              body: "Every answer names a real chapter and verse — never vague advice.",
              to: "/guidance" as const,
              cta: "Ask a question",
            },
            {
              icon: BookOpenText,
              title: "Browse all 18 chapters",
              body: "Search 640+ translated shlokas by word, theme or chapter.",
              to: "/verses" as const,
              cta: "Open the verses",
            },
            {
              icon: NotebookPen,
              title: "Your reflection vault",
              body: "Bookmark verses and journal what changed after you sat with them.",
              to: "/journal" as const,
              cta: "Open journal",
            },
          ].map((f) => (
            <div key={f.title} className="panel flex flex-col p-6">
              <f.icon className="size-5 text-primary" aria-hidden />
              <h2 className="mt-4 text-xl font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              <Link
                to={f.to}
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                {f.cta} <ArrowRight className="size-3.5" />
              </Link>
            </div>
          ))}
        </div>

        {verse && (
          <div className="panel mt-6 p-6 md:p-8">
            <span className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
              Verse of the day
            </span>
            <p className="mt-3 font-display text-2xl leading-snug md:text-3xl">
              “{verse.translation}”
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {verse.verse_ref} · {verse.chapter_title}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
