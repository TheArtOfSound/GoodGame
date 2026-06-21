import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { postJSON } from "../lib/api";

export default function Onboarding() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    display_name: "",
    password: "",
    pin: "",
  });
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const setField = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await postJSON("/onboarding", form);
      await refresh();
      navigate("/feed?welcome=1");
    } catch (e) {
      setErr(e.response?.data?.detail || "Could not create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 md:px-0 py-16" data-testid="onboarding-page">
      <div className="text-[#D4AF37] font-mono text-xs uppercase tracking-[0.3em]">
        Join GoodGame
      </div>
      <h1 className="text-3xl font-bold uppercase text-white mt-2">Create an account</h1>
      <p className="text-[#A1A1AA] mt-2 text-sm">
        Free. No wallet, no token. One account to play, post, follow, and ship games.
      </p>
      <ul className="mt-4 space-y-1.5 text-sm text-[#A1A1AA]" data-testid="onb-valueprops">
        <li>&#9654; Play any game instantly in your browser</li>
        <li>&#10022; Generate a game from a prompt with Forge — no code</li>
        <li>&hearts; Post updates, follow creators, and build a following</li>
      </ul>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Username (3-24, a-z 0-9 _)">
          <input
            data-testid="onb-username"
            value={form.username}
            onChange={setField("username")}
            className="input"
            required
            autoComplete="username"
            pattern="[a-zA-Z0-9_]{3,24}"
          />
        </Field>
        <Field label="Display name (optional)">
          <input
            data-testid="onb-display-name"
            value={form.display_name}
            onChange={setField("display_name")}
            className="input"
          />
        </Field>
        <Field label="Password (min 8)">
          <input
            data-testid="onb-password"
            value={form.password}
            onChange={setField("password")}
            type="password"
            minLength={8}
            className="input"
            required
            autoComplete="new-password"
          />
        </Field>
        <Field label="PIN (4-8 digits)">
          <input
            data-testid="onb-pin"
            value={form.pin}
            onChange={setField("pin")}
            inputMode="numeric"
            pattern="[0-9]{4,8}"
            className="input"
            required
          />
          <div className="text-[#52525B] text-xs mt-1.5">
            A short numeric code for quick confirmations — separate from your password.
          </div>
        </Field>
        {err && (
          <div className="text-[#FF3B30] text-sm font-mono" data-testid="onb-error">
            {err}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          data-testid="onb-submit"
          className="w-full h-12 bg-[#D4AF37] text-black font-bold uppercase tracking-wider hover:bg-[#E5C158] disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>
      <div className="text-[#A1A1AA] text-sm mt-6">
        Already on GoodGame?{" "}
        <Link to="/login" className="text-[#D4AF37] underline">
          Log in
        </Link>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-[#52525B] font-mono text-xs uppercase tracking-[0.2em] mb-2">
        {label}
      </div>
      {children}
    </label>
  );
}
