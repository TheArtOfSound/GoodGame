import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { postJSON } from "../lib/api";

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
    <div className="max-w-md mx-auto px-4 md:px-0 py-16" data-testid="login-page">
      <div className="text-[#D4AF37] font-mono text-xs uppercase tracking-[0.3em]">
        Log in
      </div>
      <h1 className="text-3xl font-bold uppercase text-white mt-2">Welcome back</h1>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Username">
          <input
            data-testid="login-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input"
            autoComplete="username"
            required
          />
        </Field>
        <Field label="Password">
          <input
            data-testid="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            className="input"
            autoComplete="current-password"
            required
          />
        </Field>
        {err && (
          <div className="text-[#FF3B30] text-sm font-mono" data-testid="login-error">
            {err}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          data-testid="login-submit"
          className="w-full h-12 bg-[#D4AF37] text-black font-bold uppercase tracking-wider hover:bg-[#E5C158] disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>
      <div className="text-[#A1A1AA] text-sm mt-6">
        New here?{" "}
        <Link to="/onboarding" className="text-[#D4AF37] underline">
          Create an account
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
