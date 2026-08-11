export interface HistoryItem {
  id: string;
  type: 'generate' | 'decode';
  timestamp: number;
  format: 'pdf417';
  rawPayload: string;
  title: string;
  subtitle?: string;
  sensitive?: boolean;
}

const HISTORY_KEY = 'pdf417_studio_history_v1';

export function getHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveHistoryItem(item: Omit<HistoryItem, 'id' | 'timestamp'>): void {
  if (typeof window === 'undefined') return;
  try {
    const items = getHistory();
    const newItem: HistoryItem = {
      ...item,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
    };
    // Keep max 100 items
    const updated = [newItem, ...items].slice(0, 100);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    // Storage limit exceeded or disabled
  }
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (e) {}
}

export function removeHistoryItem(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const items = getHistory().filter((i) => i.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch (e) {}
}
