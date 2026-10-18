# BoundaryForge

**Break it. Patch it. Prove it.**

Hackathon work in progress: a security-testing workbench for one synthetic document-reading tool.

## Verified delivery status

- The existing 17 local validation/classification tests pass. See `evidence/local-tests.txt`.
- The local dashboard serves HTTP 200 at http://127.0.0.1:4317/.
- A recorded CreateOS execution from **2026-10-17 21:06:56 UTC (17:06:56 Bolivia)** contains two successful functional tests and a witness confirming a synthetic canary leak. See `evidence/recorded-createos-baseline.json`. This is historical evidence from the earlier workspace, not a fresh execution in this delivery session or independent attestation.
- The latest remote attempt failed with **401 auth: invalid api key**. See `evidence/current-baseline-attempt.json`.
- Gemini inference failed with **401 UNAUTHENTICATED / ACCESS_TOKEN_TYPE_UNSUPPORTED**. See `evidence/current-preflight.json`.
- Stripe Projects returned **BROWSER_AUTH_REQUIRED**. No project provisioning, credential sync, or runtime integration has been verified.
- **No generated attack, AI patch, rerun, or Proof of Fix has been verified. `src/agent.mjs` is absent.** The autonomous repair workflow remains incomplete. The delivery deliberately preserves that limitation.

## Run the real dashboard

Requires Node.js 24+ and npm.

```powershell
npm ci
npm test
npm start
```

Open http://127.0.0.1:4317/. The dashboard and historical baseline download work without provider credentials. Choose **Execution log** to inspect the recorded CreateOS commands, exit codes and witness output. **Download recorded baseline** exports the historical evidence ZIP. It is never labeled a Proof of Fix.

If port 4317 is already occupied, use the existing running dashboard. Close that server before starting another instance.

## Check providers and run the fixture

```powershell
Copy-Item .env.example .env.local
# Edit .env.local privately with valid provider credentials.
npm run preflight
npm run baseline
```

Set `GEMINI_API_KEY`, `GEMINI_MODEL`, `CREATEOS_SANDBOX_ID` and, if needed, `CREATEOS_SANDBOX_API_KEY`. Without a sandbox API key the backend uses the existing official CLI OAuth session in `~/.createos/.oauth`. Refresh an expired session with the official `createos login` flow. Never paste keys into chat or commit them. Preflight and baseline return a nonzero exit code on failure.

The baseline is maintainer-authored. It runs only in the existing CreateOS sandbox and does not call Gemini. Each new baseline attempt is saved separately; a failed attempt cannot erase the previous successful baseline. Downloading old evidence never executes a new test.

## Existing architecture

Node HTTP backend; official Google GenAI and CreateOS SDKs; TypeScript syntax/schema validation; restricted sandbox runner; independent canary witness; regression fixtures; evidence writer; buildless HTML/CSS/JS dashboard.

The source fixture intentionally allows `../private/CANARY.txt`. The canary is synthetic and contains no real secret. The sandbox runner requires disabled public ingress, loopback-only egress, an isolated network namespace, non-root execution, bounded process time/output and Node filesystem permissions.

`src/validation.mjs` validates proposed model actions and classifies execution evidence. `src/runner.mjs` executes the fixture remotely. `src/evidence.mjs` can package audit records. The missing autonomous agent module has not been replaced with mocked model output.

## Publication and submission

This release excludes `.env.local`, OAuth credentials, `node_modules`, `.projects` private state/cache/vault, and private `runs/`. Only explicitly reviewed evidence is included. See `docs/DELIVERY.md` for GitHub commands and the submission checklist, and `docs/emergency-demo.md` for an honest 90-second demonstration.

Official submission: https://projects.dev/leaderboard -> **Submit Your Project**. Actual Stripe Projects integration is a mandatory unresolved dependency. No submission or public repository has been created by this release.

## Scope and limits

This demonstrates one synthetic filesystem boundary. Historical reproduction of a vulnerability is not proof of repair or broad application security. Local evidence hashes detect changes relative to the included manifest; they are not signatures or third-party attestation. Keep this development server bound to loopback and never expose the intentionally vulnerable fixture publicly.

## References

- https://createos.sh/hackathon
- https://docs.stripe.com/projects
- https://projects.dev/hackathon-participants
- https://github.com/NodeOps-app/createos-sandbox-sdk
- https://github.com/NodeOps-app/createos-cli
