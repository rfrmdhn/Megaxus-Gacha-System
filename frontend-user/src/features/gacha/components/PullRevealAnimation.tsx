export function PullRevealAnimation() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-black/10 p-8">
      <div className="animate-gacha-capsule h-16 w-16 rounded-full bg-gradient-to-br from-brand-cyan via-brand-purple to-brand-pink shadow-lg shadow-brand-purple/30" />
      <p className="text-sm text-black/60">Opening...</p>
    </div>
  );
}
