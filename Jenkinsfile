@Library(['company-ci', 'company-cd']) _

ciPipeline(
    type: 'container',
    application: 'card-credit',
    artifactProfile: 'nexus-container-dev',
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
