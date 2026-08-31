# Preserved narration pilot

This directory binds the SpokenHistory preserved-audio design to the single AlgoNow pilot page at `/kalman-covariance-correction/`. The two pilot tracks have been generated locally under the owner's fleet budget. This does not authorize a catalog rollout, publication, or deployment.

## What AlgoNow used before this pilot

The existing Listen feature uses the browser Web Speech API through `src/lib/tts.js`. The visitor's browser and operating system choose and synthesize the voice locally. There is no audio provider request, API key, preserved MP3, or per-listen provider cost. That browser engine is the robotic playback the preserved-audio pilot is intended to replace on the test page.

## Audited source contract

The implementation was mapped from this exact working-tree snapshot:

- Source: `D:\spokenhistory.org\infra\narration\CROSS_REPOSITORY_IMPLEMENTATION_SPEC.md`
- SHA-256: `003d9768756c951518b3e6be8b49bb1ade1c5fa562d2e8a6fc8ed0d4a38fe676`
- Audited: `2026-08-30 20:58:27 ET`

The live James Bevel proof of concept predates that snapshot and has older rate behavior. For AlgoNow, the audited snapshot is the architectural reference and the owner's later rate instruction is the product override.

## Repository binding worksheet

| Concern | AlgoNow pilot binding | Decision |
|---|---|---|
| Stable content ID | `puzzle:kalman-covariance-correction` | Only this puzzle is eligible in the pilot. |
| Test route | `/kalman-covariance-correction/` | No other route receives preserved audio yet. |
| Canonical spoken source | `src/content/kalman-covariance-correction.narration.js` | Consume the authored `narration` array, never rendered HTML. |
| Adapter | `src/lib/puzzleNarration.js` | Add the AI disclosure, preserve authored order, normalize deterministically, and record include and exclude provenance. |
| Executable source | `solutions/kalman_covariance_correction.py`, exposed to the page as `content.code` | Excluded completely. The authored prose in the narration array's `code` section remains included because it describes the proof without carrying executable source. |
| Review output | `build/narration/review/kalman-covariance-correction-plan.json` | Exact text and request text, ignored by Git through the existing `build/` rule. |
| Local generation output | `build/narration/releases/<slug>/<release-prefix>/` | Validated parts, final MP3s, narration text, and a local manifest. No generated audio is tracked by this change. |
| Billing project | `aigamma` | The project is part of the reviewed approval artifact. Execution and reconciliation reject every other project before credential access. |
| Provider voices | Aoede and Algieba | `en-US-Chirp3-HD-Aoede` is the default female voice. `en-US-Chirp3-HD-Algieba` is the alternate male voice. Both receive identical text. |
| Synthesis rate | Provider-natural `1` | Pitch remains the provider default. Playback speed does not create extra audio objects. |
| Fresh-reader playback | Aoede at `1.25x` | Switching to Algieba also uses `1.25x` unless the reader explicitly changes speed. |
| Rate controls | `1.00x`, `1.25x`, `1.50x`, `1.75x` | These are the only pilot values, with two-decimal labels. |
| Public manifest | Generated local entry has the exact `source_characters`, `default_voice: "aoede"`, `default_rate: 1.25`, and the four rate options | Installation into page data waits for validated audio and a separately reviewed publication path. |
| Public media origin | `infra/media-cdn/template.yaml`, not yet deployed or bound to public identifiers | Publication requires the exact deployed stack, Region, private bucket, CloudFront distribution ID, and CloudFront domain as explicit operator arguments. Do not expose the private bucket, account ID, local path, or credential in a public manifest. |
| Page-view provider access | None | The browser must request only preserved public MP3 files, and only after the reader opens the player. |
| Section chips | Disabled for the preserved pilot | Whole-track generation has no exact section offsets. Do not estimate offsets from character ratios and do not claim that playback was positioned at a section. |

## Canonical adapter boundary

The adapter allowlists only `{ section, text }` entries from the canonical authored narration array. It adds this disclosure as the first segment:

> This is an AI-generated narration of the authored lesson on this page. The executable source code is intentionally omitted.

The adapter never reads `content.code`, the Python solution source, rendered editor payloads, inline literal tokens, copy controls, language badges, line numbers, output consoles, syntax labels, navigation, or player controls. Tests place a recognizable sentinel inside a Python fixture and prove that the prose before and after it remains present and ordered while the sentinel stays absent.

Before planning, the artifact gate rejects raw numerals, URLs, arrows, repository paths, code fences, code tags, executable-source forms, interface chrome, timestamps, machine tokens with underscores, and the test sentinel. An unknown narration section fails closed rather than being inferred as prose.

## Credential-free plan

Run:

```powershell
node scripts/narration/generate-kalman-narration.mjs
```

This command performs no authentication and makes no network request. It writes the complete review artifact under ignored `build/narration/review/` and prints its deterministic summary.

Pinned pilot result for the current authored narration and recipe:

