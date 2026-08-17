import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { postJSON } from "../lib/api";
import { Check } from "lucide-react";
import { FormField, PasswordInput } from "../components/FormControls";
import { InlineNotice } from "../components/UIState";
import { authPath, safeNext } from "../lib/navigation";

export default function Onboarding() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const next = safeNext(location.search, "");
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
      navigate(next || "/feed?welcome=1");
    } catch (e) {
      setErr(e.response?.data?.detail || "Could not create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-stage" data-testid="onboarding-page">
      <div className="form-stage-brand">
        <img src="/brand/alley/door.webp" alt="" />
        <div className="alley-rain" aria-hidden="true" />
        <div className="form-stage-brand-inner">
          <img src="/brand/alley/mark.webp" alt="" width={48} height={48} className="w-12 h-12 mb-4" />
          <div className="alley-stamp">FREE PASS</div>
          <h2 className="text-white leading-tight max-w-xs">
            The alley keeps a locker for you.
          </h2>
          <ul className="mt-5 space-y-2 text-sm text-[#C9C9D1]" data-testid="onb-valueprops">
            {[
              "Walk any cabinet — no install",
              "Wheel in an HTML5 zip and it goes live",
              "Tape scores, posts, and follows to your name",
            ].map((item) => (
              <li className="flex gap-2" key={item}>
                <Check className="w-4 h-4 text-[var(--sodium)] shrink-0 mt-0.5" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="form-stage-panel">
      <div className="eyebrow">Membership</div>
      <h1 className="page-title !text-3xl mt-1">Stamp a pass</h1>
      <p className="page-description !mt-2">
        Free. No wallet. One ticket for play, hosting, and the wall.
      </p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <FormField id="onb-username" label="Username" hint="3-24 letters, numbers, or underscores.">
          <input
            id="onb-username"
            data-testid="onb-username"
            value={form.username}
            onChange={setField("username")}
            className="input"
            required
            autoComplete="username"
            pattern="[a-zA-Z0-9_]{3,24}"
            aria-describedby="onb-username-hint"
          />
        </FormField>
        <FormField id="onb-display-name" label="Display name" hint="Optional. This is what other players see first.">
          <input
            id="onb-display-name"
            data-testid="onb-display-name"
            value={form.display_name}
            onChange={setField("display_name")}
            className="input"
            maxLength={60}
            autoComplete="name"
            aria-describedby="onb-display-name-hint"
          />
        </FormField>
        <FormField id="onb-password" label="Password" hint="Use at least 8 characters.">
          <PasswordInput
            id="onb-password"
            data-testid="onb-password"
            value={form.password}
            onChange={setField("password")}
            minLength={8}
            required
            autoComplete="new-password"
            aria-describedby="onb-password-hint"
          />
        </FormField>
        <FormField id="onb-pin" label="Confirmation PIN" hint="A separate 4-8 digit code used for quick confirmations.">
          <input
            id="onb-pin"
            data-testid="onb-pin"
            value={form.pin}
            onChange={setField("pin")}
            inputMode="numeric"
            pattern="[0-9]{4,8}"
            minLength={4}
            maxLength={8}
            autoComplete="off"
            className="input"
            required
            aria-describedby="onb-pin-hint"
          />
        </FormField>
        {err && (
          <InlineNotice tone="error" testId="onb-error">{err}</InlineNotice>
        )}
        <button
          type="submit"
          disabled={loading}
          data-testid="onb-submit"
          className="btn-primary w-full h-12"
        >
          {loading ? "Stamping..." : "Stamp my pass"}
        </button>
      </form>
      <div className="text-[#A1A1AA] text-sm mt-6">
        Already on the list?{" "}
        <Link to={authPath("/login", next || "/feed")} className="underline">
          Back door
        </Link>
      </div>
      </div>
    </div>
  );
}
