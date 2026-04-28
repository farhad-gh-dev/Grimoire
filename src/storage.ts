export interface StorageEstimate {
  usage: number;
  quota: number;
  percent: number;
}

export async function getStorageEstimate(): Promise<StorageEstimate | null> {
  if (!('storage' in navigator) || !navigator.storage.estimate) return null;
  try {
    const e = await navigator.storage.estimate();
    const usage = e.usage ?? 0;
    const quota = e.quota ?? 0;
    if (quota === 0) return { usage, quota: 0, percent: 0 };
    return { usage, quota, percent: Math.min(100, (usage / quota) * 100) };
  } catch {
    return null;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}
