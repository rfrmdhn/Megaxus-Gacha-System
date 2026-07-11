export function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
      <div className="h-1 bg-gradient-to-r from-brand-cyan via-brand-purple to-brand-pink" />
      <div className="p-4">
        <div className="text-xs text-black/50 dark:text-white/50">{label}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
      </div>
    </div>
  );
}
