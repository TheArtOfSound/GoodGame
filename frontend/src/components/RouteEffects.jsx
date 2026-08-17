import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function RouteEffects() {
  const { pathname } = useLocation();
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!window.location.hash) window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    const main = document.getElementById("main-content");
    main?.focus({ preventScroll: true });
    setFlash(true);
    const t = window.setTimeout(() => setFlash(false), 280);
    return () => window.clearTimeout(t);
  }, [pathname]);

  if (!flash) return null;
  return <div className="alley-route-flash" aria-hidden="true" />;
}
