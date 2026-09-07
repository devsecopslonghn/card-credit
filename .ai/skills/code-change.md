# Code change

Use for a bounded source change. If money/auth/workspace/index behavior or its test oracle changes, classify R3 and also use [finance change](finance-change.md) for relevant financial invariants.

## Inputs

An ASTRA task packet: goal, risk, exact read/modify scope, acceptance criteria and applicable checks. Read root/package AGENTS plus only packet-linked `.ai` sections. No whole-repository discovery or inherited global assessment is needed.

## Procedure

1. Confirm base SHA and existing working changes. Trace only the affected contract → service → adapter → caller → test links.
2. Implement within the allowlist, preserving Fastify/shared boundaries. If additional scope is necessary, return the specific dependency to ASTRA before changing it.
3. Run relevant checks from current package scripts. Typical backend: `npm --prefix backend run lint`, `run typecheck`, `test`, `run build`; shared: `run typecheck`, `test`; frontend: `run typecheck`, `run lint`, relevant Node/Playwright tests and `run build` when runtime changes. Select full/targeted suites according to impact; record exact commands, not “tests passed.” Follow package AGENTS required checks. Do not add tests that merely assert document wording or mirror trivial implementation.
4. For UI behavior, execute relevant Playwright interactions when required; mocked browser APIs do not prove backend/persistence. No production URL or database from ambient configuration.
5. Review diff and produce [evidence](../EVIDENCE_CONTRACT.md). Mark inapplicable builds/runtime with reasons; missing required execution is not PASS.

## Boundaries

Do not deploy, push/merge, run database maintenance or confirm financial repairs as a side effect of coding. An existing explicit assignment may authorize commit/branch push/PR; verify exact scope and side effects. No test weakening, framework replacement or unrelated refactoring.

Return PASS / PARTIAL / FAIL / BLOCKED and concrete evidence to ASTRA; acceptance belongs to ASTRA.
