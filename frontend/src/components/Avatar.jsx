import { useEffect, useState } from "react";
import { BACKEND_URL } from "../lib/config";

export default function Avatar({ value, name, className = "", textClassName = "" }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [value]);

  const isImage = typeof value === "string" && (
    (value.startsWith("/") && !value.startsWith("/media/")) ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:")
  );
  const src = isImage && value.startsWith("/") ? `${BACKEND_URL}${value}` : value;
  const accent = typeof value === "string" && value.startsWith("#") ? value : "#D4AF37";
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <div className={`overflow-hidden bg-[#0A0A0A] flex items-center justify-center ${className}`}>
      {isImage && !failed ? (
        <img src={src} alt="" className="w-full h-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <span className={`font-black uppercase ${textClassName}`} style={{ color: accent }}>
          {initial}
        </span>
      )}
    </div>
  );
}
