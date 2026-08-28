import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Bookmark, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/useAuth";

export const Route = createFileRoute("/verses")({
  head: () => ({
    meta: [
      { title: "Browse the Shlokas — Wisdom Weaver" },
      {
        name: "description",
        content:
          "Search and read translated verses from all 18 chapters of the Bhagavad Gita, and bookmark the ones that speak to you.",
      },
      { property: "og:title", content: "Browse the Shlokas — Wisdom Weaver" },
      {
        property: "og:description",
        content: "All 18 chapters of the Bhagavad Gita, searchable by word, theme or chapter.",
      },
    ],
  }),
  component: VersesPage,
});

function VersesPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [chapter, setChapter] = useState<number | null>(null);

  const { data: verses = [], isLoading } = useQuery({
    queryKey: ["verses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verses")
        .select("id, verse_ref, chapter_number, chapter_title, translation")
        .order("chapter_number")
        .order("verse_ref")
        .limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const chapters = useMemo(
    () =>
      Array.from(
        new Map(verses.map((v) => [v.chapter_number, v.chapter_title])).entries(),
      ).sort((a, b) => a[0] - b[0]),
    [verses],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return verses.filter(
      (v) =>
        (chapter === null || v.chapter_number === chapter) &&
        (!q ||
          v.translation.toLowerCase().includes(q) ||
          v.chapter_title.toLowerCase().includes(q) ||
          v.verse_ref.toLowerCase().includes(q)),
    );
  }, [verses, query, chapter]);

  async function bookmark(verseId: string) {
    if (!user) {
      toast.error("Sign in to bookmark verses.");
      return;
    }
    const { error } = await supabase
      .from("bookmarks")
      .insert({ user_id: user.id, verse_id: verseId });
    if (error) toast.error("Already bookmarked.");
    else toast.success("Bookmarked.");
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-4xl font-semibold">
        The <span className="text-gradient-gold">Shlokas</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {verses.length} translated verses across {chapters.length} chapters.
      </p>

      <div className="panel mt-6 flex items-center gap-2 p-2">
        <Search className="ml-2 size-4 text-muted-foreground" aria-hidden />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by word, theme or verse reference…"
          className="border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setChapter(null)}
          className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
            chapter === null
              ? "border-primary bg-primary/15 text-primary"
              : "border-border/70 text-muted-foreground hover:text-foreground"
          }`}
        >
          All chapters
        </button>
        {chapters.map(([num, title]) => (
          <button
            key={num}
            type="button"
            onClick={() => setChapter(num)}
            title={title}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
              chapter === num
                ? "border-primary bg-primary/15 text-primary"
                : "border-border/70 text-muted-foreground hover:text-foreground"
            }`}
          >
            Ch. {num}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="mt-10 text-sm text-muted-foreground">Loading verses…</p>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.slice(0, 300).map((v) => (
            <article key={v.id} className="panel p-5">
              <div className="flex items-start gap-3">
                <div>
                  <p className="text-xs tracking-[0.16em] text-primary uppercase">
                    {v.verse_ref} · {v.chapter_title}
                  </p>
                  <p className="mt-2 text-[15px] leading-relaxed">{v.translation}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto shrink-0"
                  onClick={() => void bookmark(v.id)}
                  aria-label={`Bookmark ${v.verse_ref}`}
                >
                  <Bookmark className="size-4" />
                </Button>
              </div>
            </article>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">No verses match that search.</p>
          )}
          {filtered.length > 300 && (
            <p className="text-xs text-muted-foreground">
              Showing the first 300 of {filtered.length} matches — refine your search.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
