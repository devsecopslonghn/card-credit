# Kubernetes and GitOps Migration

## Goal

Replace the Docker Compose production deployment with two Kubernetes workloads,
build immutable frontend/backend images using rootless BuildKit in Jenkins,
push them to Nexus, and let Argo CD deploy the Helm release.

## Confirmed decisions

- Namespace and public host are `card-credit` and
  `card-credit.apps.drgdevlab.com`.
- Images are `nexus.apps.drgdevlab.com/card-credit/frontend:<git-sha>` and
  `nexus.apps.drgdevlab.com/card-credit/backend:<git-sha>`.
- Jenkins builds and pushes images, then updates the GitOps image tags. It does
  not apply Kubernetes resources directly.
- The backend has one replica pinned to `k8s-master` because MongoDB only
  allowlists the master's Internet egress IP.
- The frontend starts with one replica, prefers master, and can fall back to a
  worker.
- MongoDB, authentication, and SMTP values live only in the pre-created
  `card-credit-runtime` Kubernetes Secret.
- The existing Docker Compose deployment remains online until Kubernetes is
  healthy and the new endpoint has been tested.

## Phases

1. Prepare the runtime Secret and Helm chart without creating the Argo CD
   Application or changing production traffic.
2. Replace the Jenkins Docker/Compose pipeline with Kubernetes agents and
   rootless BuildKit; push both immutable images and update GitOps values.
3. Add the Argo CD Application, validate scheduling, MongoDB readiness, SMTP-safe
   runtime configuration, HTTPS, and authenticated behavior.
4. Retire the old Compose containers only after explicit cutover approval.

## Phase 1 status

Complete locally, not committed. The runtime environment was imported without printing values into
the `card-credit-runtime` Secret. The plaintext transfer file was removed after
the Secret key set was verified. The Helm chart is prepared in the GitOps repo
with image tags deliberately set to `pending`, so it cannot be deployed before
phase 2 publishes both images.

Validation results:

- The Secret contains all 13 expected runtime keys; values were never printed.
- Helm lint and template passed using the Argo CD repo-server Helm binary.
- Server-side dry-run passed for Namespace, Deployments, Services, and Ingress.
- Backend scheduling renders a required `k8s-master` node selector and the
  control-plane toleration; frontend renders preferred master affinity.
- Both workloads reference the `nexus-registry` image pull Secret.

Phase 2 requires a `nexus-registry` Secret in `card-credit` and GitHub App write
access for Jenkins to update the GitOps repository. Neither credential belongs
in Git.

No production database test, seed, import, migration, SMTP delivery, Argo CD
Application creation, traffic cutover, or Docker container shutdown is part of
this phase.

## Phase 2 status

Implemented locally; the first Jenkins run is pending. The pipeline now:

- provisions an ephemeral Kubernetes agent with
  `moby/buildkit:v0.30.0-rootless` and no Docker socket;
- uses the existing `nexus-longhn0710` credential only through Jenkins
  credential binding and deletes the temporary Docker auth file;
- builds the frontend and backend Dockerfiles, whose build stages perform the
  repository's existing lint, typecheck, test, and build validations;
- pushes both images with the same immutable 12-character Git commit SHA;
- on `master` only, checks out `k8s-namepsace-chart` with the
  `devsecopslonghn` GitHub App credential and updates the single
  `card-credit/values.yaml` image tag;
- never receives runtime MongoDB, auth, or SMTP credentials and never calls
  Docker Compose, kubectl, or Helm.

Static checks completed: GitHub App credential type implements Jenkins
`StandardUsernamePasswordCredentials`; Helm lint/render and server-side dry-run
still pass after consolidating the two image tags. Actual build/push and GitOps
write permission must be proven by the first Jenkins run.
