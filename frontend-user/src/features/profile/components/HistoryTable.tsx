import { HistoryItem } from "../types";

interface HistoryTableProps {
  history: HistoryItem[];
}

export function HistoryTable({ history }: HistoryTableProps) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-black/10 text-left">
          <th className="py-2">Event</th>
          <th className="py-2">Item</th>
          <th className="py-2">Rarity</th>
          <th className="py-2">Cost</th>
          <th className="py-2">When</th>
        </tr>
      </thead>
      <tbody>
        {history.map((h) => (
          <tr key={h.id} className="border-b border-black/5">
            <td className="py-2">{h.eventName}</td>
            <td className="py-2">{h.itemName}</td>
            <td className="py-2 capitalize">{h.rarity}</td>
            <td className="py-2">{h.coinsSpent}</td>
            <td className="py-2 text-black/50">{new Date(h.createdAt).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
