import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BookmarkX, NotebookPen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/useAuth";

export const Route = createFileRoute("/journal")({
  head: () => ({
    meta: [
      { title: "Your Reflection Journal — Wisdom Weaver" },
      {
        name: "description",
        content:
          "Keep the Gita verses you bookmarked and write private reflections on what changed after you sat with them.",
      },
      { property: "og:title", content: "Your Reflection Journal — Wisdom Weaver" },
      {
        property: "og:description",
        content: "Bookmarked shlokas and private reflections, in one calm place.",
      },
    ],
  }),
  component: JournalPage,
});

function JournalPage() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [verseRef, setVerseRef] = useState("");
  const [mood, setMood] = useState("");

  const bookmarks = useQuery({
    queryKey: ["bookmarks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookmarks")
        .select("id, created_at, verses(verse_ref, chapter_title, translation)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const entries = useQuery({
    queryKey: ["journal", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("id, body, mood, verse_ref, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addEntry = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in first");
      const { error } = await supabase.from("journal_entries").insert({
        user_id: user.id,
        body: body.trim(),
        mood: mood.trim() || null,
        verse_ref: verseRef.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      setMood("");
      setVerseRef("");
      toast.success("Reflection saved.");
      void qc.invalidateQueries({ queryKey: ["journal", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("journal_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["journal", user?.id] }),
  });

  const removeBookmark = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookmarks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["bookmarks", user?.id] }),
  });

  if (loading) {
    return <main className="mx-auto max-w-4xl px-4 py-16 text-sm text-muted-foreground">Loading…</main>;
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <NotebookPen className="mx-auto size-6 text-primary" aria-hidden />
        <h1 className="mt-4 font-display text-3xl font-semibold">Your reflection vault</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to bookmark verses and keep private reflections.
        </p>
        <Button asChild className="mt-6">
          <Link to="/auth">Sign in</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-4xl font-semibold">
        Your <span className="text-gradient-gold">Journal</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Private to you — bookmarked shlokas and the reflections they sparked.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section>
          <h2 className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Saved verses
          </h2>
          <div className="mt-3 space-y-3">
            {bookmarks.data?.length ? (
              bookmarks.data.map((b) => (
                <article key={b.id} className="panel p-5">
                  <div className="flex items-start gap-3">
                    <div>
                      <p className="text-xs tracking-[0.16em] text-primary uppercase">
                        {b.verses?.verse_ref} · {b.verses?.chapter_title}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed">{b.verses?.translation}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-auto shrink-0"
                      onClick={() => removeBookmark.mutate(b.id)}
                      aria-label="Remove bookmark"
                    >
                      <BookmarkX className="size-4" />
                    </Button>
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No bookmarks yet — save one from the verses page.
              </p>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Reflections</h2>

          <div className="panel mt-3 space-y-3 p-4">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="What shifted for you today?"
              className="resize-none"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                placeholder="Mood (optional)"
              />
              <Input
                value={verseRef}
                onChange={(e) => setVerseRef(e.target.value)}
                placeholder="Verse ref (optional)"
              />
            </div>
            <Button
              className="w-full"
              disabled={!body.trim() || addEntry.isPending}
              onClick={() => addEntry.mutate()}
            >
              Save reflection
            </Button>
          </div>

          <div className="mt-3 space-y-3">
            {entries.data?.map((e) => (
              <article key={e.id} className="panel p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleDateString()}
                    {e.mood ? ` · ${e.mood}` : ""}
                    {e.verse_ref ? ` · ${e.verse_ref}` : ""}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeEntry.mutate(e.id)}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                    aria-label="Delete reflection"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{e.body}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
