import { AlertCircle, Inbox, LoaderCircle } from "lucide-react";

export function PageHeader({ eyebrow, title, description, actions, children }) {
  return (
    <header className="page-header">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-description">{description}</p>}
        {children}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function PageLoader({ label = "Loading", compact = false }) {
  return (
    <div
      className={`loading-state ${compact ? "is-compact" : ""}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <LoaderCircle className="loading-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function GridSkeleton({ count = 6, className = "" }) {
  return (
    <div className={`game-grid ${className}`} role="status" aria-label="Loading games">
      {Array.from({ length: count }).map((_, index) => (
        <div className="skeleton-card" key={index} aria-hidden="true">
          <div className="skeleton-block aspect-video" />
          <div className="p-3 space-y-2">
            <div className="skeleton-line w-3/4" />
            <div className="skeleton-line w-1/2 is-small" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  eyebrow,
  title,
  body,
  action,
  className = "",
  testId,
}) {
  return (
    <div className={`empty-state ${className}`} data-testid={testId}>
      <Icon className="w-6 h-6 text-[#D4AF37]" aria-hidden="true" />
      {eyebrow && <div className="eyebrow mt-3">{eyebrow}</div>}
      <div className="text-white font-bold text-lg mt-2">{title}</div>
      {body && <p className="text-[#71717A] text-sm mt-1 max-w-lg">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", body, action, className = "", testId }) {
  return (
    <div className={`error-state ${className}`} role="alert" data-testid={testId}>
      <AlertCircle className="w-6 h-6 text-[#FF7A7A]" aria-hidden="true" />
      <div className="text-white font-bold text-lg mt-3">{title}</div>
      {body && <p className="text-[#A1A1AA] text-sm mt-1 max-w-lg">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function InlineNotice({ tone = "neutral", children, className = "", testId }) {
  return (
    <div
      className={`inline-notice is-${tone} ${className}`}
      role={tone === "error" ? "alert" : "status"}
      data-testid={testId}
    >
      {children}
    </div>
  );
}

export function CharacterCount({ value = "", max }) {
  return (
    <span className="character-count" aria-live="polite">
      {value.length}/{max}
    </span>
  );
}
