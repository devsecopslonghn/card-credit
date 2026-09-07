# Delivery map

Source: assessment sections 8–13. Current facts are distinct from planned gates.

## Current flow

```text
Git push master/main → GitHub Actions quality
→ frontend/backend SHA-tagged images → GHCR
→ external GitOps values commit → Argo CD
→ index Sync hook → Kubernetes → Pods Ready
```

Current missing segment:

```text
Kubernetes Ready → ??? authenticated action + persisted-state invariant checks
→ financial feature verified
```

**Argo Synced + Pods Ready != financial delivery verified.**

## Current CI checks

Install shared/frontend/backend; shared tests; frontend typecheck/critical tests/build; backend typecheck/lint/critical tests/build. PRs validate without publishing images. Shared typecheck and frontend lint are absent from CI; browser E2E and real-Mongo tests are absent. Package defaults are curated suites, not every existing test. Node 22 is the target.

`.github/workflows/ci.yml` owns validation/publication and values update; external `../k8s-namepsace-chart/card-credit` owns Helm. The updater checks out a configured branch but pushes master. External cleanup implementation, branch protections and token scopes remain unknown. Preserve ownership; do not use `kubectl apply` to bypass GitOps.

## Health and version

Backend `/health`: process response. `/ready`: lifecycle state set on initial connection; no continuous DB round-trip. Frontend probe: `/login`. Public `/ready` returned 404 due to ingress routing. M1 reports these limitations; exposing a public endpoint is not a prerequisite or an authorized change.

Observe expected application SHA for both images; expected registry digest from publication where available; actual pod imageID; GitOps commit and Argo revision; Deployment revision annotation, generation/observedGeneration, updated/desired/ready/available replicas. Application SHA, GitOps SHA and Deployment revision are different identifiers. Match them through the image values; never compare them as equal hashes.

## Target gates

1. Local gate: scoped deterministic tests/contracts/build, reviewed before publication.
2. Candidate delivery: separately authorized branch/image/GitOps target. No established sandbox pipeline exists today. Current mainline pushes can mutate the current namespace and cannot serve as a presumed safe candidate stage.
3. M1: bounded read-only verifier binds Argo/workloads/images/probes/log window to the expected revision. Reject stale or mixed revisions, zero desired replicas, incomplete rollout or unhealthy state. Concurrent newer deployment invalidates this candidate's evidence; stop and report, do not roll it back.
4. M2: approved nonproduction identity/workspace executes one bounded flow and asserts fresh resulting state with a deterministic oracle.
5. Evidence gate: collect local+M1+M2 artifacts; ASTRA reviews scope and limitations. R3 database changes also require M3 evidence. Authorized promotion references exactly the verified artifact.

Initially run future verifiers manually in the approved environment. Later GitHub Actions integration must isolate trusted credential-bearing jobs from untrusted PR code; exact runner/access design is deferred. A failing gate must return a non-success result, retain diagnostics and prevent claiming acceptance. Existing workflows do not yet enforce this target.

## Rollback limitations

No automatic version rollback found; Argo self-heal only restores desired state. Reverting code/image does not undo index or financial data changes. External cleanup retention and restorable DB backups are unknown. An approved rollback needs a known image/digest, GitOps revision, data compatibility assessment and operator authorization; the verifier never changes desired state automatically.
