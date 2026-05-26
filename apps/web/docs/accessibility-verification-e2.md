# Accessibility verification — Epic E2 (Teams & Rosters)

WCAG 2.1 AA checkpoint for primary E2 flows. Manual keyboard pass required before release.

## US1 — FAC admin teams

- [ ] Admin team list: tab order reaches create form and team links
- [ ] Create team form: every control has visible `<label>` or `aria-label`
- [ ] Deactivate team: confirmation dialog is keyboard-operable (`window.confirm` baseline)
- [ ] Team detail: captain assign `<select>` labeled; roster removal not color-only

## US2 — Fighter apply / captain queue

- [ ] Fighter affiliation: apply flow operable without pointer-only controls
- [ ] Unaffiliated status readable as text (not color alone)
- [ ] Captain pending queue: Approve/Reject use confirmation; errors use `role="alert"`
- [ ] Member roster panel: list items have text labels for member kind
- [ ] `/me` affiliation link descriptive for screen readers

## US3 — Squire flows

- [ ] Squire apply kind selector labeled
- [ ] Captain pending filter by `member_kind` keyboard accessible
- [ ] Roster `member_kind` column has `aria-label` on badge/cell

## US4 — Roster removal & history

- [ ] Captain roster removal: confirm dialog before end membership
- [ ] Admin team detail: end membership control keyboard reachable
- [ ] History list announced as list semantics (`<ul>`)

## US5 / Public (optional)

- [ ] Marshal `/me` does not imply required team join in sole link text
- [ ] Public team page (when `PUBLIC_TEAM_ROSTER=true`): heading structure h1 → h2

## Sign-off

| Area | Verified by | Date |
|------|-------------|------|
| US1 | | |
| US2 | | |
| US3 | | |
| US4 | | |
| Full matrix | | |
