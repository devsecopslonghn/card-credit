# Task: stabilize smoke fixture timing

- task ID: 2026-09-07-smoke-fixture-timeout
- type: fix
- risk: R1
- status: completed
- symptom/goal: Frontend CI intermittently aborted the empty-catalog smoke fixture because the child-process HTTP request timeout was only 50ms.
- scope: frontend/tests/smokeBoundary.test.mjs; task evidence and state.
- relevant invariants: Happy-path fixture cases must allow normal CI process startup; the explicit timeout regression must remain bounded and fail closed.
- plan: Increase the fixture default request timeout to 1000ms and keep the timeout case at 50ms, run the focused suite repeatedly and run the trusted gate.
- work completed: Updated fixture timing and retained an explicit 50ms timeout override for the negative case.
- verification: Focused smoke suite passed 9/9 for 10 consecutive runs; `.agent/gates/verify.sh` passed with exit code 0.
- blocker: none
- next action: none
