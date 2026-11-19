# Public-deadline calendar implementation plan

> For agentic workers: use subagent-driven development for the independent model, source checking and final review.

**Goal:** Give residents useful advance calendar reminders and direct preparation links for checked public-comment opportunities.

**Architecture:** A reviewed JSON register feeds a pure calendar model, a buildless dashboard view and a generated public iCalendar subscription file. Calendar providers deliver notifications after residents opt in. Stable proceeding/event identifiers and revision numbers support extensions; one-time imports remain snapshots.

**Tech stack:** Existing HTML/CSS/JavaScript, Node tests and GitHub Pages.

**Spec:** The user's request in this chat: iCalendar and Google Calendar support, extended/hearing deadlines, advance action steps, toolkit and comment/letter wizard links, mobile design and GitHub publication.

## Global constraints

- Preserve the modern-art identity and current GitHub Pages branch.
- Include only traceable official dates; unknown times stay date-only.
- A passed deadline does not establish permit issuance.
- No automatic invitations, email collection or claim of dashboard notification delivery.
- Preserve existing drafts when linking to a new proceeding.
- Keep downloads, subscriptions and Google event copies distinct.

## Review focus

- Extensions, cancellation and stable UIDs must not create a second live deadline.
- DST, uncertain cutoffs and weekend rules must not become invented clock times.
- Only future alarm triggers belong in exports.
- Source failure must not resurrect old opportunities.
- Calendar context must not apply Jasper recipients or findings to another project.

## Tasks

1. Verify official notices and write `site/deadline-events.json`, retaining source-check dates, phases, revisions and uncertainty.
2. Implement and test `site/deadline-calendar-model.js`: eligibility, iCalendar, Google links, preparation steps and revision handling.
3. Build responsive `site/deadline-calendar.js` / `.css`; connect the Act wizard, My watch and existing public notices.
4. Add `scripts/build-deadline-calendar.cjs` and generate the public feed; add DOM and data-integrity tests.
5. Review, validate mirrors and relevant regressions, commit/push, verify deployment and phone behavior, and deliver the review link.
