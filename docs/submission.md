# Hackathon submission draft

Project: **BoundaryForge**

Tagline: **Break it. Patch it. Prove it.**

Team name: BoundaryForge

Participant name: [participant to supply]

Discord handle: [participant to supply]

GitHub URL: [not published]

Demo video URL: [not recorded/uploaded]

Public post URL: [not published]

Live demo URL: [not deployed; local dashboard only]

Stripe Projects share URL: [blocked pending verified Projects integration]

Hackathon code: [copy the exact case-sensitive code supplied by the organizers]

## Short description

BoundaryForge is an AI agent security-testing and repair workbench. Gemini generates an executable adversarial test against a synthetic document-reading tool. CreateOS runs the test, an independent witness confirms the canary leak, and Gemini proposes a restricted source correction. The same immutable test and a separate regression suite determine whether the fix works. A downloadable evidence bundle records the diff, outputs, timestamps, and integrity hashes.

## Technical description

Node.js 24 trusted backend; official Google GenAI and CreateOS SDKs; structured JSON actions with schema and syntax validation; Linux privilege and network isolation; immutable test files; independent witness and regression suite; Server-Sent Events; local evidence ZIP generation. Stripe Projects is intended to manage the CreateOS service configuration. Claim it as integrated only after actual provisioning/linking, credential sync, and runtime use are verified.

## Public post draft — use only after a verified run

I built BoundaryForge for the CreateOS × Stripe Projects hackathon.

Break it. Patch it. Prove it.

Gemini writes an adversarial test. CreateOS executes it. A synthetic canary leak is reproduced. Gemini generates a patch. The exact same test is rerun, its hash unchanged, while legitimate document access must still pass.

The output: a source diff and a downloadable Proof of Fix, with executable evidence instead of a blanket “secure” label.

Demo: [video URL]
Code: [GitHub URL]

[Add the exact CreateOS tag required in the organizer's Discord instructions. Do not guess the handle.]

## Submission checklist

- Verify the organizer's current instructions in Discord, including any 20:30 Bolivia cutoff communicated there.
- The public event page lists demos at 18:00 Pacific / 21:00 Bolivia. Use the user's earlier 20:30 deadline as the working cutoff.
- The participant guide directs submissions to https://projects.dev/leaderboard and asks for a Projects share link, public repository, deployed URL, Stripe account ID, and event code if supplied.
- Keep the private local execution console off the public internet. A public demo would need a separate safe presentation surface or a hardened authenticated deployment.
- Confirm actual Stripe Projects integration before claiming eligibility.
- Review the public repository for secrets and private execution metadata.
- Record and upload the 2–3 minute video with the actual participant on camera.
- Publish the reviewed post and collect its URL.
- Fill the official form with real URLs and participant details.
- Save confirmation only after the site actually confirms submission.

No external post, repository publication, video upload, or submission has been completed by this draft.
