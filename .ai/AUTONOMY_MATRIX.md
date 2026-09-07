# Capability autonomy matrix

Current evidence comes from discovery, not fresh access tests. Allowed level is a proposed operational boundary for future assigned tasks, not execution approval in this documentation phase. Levels here: READ = scoped observation; LOCAL = reversible local work; SCOPED = explicitly named environment/action; HUMAN = concrete human-controlled operation; HOLD = insufficient prerequisites. No global level is assigned.

| Capability | Current evidence | Allowed level | Required verification | Human gate |
| --- | --- | --- | --- | --- |
| Read repository | Local/remote HEAD read succeeded | READ | Correct repo/revision, exact task files | None within task |
| Modify source | Writable workspace; discovery did not edit code | LOCAL when implementation assigned | Allowlist diff, risk-specific checks | Not needed again for assigned reversible code work |
| Run tests | 249 default tests passed historically | LOCAL | Exact suite, runtime, exit codes; isolated dependencies | None for local tests; external target separately scoped |
| Run build | Scripts exist; no discovery build | LOCAL | Relevant build output/source identity | None for assigned local build |
| Build container | Docker exists; daemon unverified | LOCAL when available | Root context, tag/digest, no secrets | No publication implied |
| Inspect Kubernetes | Scoped reads succeeded | READ | Explicit context/namespace and timestamp | No extra gate for authorized read-only investigation |
| Read logs | RBAC query said yes; logs not read | READ scoped | Target/time bounds and redaction | Scope may limit sensitive data access |
| Deploy sandbox | No verified sandbox | HOLD → SCOPED | Named target/identity, candidate provenance, M1/M2 | Separate delivery authorization; never from coding task |
| Deploy current namespace | Classification uncertain; Argo exists | HOLD / HUMAN | Environment classification, artifact, data compatibility/recovery | Explicit delivery approval; `dev` label is insufficient |
| Create commit | Git exists; not exercised | LOCAL when requested/implied by assigned workflow | Staged diff, no secrets/unrelated files | No repeat approval if already authorized |
| Push branch | Read access only | SCOPED | Exact remote/branch and CI side effects | Existing authorization or explicit assignment; master/main may deploy |
| Create PR | Not exercised | SCOPED | Reviewed candidate/evidence, correct base, no auto-merge | Authorized workflow; no messages to people unless authorized |
| Merge PR | Protection/rights unknown | HUMAN | Required checks, reviewed SHA, delivery side effects | Explicit merge scope; never infer from PR creation |
| Authenticated finance verification | Not demonstrated | HOLD → SCOPED nonproduction | Host/workspace/identity/action allowlist; M2 before/after oracle | Approve fixture environment/action; honor preview confirmations |
| Database/index maintenance | Scripts/hook exist; DB rights unknown | LOCAL disposable harness or HUMAN external | Exact database identity, index diff, recovery and isolation | External maintenance approval; not implied by test task |
| Mutate production data | Forbidden in current coding agreement | HOLD / HUMAN operation | Exact preview, authorization, idempotency/audit/recovery | Explicit operation approval; no standing agent autonomy |
| Modify IAM/secrets | Access unknown | HUMAN | Reviewed least-scope diff and recovery, no values in output | Explicit approval; never discover credentials by broad enumeration |

Sandbox promotion remains HOLD until its target and ownership are recorded. Do not use successful `kubectl get` or a documentation command as proof of write permission. Declared access and actual technical access are separate evidence fields.
