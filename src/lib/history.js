const STORAGE_KEY = "ecoscan_history";

export function getHistory() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveScan(scan) {
  const history = getHistory();
  const entry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...scan,
  };
  history.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return entry;
}

export function getScan(id) {
  return getHistory().find((s) => s.id === id) || null;
}

export function deleteScan(id) {
  const history = getHistory().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return history;
}

export function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
}
