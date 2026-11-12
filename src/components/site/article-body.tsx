/**
 * Minimal article renderer. Content format (stored as plain text):
 *   blank line  → new paragraph
 *   "## Title"  → section heading
 *   "*text*"    → italic note
 * Swap for a markdown renderer later if you need richer formatting.
 */
export function ArticleBody({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="space-y-5 text-lg leading-9 text-ink-soft">
      {blocks.map((b, i) =>
        b.startsWith("## ") ? (
          <h2 key={i} className="pt-4 text-2xl font-extrabold text-brand-900">{b.slice(3)}</h2>
        ) : /^\*[^*]+\*$/.test(b) ? (
          <p key={i} className="rounded-2xl bg-sand-100 px-5 py-3 text-base italic">{b.slice(1, -1)}</p>
        ) : (
          <p key={i}>{b}</p>
        ),
      )}
    </div>
  );
}
