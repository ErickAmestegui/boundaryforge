# Stripe Projects integration runbook

## Intended meaningful integration

Use Stripe Projects to associate/provision the CreateOS project and sync its actual credentials to the trusted backend. The official event explicitly demonstrates `stripe projects add createos/project`. Reuse the existing CreateOS account and sandbox wherever supported. Do not create extra paid capacity or expose the vulnerable fixture.

## Observed local state

Stripe CLI 1.54.0 and Projects plugin 0.50.0 are installed. `stripe projects init boundaryforge --mode manual --preflight --json --non-interactive --skip-skills` returned `BROWSER_AUTH_REQUIRED` and reported that the current session has no authorized live-mode account. The earlier `PROJECTS_CONTEXT_MISMATCH` is user-reported history; it was not the current preflight response.

The documented remedy is the Projects-specific onboarding flow, not repeated `stripe login` calls:

1. Open https://dashboard.stripe.com/projects/new and create or choose a Projects account.
2. Run `stripe projects init boundaryforge --mode manual --json --non-interactive --skip-skills --yes`.
3. Approve the returned browser URL/code personally. Do not put a password or API key in chat.
4. Rerun the same init command only after approval. If the device code expired, request one new handoff.
5. Inspect `stripe projects catalog createos --json` and confirm the actual selected plan is free.
6. Add/link the documented CreateOS service using the existing account. Stop for any new legal agreement, payment method, paid tier, or unexpected permission.
7. Run `stripe projects status --json` and `stripe projects env --pull` without printing secret values.
8. Connect the backend to the actual synced credential variable after inspecting its name. Never guess the provider's variable naming.
9. Execute a real sandbox command using that Projects-managed configuration and save redacted integration evidence.

No `.projects/state.json` is fabricated. Only successful CLI initialization should produce real project state.

## Discord support draft

> I am a solo participant in Bolivia building BoundaryForge for the CreateOS × Stripe Projects hackathon. Stripe CLI 1.54.0 / Projects 0.50.0 is installed. Projects preflight reports `BROWSER_AUTH_REQUIRED`: no Stripe session with a live-mode account is signed in. My previous attempt also reported `PROJECTS_CONTEXT_MISMATCH` with test-mode authorization. I am following `https://dashboard.stripe.com/projects/new`, without activating Payments or entering US business information. What is the supported Projects-only onboarding route for an international participant, and how can I link my existing CreateOS free account? I can provide redacted CLI output privately.

This draft has not been sent.

## Eligibility

An autonomous repair in CreateOS does not by itself satisfy the required Stripe Projects integration. Keep this dependency marked blocked until the actual provision/link, credential sync, and runtime use are verified.
