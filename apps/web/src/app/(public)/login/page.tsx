"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { isCredentialsSignInFailure } from "@/lib/auth/sign-in-result";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (isCredentialsSignInFailure(res)) {
        setError("Invalid email or password. Check spelling and try again.");
        return;
      }
      window.location.href = "/me";
    } finally {
      setPending(false);
    }
  }

  return (
    <main>
      <h1>Sign in</h1>
      <form className="stack" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p>
        <Link href="/forgot-password">Forgot password</Link>
      </p>
      <p>
        New fighter? <Link href="/register/fighter">Create an account</Link>
      </p>
      {process.env.NEXT_PUBLIC_DEV_LOGIN_HINT === "true" ? (
        <details style={{ marginTop: "1.5rem" }}>
          <summary>Dev test accounts</summary>
          <p style={{ fontSize: "0.9rem" }}>
            After <code>pnpm db:seed-dev</code>, password for all seeded users is{" "}
            <strong>TestPassword123!</strong> unless you set <code>DEV_SEED_PASSWORD</code>.
          </p>
          <ul style={{ fontSize: "0.9rem" }}>
            <li>
              <code>admin@fac.test</code> — FAC admin
            </li>
            <li>
              <code>fighter@fac.test</code> — fighter only (no admin)
            </li>
            <li>
              <code>marshal@fac.test</code> — hybrid marshal + fighter
            </li>
          </ul>
        </details>
      ) : null}
    </main>
  );
}
