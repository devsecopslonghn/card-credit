@Library(['company-ci', 'company-cd']) _

ciPipeline(
    type: 'container',
    application: 'card-credit',
    language: 'javascript',
    buildSystem: 'npm',
    sourceDirectories: ['frontend', 'backend'],
    artifactProfile: 'nexus-container-dev',
    quality: [
        hadolint: true
    ],
    publishPolicy: [
        primaryOnly: true,
        primaryBranch: 'master'
    ],
    securityScans: [
        sonar: false,
        trivy: true,
        codeql: true,
        securityBlock: false
    ],
    images: [
        [name: 'frontend', dockerfile: 'frontend/Dockerfile'],
        [name: 'backend', dockerfile: 'backend/Dockerfile']
    ]
)

cdPipeline(
    strategy: 'gitops',
    application: 'card-credit',
    deploymentProfile: 'card-credit-dev',
    valuesFile: 'card-credit/values.yaml',
    variables: [imageTag: env.IMAGE_TAG]
)
