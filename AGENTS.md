## Scope

- Do **only** what I explicitly ask. No extra refactors, cleanups, drive-by fixes, or “while I’m here” changes.
- If something is ambiguous, ask a single clarifying question. Otherwise, proceed.

## Communication Style

- Be concise.
- Sacrifice grammar for concision.
- Prefer bullets over paragraphs.
- No motivational fluff.

## Output Rules

- When proposing commands, give the exact command(s) only.
- When editing files, state:
  - which files changed
  - what changed (1–3 bullets)
- Avoid large rewrites unless requested.

## Safety Checks

- If a change could break runtime behavior or public API, warn me before doing it.
- Don’t make irreversible changes (migrations, lockfile regen, formatting sweep) unless asked.

## Plan Mode

- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.

## Project settings

- we are using bun
