import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function FormField({ id, label, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-[#71717A] font-mono text-[11px] uppercase tracking-[0.18em] mb-2">
        {label}
      </label>
      {children}
      {hint && <p id={`${id}-hint`} className="text-[#52525B] text-xs mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  );
}

export function PasswordInput({ id, className = "input", ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={visible ? "text" : "password"} className={`${className} pr-12`} {...props} />
      <button
        type="button"
        className="absolute right-1 top-1 w-10 h-10 grid place-items-center text-[#71717A] hover:text-white"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
