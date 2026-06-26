import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { postJSON } from "../lib/api";
import { FormField, PasswordInput } from "../components/FormControls";
import { InlineNotice, PageHeader } from "../components/UIState";

export default function Login() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await postJSON("/login", { username, password });
      await refresh();
      navigate("/");
    } catch (e) {
      setErr(e.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 md:px-0 py-12 md:py-16" data-testid="login-page">
      <PageHeader
        eyebrow="Account"
        title="Welcome back"
        description="Log in to save scores, post updates, follow creators, and publish games."
      />
      <form onSubmit={submit} className="mt-8 space-y-4">
        <FormField id="login-username" label="Username">
          <input
            id="login-username"
            data-testid="login-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input"
            autoComplete="username"
            required
          />
        </FormField>
        <FormField id="login-password" label="Password">
          <PasswordInput
            id="login-password"
            data-testid="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </FormField>
        {err && (
          <InlineNotice tone="error" testId="login-error">{err}</InlineNotice>
        )}
        <button
          type="submit"
          disabled={loading}
          data-testid="login-submit"
          className="btn-primary w-full h-12"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>
      <div className="text-[#A1A1AA] text-sm mt-6">
        New here?{" "}
        <Link to="/onboarding" className="text-[#D4AF37] hover:text-[#F1D77A] underline">
          Create an account
        </Link>
      </div>
    </div>
  );
}
