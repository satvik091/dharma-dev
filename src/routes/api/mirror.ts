import { createFileRoute } from "@tanstack/react-router";

type MirrorPayload = { dilemma?: string };

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "yourBattlefield", "arjunaBattlefield", "steps", "closing"],
  properties: {
    title: { type: "string" },
    yourBattlefield: {
      type: "object",
      additionalProperties: false,
      required: ["situation", "fear", "pull", "duty"],
      properties: {
        situation: { type: "string" },
        fear: { type: "string" },
        pull: { type: "string" },
        duty: { type: "string" },
      },
    },
    arjunaBattlefield: {
      type: "object",
      additionalProperties: false,
      required: ["situation", "fear", "pull", "duty"],
      properties: {
        situation: { type: "string" },
        fear: { type: "string" },
        pull: { type: "string" },
        duty: { type: "string" },
      },
    },
    steps: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "verseRef", "sanskrit", "insight", "action"],
        properties: {
          label: { type: "string" },
          verseRef: { type: "string" },
          sanskrit: { type: "string" },
          insight: { type: "string" },
          action: { type: "string" },
        },
      },
    },
    closing: { type: "string" },
  },
} as const;

export const Route = createFileRoute("/api/mirror")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: MirrorPayload;
        try {
          payload = (await request.json()) as MirrorPayload;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const dilemma = (payload.dilemma ?? "").toString().slice(0, 1500).trim();
        if (!dilemma) return new Response("Describe your dilemma first.", { status: 400 });

        const system = `You are the Arjuna Mirror inside a Bhagavad Gita guidance app.
The user describes a personal dilemma. You mirror it against Arjuna's crisis on the field of Kurukshetra.
Rules:
- Answer in the language the user wrote in (English, Hindi or Hinglish).
- yourBattlefield describes THE USER (second person, warm, specific to their words).
- arjunaBattlefield describes ARJUNA in Chapter 1-2, in parallel structure.
- Each of the 3 steps is one move of a Gita decision path: (1) See clearly, (2) Choose your dharma, (3) Act without clinging. Give a REAL chapter/verse reference ("Chapter 2, Verse 47"), the Devanagari shloka, an insight for this exact dilemma, and one concrete action.
- Never invent verse numbers that do not exist. No medical or legal advice. Compassionate, never preachy. Keep each field under 45 words.`;

        const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "Lovable-API-Key": process.env["LOVABLE_API_KEY"]!,
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: "openai/gpt-5.6-sol",
            stream: true,
            instructions: system,
            input: [{ role: "user", content: [{ type: "input_text", text: dilemma }] }],
            reasoning: { effort: "low", summary: "auto" },
            text: {
              format: {
                type: "json_schema",
                name: "arjuna_mirror",
                strict: true,
                schema: SCHEMA,
              },
            },
          }),
        });

        if (!res.ok || !res.body) {
          const detail = await res.text().catch(() => "");
          console.error("mirror gateway error", res.status, detail);
          return new Response(
            res.status === 429
              ? "Too many requests, please wait a moment."
              : res.status === 402
                ? "AI credits are exhausted for this workspace."
                : "The mirror is clouded right now. Please try again.",
            { status: res.status === 429 ? 429 : res.status === 402 ? 402 : 500 },
          );
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let text = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const evt = JSON.parse(data);
              if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
                text += evt.delta;
              } else if (evt.type === "response.completed" && !text) {
                text = evt.response?.output_text ?? "";
              }
            } catch {
              /* partial frame */
            }
          }
        }

        try {
          const parsed = JSON.parse(text);
          return Response.json(parsed);
        } catch {
          console.error("mirror parse failure", text.slice(0, 400));
          return new Response("Could not read the reflection. Please try again.", { status: 502 });
        }
      },
    },
  },
});
