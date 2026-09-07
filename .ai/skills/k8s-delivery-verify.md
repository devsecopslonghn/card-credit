# Kubernetes delivery verification

Use after an independently authorized delivery, or to inspect an explicitly named existing revision. This workflow only observes infrastructure; it neither deploys nor proves financial correctness.

## Required inputs

Expected application SHA, frontend/backend image references and publication digests when available, expected GitOps revision, kube context, namespace, Argo application/namespace, bounded observation timeout, health access route and evidence directory. Obtain expected values from the delivery packet/publication, not from the observed workload itself. Missing expected identity is BLOCKED for revision verification.

## Checks

1. Read the named Argo Application as structured JSON. Require expected GitOps revision, Synced, Healthy and successful completed sync operation. Record any pending operation and do not pass an older successful operation as the current one.
2. Read both named Deployments and their ReplicaSets/pods through selectors. Record Deployment revision annotation, generation/observedGeneration and desired/updated/ready/available replicas. Require positive expected replica counts, observed current generation, all expected replicas updated/ready/available and no old-version workload serving the candidate. Use bounded rollout status checks; never restart or scale to force success.
3. Match each desired image tag to the expected application SHA and each runtime imageID to its expected publication digest when supplied. Record actual digests even when only tag provenance is available, and label digest provenance incomplete. Missing required digest is PARTIAL/BLOCKED, not a fabricated match.
4. Capture pod readiness, container waiting/termination reasons and restart counts at start/end of the window. Unexpected restart growth or crash/image-pull errors fail; nonzero historical counts require bounded contextual review rather than silently resetting them. Collect relevant workload events on failure.
5. Read bounded relevant logs with approved access; redact secrets and financial details before writing artifacts. Missing log access is an explicit limitation, not “no errors.” Match time/resource/request correlation where possible.
6. Check public `/login` as frontend reachability; backend `/health` and `/ready` through the specified internal access mechanism. Current public `/ready` is 404 and must not be assumed healthy. A loopback-bound Service port-forward may be used only where authorized and is closed on completion; no pod creation/exec or ingress change is implied. If backend checks cannot be reached, report the missing checks. Current `/ready` only reports connect-state and does not prove live DB transaction health.
7. Re-read revisions at the end. If deployment changed during collection, reject the mixed evidence and report a superseded candidate. Do not auto-rollback, sync, apply or retry forever.

## Output

Produce structured expected/actual values and command exit codes under [evidence contract](../EVIDENCE_CONTRACT.md). PASS means **infrastructure scope only**, within the stated timeout/window. Deployed financial acceptance additionally requires business evidence. Proposed automation should test wrong SHA, mixed images, stale Argo revision, zero replicas, unavailable pods, missing fields, timeouts and command failures with fixtures before live use.
