# BoundaryForge demo — approximately 2 minutes 30 seconds

**Recording rule:** one actual participant appears on camera. Record the live workflow or replay a clearly identified completed real run. Never substitute staged success screens. Only use the success lines below when the current report says `verified`.

## 0:00–0:20 — Participant on camera

“Hi, I'm [your name], building BoundaryForge from Bolivia. AI agents can call tools, but tool boundaries can be wrong. A document assistant should read its public help files. It should never read a private file just because a user supplied a clever path.”

## 0:20–0:40 — Show the target and click Harden

“BoundaryForge turns that risk into an executable repair workflow: break it, patch it, prove it. This ServiceDesk Agent is intentionally vulnerable, and every document is synthetic. I click Harden This Agent. Gemini inspects the source and writes a real regression test.”

## 0:40–1:05 — Show generated test and remote output

“Here is the generated TypeScript. It asserts that unauthorized access must be denied. CreateOS runs it in an isolated micro-VM. The test fails, and a separate witness confirms that the protected synthetic canary was actually read. A syntax error would not count as a vulnerability.”

## 1:05–1:30 — Show the source diff

“Gemini now generates a source correction. It can change only the document-reading tool. It cannot change the security test, the verifier, or the credentials. This is the actual diff applied to the sandbox. The repair must enforce the public root and account for traversal, absolute paths, and symlink escapes.”

## 1:30–1:55 — Show verification and integrity

“We rerun the exact same test. Its SHA-256 is unchanged. The attack is blocked, and the independent regression suite confirms that legitimate public documents still work. Disabling the tool would fail these checks. If a patch fails, the agent gets at most one correction attempt.”

## 1:55–2:15 — Download proof and integrations

“The downloadable Proof of Fix contains the generated test, actual commands and outputs, before and after results, source diff, and integrity hashes. Inference stays in the trusted backend; generated code runs only in CreateOS, without credentials or outbound network access.”

**Only if verified:** “Stripe Projects manages the actual CreateOS service configuration used by this backend.”

**If still blocked:** “The CreateOS workflow is real. Stripe Projects onboarding is still blocked, and the project explicitly reports that dependency as incomplete.”

## 2:15–2:30 — Participant on camera

“BoundaryForge doesn't say your whole application is secure. It proves a specific vulnerability was reproduced and corrected under recorded conditions. The result is a reviewable patch with executable evidence. Break it. Patch it. Prove it.”

## Recording checklist

- Run the full audit successfully before recording success claims.
- Show the current report/run ID and test hash.
- Keep passwords, `.env.local`, account pages, and keys off camera.
- Verify the downloaded ZIP opens and matches the shown run.
- Record at 1080p with readable zoom, no sped-up fabricated transitions.
- Export under three minutes and check playback/audio before uploading.
