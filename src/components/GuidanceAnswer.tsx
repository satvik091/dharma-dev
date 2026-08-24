import { Bookmark, Quote, Sparkles } from "lucide-react";

export type ParsedGuidance = {
  theme?: string;
  verse?: string;
  sanskrit?: string;
  transliteration?: string;
  meaning?: string;
  practice?: string[];
  raw: string;
};

const KEYS: Record<string, keyof ParsedGuidance> = {
  "core theme": "theme",
  verse: "verse",
  sanskrit: "sanskrit",
  transliteration: "transliteration",
  meaning: "meaning",
  practice: "practice",
};

export function parseGuidance(raw: string): ParsedGuidance {
  const result: ParsedGuidance = { raw };
  const blocks = raw.split(/^###\s+/m).slice(1);
  for (const block of blocks) {
    const nl = block.indexOf("\n");
    const heading = (nl === -1 ? block : block.slice(0, nl)).trim().toLowerCase();
    const body = (nl === -1 ? "" : block.slice(nl + 1)).trim();
    const key = KEYS[heading];
    if (!key) continue;
    if (key === "practice") {
      result.practice = body
        .split("\n")
        .map((l) => l.replace(/^[-*\d.]+\s*/, "").trim())
        .filter(Boolean);
    } else if (key !== "raw") {
      result[key] = body as never;
    }
  }
  return result;
}

function stripMd(text: string) {
  return text.replace(/\*\*/g, "").replace(/\*/g, "");
}

export function GuidanceAnswer({
  parsed,
  onSaveVerse,
}: {
  parsed: ParsedGuidance;
  onSaveVerse?: (verseRef: string) => void;
}) {
  const hasSections = Boolean(parsed.theme || parsed.verse || parsed.meaning);

  if (!hasSections) {
    return (
      <div className="panel p-5 text-sm leading-relaxed whitespace-pre-wrap">
        {stripMd(parsed.raw)}
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden">
      {parsed.theme && (
        <div className="flex items-center gap-2 border-b border-border/70 bg-secondary/40 px-5 py-3">
          <Sparkles className="size-4 text-primary" aria-hidden />
          <span className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
            Core theme
          </span>
          <span className="ml-auto text-sm font-semibold text-primary">
            {stripMd(parsed.theme)}
          </span>
        </div>
      )}

      <div className="space-y-5 p-5">
        {parsed.verse && (
          <div className="flex items-start gap-3">
            <Quote className="mt-1 size-4 shrink-0 text-lotus" aria-hidden />
            <p className="font-display text-2xl leading-snug">{stripMd(parsed.verse)}</p>
            {onSaveVerse && (
              <button
                type="button"
                onClick={() => onSaveVerse(stripMd(parsed.verse!))}
                className="ml-auto rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
                aria-label="Save this verse to your journal"
              >
                <Bookmark className="size-4" />
              </button>
            )}
          </div>
        )}

        {parsed.sanskrit && (
          <p className="sanskrit rounded-lg border border-border/60 bg-secondary/30 px-4 py-3 text-lg whitespace-pre-line">
            {stripMd(parsed.sanskrit)}
          </p>
        )}

        {parsed.transliteration && (
          <p className="text-sm text-muted-foreground italic">{stripMd(parsed.transliteration)}</p>
        )}

        {parsed.meaning && (
          <p className="text-[15px] leading-relaxed">{stripMd(parsed.meaning)}</p>
        )}

        {parsed.practice?.length ? (
          <div>
            <h3 className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
              Practice today
            </h3>
            <ul className="mt-2 space-y-2">
              {parsed.practice.map((item, i) => (
                <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  {stripMd(item)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
