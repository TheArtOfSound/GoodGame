import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { postJSON } from "../lib/api";
import { Check } from "lucide-react";
import { FormField, PasswordInput } from "../components/FormControls";
import { InlineNotice, PageHeader } from "../components/UIState";

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
    <div className="max-w-md mx-auto px-4 md:px-0 py-12 md:py-16" data-testid="onboarding-page">
      <PageHeader
        eyebrow="Join GoodGame"
        title="Create an account"
        description="Free. No wallet or token. One account for playing, creating, and joining the community."
      />
      <ul className="mt-4 space-y-1.5 text-sm text-[#A1A1AA]" data-testid="onb-valueprops">
        {[
          "Play any game instantly in your browser",
          "Generate a playable draft with Forge",
          "Post updates, follow creators, and save scores",
        ].map((item) => (
          <li className="flex gap-2" key={item}>
            <Check className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
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
