interface CoinBadgeProps {
  coins: number;
}

export function CoinBadge({ coins }: CoinBadgeProps) {
  return (
    <span className="rounded-full bg-brand-yellow/20 px-3 py-1 text-lg font-semibold text-amber-700">
      {coins} coins
    </span>
  );
}
