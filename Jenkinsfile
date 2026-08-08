@Library(['company-ci', 'company-cd']) _

ciPipeline(
    type: 'container',
    application: 'card-credit',
    language: 'javascript',
    buildSystem: 'npm',
    sourceDirectories: ['frontend', 'backend'],
    artifactProfile: 'nexus-container-dev',
    images: [
        [name: 'frontend', dockerfile: 'frontend/Dockerfile'],
        [name: 'backend', dockerfile: 'backend/Dockerfile']
    ]
)

// Shared defaults from company-ci: Node/npm validation, Hadolint, Trivy and
// CodeQL are enabled; SonarQube is disabled; securityBlock is non-blocking.
// Override explicitly above only when this application needs a different policy.

cdPipeline(
    strategy: 'gitops',
    application: 'card-credit',
    deploymentProfile: 'card-credit-dev',
    valuesFile: 'card-credit/values.yaml',
    variables: [imageTag: env.IMAGE_TAG]
)
