import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const CRISIS_PATTERNS = [
  /\bkill myself\b/i,
  /\bsuicid/i,
  /\bend my life\b/i,
  /\bwant to die\b/i,
  /\bself[- ]harm\b/i,
  /\bhurt myself\b/i,
  /\bjaan de\b/i,
  /\bmarna chahta\b/i,
];

const CRISIS_REPLY = `**Please pause here for a moment.**

It sounds like you are carrying pain that deserves real, human support right now — not only scripture.

- India: iCall +91 9152987821 · Tele-MANAS 14416 (24x7)
- International: findahelpline.com

Krishna tells Arjun on the battlefield that despair is not the end of the story: *"Let a person lift the self by the Self, and not degrade the self"* (Chapter 6, Verse 5). You are not alone, and reaching out to someone who can sit with you is itself an act of courage. When you feel steadier, I am here to explore the Gita with you.`;

function sseChunk(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export const Route = createFileRoute("/api/guidance")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: { question?: string; history?: { role: string; content: string }[] };
        try {
          payload = (await request.json()) as typeof payload;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const question = (payload.question ?? "").toString().slice(0, 2000).trim();
        if (!question) return new Response("Question is required", { status: 400 });

        const encoder = new TextEncoder();

        if (CRISIS_PATTERNS.some((p) => p.test(question))) {
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode(sseChunk({ delta: CRISIS_REPLY })));
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            },
          });
          return new Response(stream, {
            headers: { "content-type": "text/event-stream", "cache-control": "no-cache" },
          });
        }

        // Lightweight keyword retrieval over the 700 verses.
        const supabase = createClient(
          process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"]!,
          process.env["SUPABASE_PUBLISHABLE_KEY"] ??
            process.env["VITE_SUPABASE_PUBLISHABLE_KEY"]!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );

        const stopWords = new Set([
          "what",
          "when",
          "with",
          "that",
          "this",
          "from",
          "have",
          "about",
          "should",
          "would",
          "there",
          "feel",
          "very",
          "like",
          "mujhe",
          "kaise",
          "raha",
          "hoon",
        ]);
        const keywords = question
          .toLowerCase()
          .replace(/[^a-z\s]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length > 3 && !stopWords.has(w))
          .slice(0, 5);

        let context = "";
        if (keywords.length) {
          const { data } = await supabase
            .from("verses")
            .select("verse_ref, chapter_title, translation")
            .or(keywords.map((k) => `translation.ilike.%${k}%`).join(","))
            .limit(10);
          context = (data ?? [])
            .map((v) => `Chapter ${v.verse_ref} (${v.chapter_title}): ${v.translation}`)
            .join("\n");
        }

        const systemPrompt = `You are Wisdom Weaver, a warm, grounded guide who answers life questions strictly through the Bhagavad Gita.
Understand English, Hindi and colloquial Hinglish; always answer in the language the user wrote in.
Respond in markdown with EXACTLY these sections and headings, in this order:

### Core Theme
One short line naming the emotional/philosophical theme (e.g. Attachment to Outcomes, Self-Doubt, Duty).

### Verse
Chapter X, Verse Y — chapter name.

### Sanskrit
The original shloka in Devanagari script (as accurate as you can be).

### Transliteration
IAST / romanized pronunciation.

### Meaning
2-4 sentences interpreting the verse for this exact situation.

### Practice
2-3 concrete, specific actions the person can take today, as a markdown list.

Never invent a verse number that does not exist. Never give medical or legal advice. Be compassionate, never preachy.`;

        const messages = [
          { role: "system", content: systemPrompt },
          ...(payload.history ?? [])
            .slice(-6)
            .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
          {
            role: "user",
            content: context
              ? `${question}\n\nRelevant verse translations retrieved from the Gita corpus:\n${context}`
              : question,
          },
        ];

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3.7-flash",
            temperature: 0.4,
            stream: true,
            messages,
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => "");
          console.error("AI gateway error", upstream.status, detail);
          return new Response(
            upstream.status === 429
              ? "Too many requests, please wait a moment."
              : "Guidance is unavailable right now.",
            { status: upstream.status === 429 ? 429 : 500 },
          );
        }

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const stream = new ReadableStream({
          async pull(controller) {
            const { done, value } = await reader.read();
            if (done) {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              return;
            }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) controller.enqueue(encoder.encode(sseChunk({ delta })));
              } catch {
                /* partial frame, ignore */
              }
            }
          },
          cancel() {
            reader.cancel().catch(() => {});
          },
        });

        return new Response(stream, {
          headers: {
            "content-type": "text/event-stream",
            "cache-control": "no-cache",
            connection: "keep-alive",
          },
        });
      },
    },
  },
});
