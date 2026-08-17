import { useCallback, useEffect, useState } from "react";

const seen = () => {
  try {
    return window.sessionStorage.getItem("gg-alley-boot") === "1";
  } catch {
    return false;
  }
};

const remember = () => {
  try {
    window.sessionStorage.setItem("gg-alley-boot", "1");
  } catch {
    /* private mode */
  }
};

export default function BootScreen() {
  const [phase, setPhase] = useState(() => {
    if (typeof window === "undefined") return "skip";
    if (new URLSearchParams(window.location.search).has("nboot") || seen()) return "skip";
    return "on";
  });

  const dismiss = useCallback(() => {
    remember();
    setPhase("skip");
  }, []);

  useEffect(() => {
    if (phase === "skip") return undefined;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tMark = window.setTimeout(() => setPhase("mark"), reduce ? 80 : 500);
    const tGone = window.setTimeout(dismiss, reduce ? 200 : 1600);
    const onKey = (event) => {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        dismiss();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(tMark);
      window.clearTimeout(tGone);
      window.removeEventListener("keydown", onKey);
    };
  }, [dismiss, phase === "skip"]);

  if (phase === "skip") return null;

  return (
    <div
      className={`alley-boot is-${phase}`}
      role="dialog"
      aria-label="GoodGame alley power-on"
      aria-live="polite"
      data-testid="alley-boot"
      onClick={dismiss}
    >
      <img src="/brand/alley/crt.webp" alt="" className="alley-boot-crt" />
      <div className="alley-boot-scan" aria-hidden="true" />
      <div className="alley-boot-vignette" aria-hidden="true" />
      <div className="alley-boot-copy">
        <img src="/brand/alley/mark.webp" alt="" className="alley-boot-mark" width={96} height={96} />
        <div className="alley-boot-line">GOODGAME // ALLEY POWER</div>
        <div className="alley-boot-sub">warming the cabinets…</div>
        <button type="button" className="alley-boot-enter" onClick={dismiss}>
          Enter the alley
        </button>
      </div>
    </div>
  );
}
