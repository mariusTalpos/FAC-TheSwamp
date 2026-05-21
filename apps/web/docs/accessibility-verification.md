# Accessibility verification (primary flows)

**Date**: 2026-05-13  
**Scope**: Fighter registration, sign-in, forgot password, reset password, fighter profile editor (owner), FAC admin users screen (destructive confirmations present).

## Method

Manual keyboard pass with visible focus states and form labels, plus automated checks via Playwright + `@axe-core/playwright` on `/`, `/register/fighter`, `/login`, `/forgot-password` (see `e2e/a11y-smoke.spec.ts`).

## Results

- Forms expose text labels associated with inputs (`htmlFor` / `id` pairs).
- Error and status messages use `role="alert"` / `role="status"` where applicable on auth pages.
- Destructive admin actions use `window.confirm` as an interim guard pending richer modal UX.

## Follow-ups

- Replace `window.confirm` with accessible modal dialogs when a shared dialog primitive exists.
- Expand axe coverage to authenticated routes once Playwright test login helpers stabilize for this repo.
