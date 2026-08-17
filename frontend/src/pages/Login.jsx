import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { postJSON } from "../lib/api";
import { FormField, PasswordInput } from "../components/FormControls";
import { InlineNotice } from "../components/UIState";
import { authPath, safeNext } from "../lib/navigation";

export default function Login() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const next = safeNext(location.search);
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
      navigate(next);
    } catch (e) {
      setErr(e.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-stage" data-testid="login-page">
      <div className="form-stage-brand">
        <img src="/brand/alley/door.webp" alt="" />
        <div className="alley-rain" aria-hidden="true" />
        <div className="form-stage-brand-inner">
          <img
            src="/brand/alley/mark.webp"
            alt=""
            width={48}
            height={48}
            className="w-12 h-12 mb-4"
          />
          <div className="alley-stamp">BACK DOOR</div>
          <h2 className="text-white leading-tight max-w-xs">
            Punch your ticket.
          </h2>
        </div>
      </div>

      <div className="form-stage-panel">
        <div className="eyebrow">Regulars</div>
        <h1 className="page-title !text-3xl mt-1">Welcome back</h1>
        <p className="page-description !mt-2">
          Scores, tape on the wall, and the machines you plugged in stay on this pass.
        </p>

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
            {loading ? "Checking the list..." : "Enter the alley"}
          </button>
        </form>
        <div className="text-[#A1A1AA] text-sm mt-6">
          First night?{" "}
          <Link to={authPath("/onboarding", next)} className="underline">
            Stamp a pass
          </Link>
        </div>
      </div>
    </div>
  );
}
