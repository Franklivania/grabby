# AGENTS.md

## Purpose

This file defines mandatory operating rules for agents working in this repository.
All agents must read and apply this guidance before taking any action.

## Scope

These rules apply to every change type:

- feature implementation
- refactors
- script/config updates
- Turborepo/workspace changes
- styling and SCSS updates
- UI/icon integration updates

## Mandatory Fallback-Docs Workflow (Strict)

Before every code or configuration change:

1. Identify which fallback docs are relevant to the action.
2. Re-check the relevant sections in those docs.
3. Apply the change according to the documented patterns.
4. Update all affected places as necessary to keep the repo consistent.

If multiple docs apply, use this rule:

- apply all compatible requirements;
- if guidance conflicts, prefer the more specific tool/domain guidance for the touched files, and keep behavior consistent across related files.

## Canonical Fallback References

- Turborepo: [https://turborepo.dev/docs](https://turborepo.dev/docs)
- Sass guide: [https://sass-lang.com/guide/](https://sass-lang.com/guide/)
- Sass docs: [https://sass-lang.com/documentation/](https://sass-lang.com/documentation/)
- Iconify loader snippet (verbatim): `<script src="https://code.iconify.design/iconify-icon/3.0.0/iconify-icon.min.js"></script>`

## Action Checklists

### Pre-Action Checklist

- Confirm the task scope and impacted files.
- Read the relevant fallback docs before editing.
- Confirm intended conventions for Turborepo, Sass, and Iconify usage where applicable.

### During-Action Checklist

- Keep implementation aligned with fallback docs.
- Avoid one-off patterns that diverge from repo conventions.
- Update related files/locations when a change affects shared behavior.

### Post-Action Checklist

- Verify all touched areas are updated as necessary.
- Run project checks relevant to the change (typecheck, lint, test, build when needed).
- Confirm no doc-driven requirement was skipped.

## Repo-Specific Alignment Notes

### Turborepo

- Keep workspace scripts and package behavior consistent across root and package-level `package.json`.
- Prefer clear task orchestration patterns and avoid brittle shell-specific behavior.

### Sass

- Keep Sass usage structured and reusable.
- Prefer tokens, mixins, and shared partials over duplicated inline style logic.

### Iconify

- Use the canonical loader snippet when iconify web component usage is required.
- Keep icon usage consistent in static frontend flows and avoid mixed icon systems without justification.

## Acceptance Rule

A change is not complete unless:

- fallback docs were consulted before action,
- all necessary places were updated,
- and resulting code/config remains consistent with this repository's standards.
