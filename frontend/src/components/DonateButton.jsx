import { useState } from "react";
import { Heart, LockKeyhole, Sparkles, X } from "lucide-react";
import { postJSON } from "../lib/api";

const presets = [5, 15, 25, 50];

export default function DonateButton({ variant = "nav", className = "" }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("15");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await postJSON("/donations/checkout", { amount });
      window.location.assign(r.url);
    } catch (e2) {
      setErr(e2.response?.data?.detail || "Could not open donation checkout");
      setBusy(false);
    }
  };

  const label = variant === "hero" ? "Support GoodGame" : "Donate";
  const buttonClass =
    variant === "hero"
      ? "border border-[#D4AF37]/50 text-white font-bold uppercase tracking-wider text-sm px-6 h-12 flex items-center gap-2 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors"
      : variant === "footer"
        ? "inline-flex items-center gap-2 border border-[#D4AF37]/40 text-white hover:text-[#D4AF37] hover:border-[#D4AF37] px-4 h-10 text-xs uppercase font-bold tracking-wider transition-colors"
        : "text-[#F1D77A] border border-[#D4AF37]/30 hover:border-[#D4AF37] px-4 h-10 flex items-center gap-2 uppercase tracking-wider text-xs font-bold transition-colors";

  return (
    <>
      <button
        type="button"
        data-testid={`donate-open-${variant}`}
        onClick={() => setOpen(true)}
        className={`${buttonClass} ${className}`}
      >
        <Heart className="w-4 h-4" /> {label}
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="donate-title"
          data-testid="donate-dialog"
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center px-4"
        >
          <div className="relative w-full max-w-md border border-[#2A2410] bg-[#050505] shadow-2xl shadow-[#D4AF37]/10">
            <button
              type="button"
              aria-label="Close donation dialog"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 text-[#A1A1AA] hover:text-white p-2"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-6 md:p-7">
              <div className="flex items-center gap-2 text-[#D4AF37] font-mono text-xs uppercase tracking-[0.24em]">
                <Sparkles className="w-4 h-4" /> Support the arcade
              </div>
              <h2 id="donate-title" className="mt-3 text-2xl font-black uppercase tracking-tight text-white">
                Keep GoodGame free to play and upload.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#A1A1AA]">
                Choose any amount. Donations go through Stripe Checkout and help fund hosting, creator tools, and community features.
              </p>
              <form onSubmit={submit} className="mt-6 space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  {presets.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAmount(String(p))}
                      className={`h-11 border text-sm font-bold transition-colors ${
                        Number(amount) === p
                          ? "border-[#D4AF37] bg-[#D4AF37] text-black"
                          : "border-[#1A1A1A] text-white hover:border-[#D4AF37]/70"
                      }`}
                    >
                      ${p}
                    </button>
                  ))}
                </div>
                <label className="block">
                  <span className="text-[#52525B] font-mono text-xs uppercase tracking-[0.2em]">Custom amount</span>
                  <div className="mt-2 flex items-center border border-[#1A1A1A] bg-black focus-within:border-[#D4AF37]">
                    <span className="pl-4 text-[#D4AF37] font-bold">$</span>
                    <input
                      data-testid="donate-amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      inputMode="decimal"
                      min="1"
                      max="10000"
                      step="0.01"
                      required
                      className="w-full bg-transparent px-2 h-12 text-white outline-none font-mono"
                    />
                  </div>
                </label>
                {err && <div className="text-[#FF3B30] text-sm font-mono">{err}</div>}
                <button
                  type="submit"
                  disabled={busy}
                  data-testid="donate-submit"
                  className="w-full h-12 bg-[#D4AF37] text-black font-black uppercase tracking-wider hover:bg-[#E5C158] disabled:opacity-50"
                >
                  {busy ? "Opening Stripe..." : "Donate with Stripe"}
                </button>
                <div className="flex items-center justify-center gap-2 text-[#52525B] text-xs">
                  <LockKeyhole className="w-3.5 h-3.5" /> Secure checkout. GoodGame never sees card details.
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