| Field | Exact value |
|---|---:|
| UTF-8 bytes per voice | 9,773 |
| Unicode characters per voice | 9,741 |
| Voices | 2 |
| Provider requests per voice | 2 |
| Provider requests total | 4 |
| Billable characters total | 19,482 |
| Checked-in conservative price | $30 per million characters |
| Exact conservative plan | $0.584460 |
| Source SHA-256 | `537f81bd6e0e7948971f6095f3177210122d396fac7e77238e908f91a71b40f4` |
| Recipe SHA-256 | `251cfe29107da7c189a431aff1f9f436b511686ca37508ab09c8df62bcc412f3` |
| Release SHA-256 | `3e987b927c5f7958cb3fa559dd758895dcced16bdf14e7a2a699cadef47fa7ad` |
| Review approval SHA-256 | `68825c26abf5d55bc02dcfeb100250d4488516a9a80a88b634879403065a85b4` |

The price is a versioned planning constant from the audited contract. It ignores allowances, discounts, and credits so it acts as a conservative local ceiling. Confirm current official pricing before any paid execution. A checked-in estimate is not an invoice and does not grant spending authority.

## Paid generation result and guard

The approved pilot command completed on 2026-08-31. It used all four planned first submissions, no retries, and the exact conservative total `$0.584460`. The release is `local-complete` with no pending or unresolved attempts. Aoede is 2,585,132 bytes and 646.22 seconds at provider-natural speed. Algieba is 2,762,060 bytes and 690.46 seconds. Both final MP3s and all request parts passed the validation and assembly gates.

The completed command required all four operator inputs in the same invocation:

```powershell
node scripts/narration/generate-kalman-narration.mjs `
  --execute `
  --project aigamma `
  --max-usd 0.600000 `
  --approved-plan-sha256 68825c26abf5d55bc02dcfeb100250d4488516a9a80a88b634879403065a85b4
```

Do not repeat that command or generate a changed release without fresh, explicit owner approval in the current session. The current release is already complete, so a repeat correctly performs no synthesis. If the narration or recipe changes, rerun and review the plan, then use its new approval hash and exact pending ceiling.

The execution path applies these gates before requesting an Application Default Credentials token:

1. Rebuild the deterministic source, recipe, requests, and review artifact.
2. Require the exact reviewed plan hash.
3. Acquire one exclusive repository generation lock.
4. Require the exact reviewed billing project `aigamma`.
5. Load and validate the durable attempt journal for this release.
6. Refuse unresolved outcomes and include every earlier submission in the cumulative ceiling.
7. Recompute the pending parts and reserve enough ceiling for every remaining reviewed request.
8. Require ffmpeg for complete MP3 decode, audible-signal, duration, and multipart assembly checks.
9. Obtain a fresh short-lived user ADC token in memory for each provider attempt. No service-account key belongs in this workflow.

Provider requests start no faster than once per second. Immediately before each possible provider submission, the pipeline atomically appends an entry to `build/narration/releases/<slug>/<release-prefix>/attempt-journal.json`. An entry contains only the attempt identity, track and request hashes, characters, microdollar accounting, reviewed ceiling, timestamps, and status. It contains no narration text, token, authorization header, credential, or error body.

Every journaled submission counts against `--max-usd` across retries and later runs, whether or not the provider ultimately bills it. The journal also reserves the minimum cost of the other unpersisted reviewed requests. With a `0.600000` ceiling, the four first submissions fit at `0.584460`, but no retry can consume the space needed by the remaining reviewed requests. A higher ceiling requires a new explicit operator command. HTTP 429 and server errors can receive at most four attempts only when cumulative authorized room remains.

A timeout or network failure is marked `ambiguous`. A successful response that cannot be validated and atomically persisted is marked `response-received-unpersisted`. A process interruption leaves `submitted` or `response-received`. All four states block every later provider submission by default. The journal is never silently cleared and a reconciliation never refunds its submitted characters.

After checking the exact attempt against provider activity, record whether it was billed and authorize only that request for resubmission:

```powershell
node scripts/narration/generate-kalman-narration.mjs `
  --project aigamma `
  --approved-plan-sha256 68825c26abf5d55bc02dcfeb100250d4488516a9a80a88b634879403065a85b4 `
  --reconcile-attempt <exact-64-character-attempt-id> `
  --reconcile-provider-billed <yes-or-no> `
  --authorize-exact-resubmission
