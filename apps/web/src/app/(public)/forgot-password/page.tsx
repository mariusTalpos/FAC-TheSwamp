"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setPending(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setMessage(
        "If an account exists for that email, you will receive reset instructions shortly.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main>
      <h1>Forgot password</h1>
      <p>Enter your email address. For security, the response is always the same.</p>
      <form className="stack" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {message ? (
          <p className="success" role="status">
            {message}
          </p>
        ) : null}
        <button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p>
        <Link href="/login">Back to sign in</Link>
      </p>
    </main>
  );
}
