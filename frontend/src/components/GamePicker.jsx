import { useEffect, useState, useRef } from "react";
import { getJSON } from "../lib/api";
import { BACKEND_URL } from "../lib/config";

/**
 * Autocomplete picker for selecting a game by title or tag.
 * Calls /api/search?q= and exposes `onSelect(game)` with slug + title.
 */
export default function GamePicker({ value, onChange, placeholder = "Search a game..." }) {
  const [query, setQuery] = useState(value?.title || "");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const tRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => {
      getJSON(`/search?q=${encodeURIComponent(query)}&limit=8`)
        .then((d) => setResults(d.results || []))
        .catch(() => setResults([]));
    }, 200);
    return () => clearTimeout(tRef.current);
  }, [query]);

  const select = (g) => {
    onChange?.(g);
    setQuery(g.title);
    setOpen(false);
  };

  return (
    <div className="relative" data-testid="game-picker">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value) onChange?.(null);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter" && open && results[highlight]) {
            e.preventDefault();
            select(results[highlight]);
          }
        }}
        placeholder={placeholder}
        className="input"
        data-testid="game-picker-input"
      />
      {open && results.length > 0 && (
        <ul
          className="absolute z-30 left-0 right-0 mt-1 max-h-72 overflow-auto bg-[#0A0A0A] border border-[#1A1A1A] shadow-xl"
          data-testid="game-picker-results"
        >
          {results.map((g, i) => (
            <li
              key={g.id}
              onMouseDown={() => select(g)}
              onMouseEnter={() => setHighlight(i)}
              data-testid={`game-picker-option-${g.slug}`}
              className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${
                i === highlight ? "bg-[#141414]" : ""
              }`}
            >
              {g.cover_image ? (
                <img
                  src={`${BACKEND_URL}${g.cover_image}`}
                  alt=""
                  className="w-12 h-7 object-cover bg-black"
                />
              ) : (
                <div className="w-12 h-7 bg-[#1A1A1A]" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-white text-sm truncate">{g.title}</div>
                <div className="text-[#52525B] font-mono text-[10px] uppercase tracking-[0.2em] truncate">
                  @{g.owner_username}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
