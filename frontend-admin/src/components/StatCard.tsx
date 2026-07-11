export function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded border border-black/10 p-4 dark:border-white/10">
      <div className="text-xs text-black/50 dark:text-white/50">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
