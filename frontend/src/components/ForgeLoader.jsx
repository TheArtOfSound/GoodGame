import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";

const STAGE_COPY = [
  { id: "dna", label: "Locking design DNA", detail: "Genre, camera, loop, UI chrome…" },
  { id: "design", label: "Thinking like a designer", detail: "Core loop, menus, buttons, HUD, feel…" },
  { id: "systems", label: "Speccing systems", detail: "Progression, scoring, win/lose, mobile controls…" },
  { id: "code", label: "Writing the game", detail: "Canvas loop, states, polish, juice…" },
  { id: "pack", label: "Packaging your draft", detail: "Almost ready to play…" },
];

/**
 * Full-screen animated “creating your game” experience.
 * Advances stages on a timer while the parent request runs; snaps to done when `done`.
 */
export default function ForgeLoader({ active, done, prompt, recipeLabels = [] }) {
  const [tick, setTick] = useState(0);
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    if (!active) {
      setStageIdx(0);
      setTick(0);
      return undefined;
    }
    const t = setInterval(() => setTick((n) => n + 1), 80);
    return () => clearInterval(t);
  }, [active]);

  useEffect(() => {
    if (!active || done) return undefined;
    // Advance stages slowly so deep design + code feel intentional
    const t = setInterval(() => {
      setStageIdx((i) => Math.min(i + 1, STAGE_COPY.length - 1));
    }, 4200);
    return () => clearInterval(t);
  }, [active, done]);

  useEffect(() => {
    if (done) setStageIdx(STAGE_COPY.length - 1);
  }, [done]);

  const particles = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        left: `${(i * 37) % 100}%`,
        delay: `${(i % 9) * 0.35}s`,
        dur: `${3.2 + (i % 5) * 0.4}s`,
        size: 2 + (i % 4),
      })),
    [],
  );

  if (!active) return null;

  const progress = done
    ? 100
    : Math.min(92, Math.round(((stageIdx + 1) / STAGE_COPY.length) * 78 + (tick % 20)));

  return (
    <div className="forge-loader" data-testid="forge-loader" role="status" aria-live="polite" aria-busy={!done}>
      <div className="forge-loader-bg" aria-hidden="true">
        {particles.map((p) => (
          <span
            key={p.id}
            className="forge-loader-particle"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
              animationDuration: p.dur,
            }}
          />
        ))}
        <div className="forge-loader-grid" />
        <div className="forge-loader-glow" />
      </div>

      <div className="forge-loader-card">
        <div className="forge-loader-badge">
          <Sparkles className="w-4 h-4" /> Forge
        </div>
        <h2 className="forge-loader-title">
          {done ? "Draft ready" : "Creating your game"}
        </h2>
        {prompt ? (
          <p className="forge-loader-prompt">&ldquo;{prompt.slice(0, 120)}{prompt.length > 120 ? "…" : ""}&rdquo;</p>
        ) : null}

        {recipeLabels.length > 0 && (
          <div className="forge-loader-tags">
            {recipeLabels.slice(0, 8).map((t) => (
              <span key={t} className="forge-loader-tag">{t}</span>
            ))}
          </div>
        )}

        <div className="forge-loader-ring-wrap" aria-hidden="true">
          <svg className="forge-loader-ring" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" className="forge-loader-ring-track" />
            <circle
              cx="60"
              cy="60"
              r="52"
              className="forge-loader-ring-fill"
              style={{
                strokeDasharray: `${2 * Math.PI * 52}`,
                strokeDashoffset: `${2 * Math.PI * 52 * (1 - progress / 100)}`,
              }}
            />
          </svg>
          <div className="forge-loader-pct">{progress}%</div>
        </div>

        <ol className="forge-loader-stages">
          {STAGE_COPY.map((s, i) => {
            const state = i < stageIdx ? "done" : i === stageIdx ? "active" : "todo";
            return (
              <li key={s.id} className={`forge-loader-stage is-${state}`}>
                <span className="forge-loader-dot" />
                <div>
                  <div className="forge-loader-stage-label">{s.label}</div>
                  <div className="forge-loader-stage-detail">{s.detail}</div>
                </div>
              </li>
            );
          })}
        </ol>

        <p className="forge-loader-foot">
          {done ? "Opening workspace…" : "Deep design pass + full game code — usually under a minute."}
        </p>
      </div>
    </div>
  );
}
