/** Visible AEO direct-answer block (40–70 words) for answer engines. */
export function AeoAnswer({ text }: { text: string }) {
  if (!text?.trim()) return null;
  return (
    <p className="aeo-answer text-[15px] leading-relaxed text-ink-muted max-w-3xl" data-aeo="answer">
      {text}
    </p>
  );
}
