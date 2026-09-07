# Evidence contract

Applies to each task, with proportional scope. Evidence must identify the tested candidate, not just “latest.” ASTRA reviews assertions and artifacts; agent confidence is not evidence.

## Required record

```text
Task ID / risk / scope:
Claim:
  What changed; which acceptance criteria this record proves.
Identity:
  Application base/candidate Git SHA; dirty diff hash if uncommitted;
  UTC start/end; executor; Node/tool versions; named environment/workspace alias.
Code evidence:
  Files changed; diff summary; reviewed diff/artifact reference.
Deterministic checks:
  Lint; typecheck; unit/integration; relevant contracts; financial invariant IDs.
  For EACH: exact command and cwd, expected/actual, exit code, artifact location.
  Mark not applicable with reason; explicitly record required checks not run.
Build evidence:
  Relevant frontend/backend/shared or container build result and artifact identity.
Delivery evidence (if deployed):
  Application Git SHA; each image tag + publication digest + runtime imageID;
  GitOps commit; Argo revision/sync/health;
  each Deployment revision, generation/observedGeneration;
  desired/updated/ready/available replicas; pod readiness/restarts and time window.
Runtime evidence:
  Sanitized API method/path/status/response assertions; authentication context;
  resulting persisted-state read; relevant logs; health/probe source and limitations.
Business evidence (finance tasks):
  Controlled before state; bounded action; after state;
  independently specified expected deltas; actual invariant comparison;
  record IDs/idempotency correlation aliases; cleanup/retention result.
Limitations / blockers / inapplicable criteria:
Artifact references + hashes:
Result: PASS | PARTIAL | FAIL | BLOCKED
```

The final Result is exactly one value. PASS = all applicable required criteria met. PARTIAL = useful evidence but required coverage incomplete without a definitive failure. FAIL = a required assertion/check failed. BLOCKED = missing required access/environment/decision prevents completion. If a failure and blocker coexist, use FAIL and list the blocker. No required skipped test is PASS. ASTRA ACCEPT/REWORK/ESCALATE is recorded separately from this result.

## Proof boundaries

- Test success proves only executed cases and actual dependencies. Mark mocked persistence explicitly.
- Argo healthy proves reconciliation/health assessment, not monetary correctness.
- HTTP 200 proves only the asserted endpoint behavior; a login page 200 is not login success.
- Fresh API reads show externally visible resulting state; direct database evidence is additionally required when claiming atomic rollback, index enforcement or storage durability.
- A retry needs the same idempotency key/payload and a post-read proving no second effect. An HTTP response alone is insufficient.
- A scoped PASS does not become full release PASS. Record required missing layers for the release separately.
- Pair proof to SHA/digest, workspace and time. Reject mixed/stale revisions. Any source change affecting the proof invalidates relevant earlier checks.

## Deterministic and business oracle

Expected amounts must come from documented rules/controlled fixtures, not a call to the same calculation being tested. For finance, use exact integer VND assertions and boundary/negative cases. Test expected values cannot be weakened just to make implementation pass. Model review may explain failures, never override a violated invariant.

## Artifacts and sensitive data

Emit one structured result plus referenced command output/HTTP assertion extracts; format can be JSON plus Markdown without a new evidence service. Future scripts must exit nonzero for FAIL/BLOCKED and for PARTIAL when used as a required gate. Record collection/redaction failures; never silently omit them. Local prototypes use a task-selected directory outside Git; later CI uses restricted artifacts with retention/access recorded by the operator.

Never store passwords, bearer/session/preview tokens, Mongo URIs, raw cookies or production financial records in evidence/Git. Use approved fixture amounts, opaque aliases and allowlisted log fields. Store credential references, not values. Absence of raw secrets is a design requirement, not a claim about already configured CI.

## Acceptance matrix

| Scope | Minimum applicable proof |
| --- | --- |
| R0 docs | Correct diff, internal links/references, current vs target distinction; builds/runtime inapplicable |
| R1 isolated UI/test | Relevant local checks and UI/behavior evidence; financial test edits inherit R3 |
| R2 API/runtime | Contracts/negative paths, relevant lint/typecheck/tests/build; M1/M2 if claiming deployed behavior |
| R3 finance/security/DB | Selected invariants + isolation + applicable real DB evidence; M2 for deployed financial claims |
| R4 operation | Explicit authorized procedure, preconditions/recovery evidence, scoped execution result; human decision |