```

Reconciliation performs no authentication or provider request. It atomically binds the next action to the unresolved track and request hash. A different track or request remains blocked. The later paid command must still have enough cumulative ceiling for both the recorded attempt and every remaining reviewed request.

Validated parts are written atomically and reused by source, recipe, request, and audio hashes. Multipart tracks use ffmpeg concat with codec copy, not a lossy re-encode.

The generated whole-track MP3s do not contain reviewed section cue offsets. The pilot therefore leaves `section_starts` absent and keeps the existing per-section narration chips disabled. Adding guessed offsets from text length would shift the disclosure and every later section differently for each voice. Exact section seeking requires measured provider timepoints or separately decoded segment boundaries in a later reviewed recipe.

## Publication boundary

This foundation does not upload, publish, install a public manifest, deploy, or alter production. Before those steps, bind and attest the exact public media origin, use immutable content-addressed object keys, reject overwrites, strip every `local_file`, scan the public manifest recursively for private values, verify full MP3 hashes and byte-range behavior, and complete the test-page browser acceptance pass. Only then should the pilot be considered for a site-wide rollout.

## Publication, installation, and verification tooling

The tooling is inert by default and no publication was performed while it was added. The publication dry run becomes available only after both validated local MP3s and `manifest-entry.json` exist:

```powershell
node scripts/narration/publish-kalman-narration.mjs
```

Before an execute run, deploy `infra/media-cdn/template.yaml` with termination protection, record its exact outputs, and use a least-privilege short-lived AWS role or federated session. The publisher rejects AWS root credentials and direct IAM-user credentials. It discovers the installed AWS CLI from `AWS_PATH`, `C:\Program Files\Amazon\AWSCLIV2\aws.exe`, or the command path, in that order. An optional explicit `--aws-path` has highest priority.

An execute run requires every target value and the tracked receipt path in the same command:

```powershell
node scripts/narration/publish-kalman-narration.mjs `
  --execute `
  --stack <exact-stack-name> `
  --region <exact-aws-region> `
  --bucket <exact-private-bucket-output> `
  --distribution-id <exact-cloudfront-id> `
  --distribution-domain <exact-cloudfront-domain> `
  --receipt infra/narration/publication-receipt.json
```

Before the first object write, that command verifies the caller session, stack status and termination protection, production domain and environment parameters, stack resources and outputs, bucket ownership and Region, all Block Public Access settings, versioning, AES256 encryption, enforced bucket ownership, exact bucket policy, Origin Access Control signing, the one-origin CloudFront topology, allowed methods, cache policy, CORS response policy, and anonymous direct-origin denial.

Each MP3 is created with `If-None-Match: *`, `audio/mpeg`, `public,max-age=31536000,immutable`, its exact SHA-256 checksum, and the expected bucket owner. A preexisting key is accepted only after exact metadata, checksum, full byte count, and full body SHA-256 verification. The receipt is written only after both tracks are uploaded or verified existing.

The tracked receipt includes public stack and CloudFront identifiers, source, recipe, release, object, and audio hashes, but never stores the private bucket or AWS account ID. `private_origin_binding_sha256` binds the exact private bucket together with the stack, Region, distribution ID, and distribution domain. The installer and verifier require the private bucket again as an operator argument and recompute that binding.

After reviewing the receipt, dry-run the atomic manifest installation with the exact same target values:

```powershell
node scripts/narration/install-kalman-narration.mjs `
  --stack <exact-stack-name> `
  --region <exact-aws-region> `
  --bucket <exact-private-bucket-output> `
  --distribution-id <exact-cloudfront-id> `
  --distribution-domain <exact-cloudfront-domain> `
  --receipt infra/narration/publication-receipt.json
```

Add `--execute` only after the dry run is correct. The installer validates the complete receipt and release before its first mutation, recursively removes `local_file`, rejects every unapproved field or private value, and writes the one public manifest atomically. A repeated run validates the already-installed current manifest and makes no change.

Offline verification uses the same target and receipt arguments with `scripts/narration/verify-kalman-narration.mjs`. Live verification adds the one receipt-bound base URL:

```powershell
node scripts/narration/verify-kalman-narration.mjs `
  --base-url https://<exact-cloudfront-domain> `
  --stack <exact-stack-name> `
  --region <exact-aws-region> `
  --bucket <exact-private-bucket-output> `
  --distribution-id <exact-cloudfront-id> `
  --distribution-domain <exact-cloudfront-domain> `
  --receipt infra/narration/publication-receipt.json
```

The verifier recomputes the current narration source, recipe, release, request, segment, track, and exact immutable object identities. In live mode it requires CDN `HEAD 200`, exact content type, cache control and byte count, byte-range `206`, the complete downloaded SHA-256, the reviewed CORS header, and `403` for anonymous requests to each exact direct-origin object URL.

## Verification

Focused tests:

```powershell
node --test tests/narration-adapter.test.mjs tests/narration-plan.test.mjs
```

The focused suite covers adapter order and provenance, raw-code exclusion, normalization, the artifact gate, pinned source and release identities, exact cost, request byte limits and lossless reconstruction, long-sentence fragmentation, defaults and labels, dry classification, billing-project rejection, exclusive locking, cumulative attempt ceilings, exact reconciliation, unattended-rerun refusal, ambiguous and unpersisted response handling, and MP3 validation thresholds.

Publication tests remain fully offline and use mocked AWS and CDN responses:

```powershell
node --test tests/narration-release.test.mjs
```

They cover the exact public schema and privacy scan, receipt binding and inventory hashes, root and IAM-user refusal, complete target attestation, conditional creation, full existing-object verification, no-write behavior after failed attestation, receipt-gated idempotent installation, exact CDN origin binding, immutable headers, ranges, full hashes, CORS, and direct-origin denial.
