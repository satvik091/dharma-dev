import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Shield, Sparkles, Swords, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Side = { situation: string; fear: string; pull: string; duty: string };
type Step = {
  label: string;
  verseRef: string;
  sanskrit: string;
  insight: string;
  action: string;
};
type Mirror = {
  title: string;
  yourBattlefield: Side;
  arjunaBattlefield: Side;
  steps: Step[];
  closing: string;
};

export const Route = createFileRoute("/mirror")({
  head: () => ({
    meta: [
      { title: "Arjuna Mirror — See Your Dilemma as Kurukshetra" },
      {
        name: "description",
        content:
          "Describe your dilemma and see it mirrored against Arjuna's crisis on the battlefield, with a three-step Gita decision path and real shlokas.",
      },
      { property: "og:title", content: "Arjuna Mirror — See Your Dilemma as Kurukshetra" },
      {
        property: "og:description",
        content:
          "Your situation beside Arjuna's, plus a three-step Gita decision path with Sanskrit verses.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MirrorPage,
});

const EXAMPLES = [
  "I got a safe job offer but I want to build my own thing",
  "Ghar wale shaadi ke liye keh rahe hain, main ready nahi hoon",
  "Do I report my friend's mistake at work?",
];

const ROWS: { key: keyof Side; label: string }[] = [
  { key: "situation", label: "The field" },
  { key: "fear", label: "The fear" },
  { key: "pull", label: "The pull" },
  { key: "duty", label: "The dharma" },
];

function MirrorPage() {
  const [dilemma, setDilemma] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Mirror | null>(null);

  async function reflect(text: string) {
    const value = text.trim();
    if (!value || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/mirror", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dilemma: value }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "The mirror is clouded."));
      setResult((await res.json()) as Mirror);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/50 px-3 py-1 text-xs tracking-[0.16em] text-muted-foreground uppercase">
          <Swords className="size-3.5 text-primary" aria-hidden /> Dilemma mode
        </span>
        <h1 className="mt-4 font-display text-4xl font-semibold md:text-5xl">
          The <span className="text-gradient-gold">Arjuna</span> Mirror
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Every hard choice is a small Kurukshetra. Describe yours and see it stand beside Arjuna's
          — then walk the same three-step path Krishna gave him.
        </p>
      </header>

      <div className="panel mt-8 p-3">
        <Textarea
          value={dilemma}
          onChange={(e) => setDilemma(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void reflect(dilemma);
            }
          }}
          rows={3}
          placeholder="I am torn between…"
          className="resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
        />
        <div className="flex items-center justify-between gap-3 px-1 pt-2">
          <p className="text-xs text-muted-foreground">Two sides of one battlefield</p>
          <Button onClick={() => void reflect(dilemma)} disabled={loading || !dilemma.trim()}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Hold up the mirror
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {EXAMPLES.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => {
              setDilemma(e);
              void reflect(e);
            }}
            className="rounded-full border border-border/70 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
          >
            {e}
          </button>
        ))}
      </div>

      {loading && (
        <div className="panel mt-8 flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
          Setting your chariot beside Arjuna's…
        </div>
      )}

      {result && (
        <section className="mt-10 space-y-8">
          <h2 className="font-display text-2xl font-semibold">{result.title}</h2>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              { icon: User, heading: "You, today", side: result.yourBattlefield, accent: "text-primary" },
              {
                icon: Shield,
                heading: "Arjuna, at Kurukshetra",
                side: result.arjunaBattlefield,
                accent: "text-lotus",
              },
            ].map(({ icon: Icon, heading, side, accent }) => (
              <article key={heading} className="panel overflow-hidden">
                <div className="flex items-center gap-2 border-b border-border/70 bg-secondary/40 px-5 py-3">
                  <Icon className={`size-4 ${accent}`} aria-hidden />
                  <h3 className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                    {heading}
                  </h3>
                </div>
                <dl className="space-y-4 p-5">
                  {ROWS.map((row) => (
                    <div key={row.key}>
                      <dt className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
                        {row.label}
                      </dt>
                      <dd className="mt-1 text-[15px] leading-relaxed">{side[row.key]}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>

          <div>
            <h3 className="font-display text-xl font-semibold">Your decision path</h3>
            <ol className="mt-4 space-y-4">
              {result.steps.map((step, i) => (
                <li key={i} className="panel p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span className="font-display text-lg">{step.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{step.verseRef}</span>
                  </div>
                  {step.sanskrit && (
                    <p className="sanskrit mt-4 rounded-lg border border-border/60 bg-secondary/30 px-4 py-3 text-lg whitespace-pre-line">
                      {step.sanskrit}
                    </p>
                  )}
                  <p className="mt-3 text-[15px] leading-relaxed">{step.insight}</p>
                  <p className="mt-3 flex gap-3 text-[15px] leading-relaxed text-muted-foreground">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    {step.action}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          <p className="panel p-5 font-display text-xl leading-snug">{result.closing}</p>
        </section>
      )}
    </main>
  );
}
