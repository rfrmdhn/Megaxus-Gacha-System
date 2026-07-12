export interface AdminItem {
  id: string;
  name: string;
  rarity: string;
  dropRate: string;
  imageKey: string | null;
}

export interface AdminEvent {
  id: string;
  name: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  items: AdminItem[];
}
