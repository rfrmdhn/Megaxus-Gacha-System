export function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-black/10">
      <div className="h-1 bg-gradient-to-r from-brand-red-400 via-brand-red-600 to-brand-red-900" />
      <div className="p-4">
        <div className="text-xs text-black/50">{label}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
      </div>
    </div>
  );
}
