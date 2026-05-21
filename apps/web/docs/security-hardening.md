# Security hardening notes (E1)

- **Transport**: Terminate TLS at the reverse proxy or platform edge; never run production without HTTPS.
- **Secrets**: Keep `AUTH_SECRET`, database credentials, and SMTP credentials out of git; rotate on any leak.
- **Passwords**: Stored as bcrypt hashes; enforce minimum length (10+) at validation; consider stronger composition rules when FAC policy is finalized.
- **Enumeration**: Forgot-password always returns `202` with a generic client message.
- **Reset tokens**: Single-use, time-limited, stored as SHA-256 hashes in `verificationToken`; identifier prefix `reset:` scopes password-reset rows.
- **Sessions**: Database-backed sessions allow revocation when roles or account status change; privileged Route Handlers should still re-check assignments where required.
- **Rate limiting**: Prefer edge or reverse-proxy rate limits for `/api/auth/*` and admin mutation routes; a minimal in-process limiter is not included here to avoid misleading semantics in serverless/multi-instance deployments.
