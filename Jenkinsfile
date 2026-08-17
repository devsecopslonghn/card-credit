@Library(['company-ci', 'company-cd']) _

ciPipeline(
    type: 'container',
    application: 'card-credit',
    language: 'javascript',
    buildSystem: 'npm',
    // ci-platform validates each package independently. Keep shared first so
    // the linked @card-credit/contracts package is installed and checked
    // before frontend/backend consumers.
    sourceDirectories: ['shared', 'frontend', 'backend'],
    sonarSources: ['frontend', 'backend', 'shared'],
    securityScans: [
        sonar: false,
        trivy: false,
        codeql: false,
        securityBlock: false,
        sonarProjectKey: 'card-credit'
    ],
    artifactProfile: 'nexus-container-dev',
    images: [
        [name: 'frontend', dockerfile: 'frontend/Dockerfile'],
        [name: 'backend', dockerfile: 'backend/Dockerfile']
    ]
)

// Shared defaults from company-ci provide Node/npm validation, Hadolint and
// security tooling. SonarQube endpoint and token credential are resolved from
// Jenkins global configuration; only this application's project key is explicit.

cdPipeline(
    strategy: 'gitops',
    application: 'card-credit',
    deploymentProfile: 'card-credit-dev',
    valuesFile: 'card-credit/values.yaml',
    variables: [imageTag: env.IMAGE_TAG]
)
