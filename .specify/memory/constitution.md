<!--
Sync Impact Report
Version change: 0.0.0 (unfilled template) → 1.0.0
Modified principles: N/A (initial adoption; replaced five placeholder principles)
Added sections: I. Code Readability; II. Reusability; III. User Experience; Quality & Evidence;
  Review & Delivery; full Governance text
Removed sections: Placeholder principles IV–V (superseded by explicit Quality & Evidence and
  Review & Delivery sections)
Templates requiring updates:
  .specify/templates/plan-template.md — ✅ Constitution Check gates aligned
  .specify/templates/spec-template.md — ✅ constitution alignment note in User Scenarios
  .specify/templates/tasks-template.md — ✅ polish-phase constitution reminders
  .specify/templates/commands/*.md — ⚠ N/A (directory not present in repository)
Follow-up TODOs: none
-->

# FAC-App Constitution

## Core Principles

### I. Code Readability

**Rules**: Names, structure, and control flow MUST be understandable by a teammate without
informal tribal knowledge beyond the feature spec and declared types or contracts. Public
APIs and shared modules MUST state intent briefly (docstring, module README, or type-level
documentation where the codebase convention allows). Unexplained magic values, hidden side
effects, and clever one-liners that obscure behavior are forbidden unless an explicit
exception is recorded in the feature plan’s Complexity Tracking table with an inline code
comment linking to the spec or ADR.

**Rationale**: Readable code reduces defects, shortens review time, and keeps maintenance cost
bounded as FAC-App grows.

### II. Reusability

**Rules**: Non-trivial duplicated logic MUST be consolidated into a single well-named unit
(function, module, component, or package) with one clear responsibility. Reusable units MUST
declare inputs, outputs, and error behavior explicitly enough to be exercised independently
where practical. Copy-paste between features MUST not ship; if temporary duplication is
unavoidable, the plan MUST list removal as a tracked follow-up with an owner or milestone.

**Rationale**: Reuse prevents inconsistent behavior across features and lowers the cost of
global changes to business rules and presentation patterns.

### III. User Experience

**Rules**: Every feature MUST describe primary user journeys, critical error and empty
states, and accessibility expectations appropriate to the channel (UI, CLI, or API consumer).
Irreversible or destructive actions MUST be guarded by confirmation, safe undo, or an
equivalent recovery path defined in the spec. Latency, feedback, and clarity of messaging
MUST map to measurable success criteria; implementation choices MUST not trade away those
criteria without an approved spec or constitution amendment.

**Rationale**: FAC-App exists for its users; binding UX expectations to specs keeps delivery
accountable and testable.

## Quality & Evidence

Specifications and plans MUST show how readability, reuse, and UX are satisfied: traceability
from requirements to modules, identification of shared building blocks, and acceptance
scenarios that a reviewer can execute without private context. Refactors introduced for reuse
MUST include a verification note (automated test, contract check, or documented manual path)
before merge.

## Review & Delivery

Work produced via `/speckit-plan` and `/speckit-tasks` MUST remain traceable to this
constitution. Pull requests MUST summarize user-visible behavior, list shared modules
touched or created, and flag any intentional readability trade-offs. Novel or non-idiomatic
patterns MUST cite a short design note or spec section in the PR description.

## Governance

This constitution supersedes informal style preferences for FAC-App. Amendments are made
only by editing `.specify/memory/constitution.md`, bumping **CONSTITUTION_VERSION** in the
footer, and setting **LAST_AMENDED_DATE** to the date of adoption. **MAJOR**: removal or
incompatible redefinition of a principle. **MINOR**: new principle or materially expanded
obligation. **PATCH**: clarifications, typos, or non-semantic wording. Reviewers MUST verify
that changes touching shared code or user-visible surfaces remain consistent with Core
Principles before approving merge.

**Version**: 1.0.0 | **Ratified**: 2026-05-13 | **Last Amended**: 2026-05-13
