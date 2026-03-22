import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getHistory, deleteScan, clearHistory } from "../lib/history";
import { getTierStyles, getScoreTier } from "../lib/score";
import { useScanStore } from "../store/scanStore";

export default function HistoryPage() {
  const navigate = useNavigate();
  const loadFromHistory = useScanStore((s) => s.loadFromHistory);
  const [history, setHistory] = useState(() => getHistory());
  const [search, setSearch] = useState("");

  const handleOpen = (id) => {
    loadFromHistory(id);
    navigate("/");
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return history;
    const q = search.toLowerCase();
    return history.filter(
      (s) =>
        s.product_name?.toLowerCase().includes(q) ||
        s.brand?.toLowerCase().includes(q)
    );
  }, [history, search]);

  const handleDelete = (id) => {
    const updated = deleteScan(id);
    setHistory(updated);
  };

  const handleClear = () => {
    if (window.confirm("Clear all scan history?")) {
      clearHistory();
      setHistory([]);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-bold text-green-900">History</h1>
        {history.length > 0 && (
          <button
            onClick={handleClear}
            className="text-sm text-terra-500 hover:text-terra-700 font-medium"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Search */}
      {history.length > 0 && (
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search records..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full py-2.5 px-4 pl-10 rounded-xl bg-cream-100 border border-cream-200 focus:outline-none focus:border-green-400 text-sm"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
        </div>
      )}

      {/* Empty state */}
      {history.length === 0 && (
        <div className="text-center py-16 text-green-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-16 h-16 mx-auto mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="font-medium">No scans yet</p>
          <p className="text-sm mt-1">Scan a product to see it here</p>
        </div>
      )}

      {/* Scan list */}
      <div className="space-y-3">
        {filtered.map((scan) => {
          const styles = getTierStyles(scan.score);
          const tier = getScoreTier(scan.score);
          const date = new Date(scan.timestamp).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });

          return (
            <div
              key={scan.id}
              onClick={() => handleOpen(scan.id)}
              className="flex items-center gap-4 p-4 rounded-2xl bg-white shadow-sm cursor-pointer hover:bg-cream-50 transition-colors"
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-lg ${styles.bg} ${styles.text}`}
              >
                {scan.score}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{scan.product_name}</p>
                <p className="text-sm text-green-600">{scan.brand}</p>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-xs font-medium ${styles.text}`}>{tier.label}</div>
                <div className="text-xs text-green-400 mt-0.5">{date}</div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(scan.id); }}
                className="text-cream-300 hover:text-terra-500 transition-colors p-1"
                title="Delete"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && history.length > 0 && (
        <p className="text-center py-8 text-green-400 text-sm">No scans matching "{search}"</p>
      )}
    </div>
  );
}
