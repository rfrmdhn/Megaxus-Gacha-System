interface CoinBadgeProps {
  coins: number;
}

export function CoinBadge({ coins }: CoinBadgeProps) {
  return (
    <span className="rounded-full bg-brand-yellow px-3 py-1 text-lg font-semibold text-brand-ink">
      {coins} coins
    </span>
  );
}
