pipeline {
  agent {
    kubernetes {
      cloud 'kubernetes'
      defaultContainer 'buildkit'
      yaml '''
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: buildkit
      image: moby/buildkit:v0.30.0-rootless
      args:
        - --oci-worker-no-process-sandbox
      env:
        - name: BUILDKIT_HOST
          value: unix:///run/user/1000/buildkit/buildkitd.sock
      securityContext:
        runAsUser: 1000
        runAsGroup: 1000
        seccompProfile:
          type: Unconfined
        appArmorProfile:
          type: Unconfined
      resources:
        requests:
          cpu: 500m
          memory: 1Gi
        limits:
          cpu: '3'
          memory: 4Gi
      volumeMounts:
        - name: buildkit-data
          mountPath: /home/user/.local/share/buildkit
  volumes:
    - name: buildkit-data
      emptyDir: {}
'''
    }
  }

  options {
    timestamps()
    disableConcurrentBuilds()
    skipDefaultCheckout(true)
    timeout(time: 60, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  environment {
    NEXUS_REGISTRY = 'nexus.apps.drgdevlab.com'
    FRONTEND_IMAGE = 'nexus.apps.drgdevlab.com/card-credit/frontend'
    BACKEND_IMAGE = 'nexus.apps.drgdevlab.com/card-credit/backend'
    GITOPS_REPOSITORY = 'https://github.com/devsecopslonghn/k8s-namepsace-chart'
  }

  stages {
    stage('Checkout') {
      steps {
        container('jnlp') {
          deleteDir()
          checkout scm
          script {
            env.IMAGE_TAG = sh(
              returnStdout: true,
              script: 'git rev-parse --short=12 HEAD'
            ).trim()
          }
          sh '''
            set -eu
            test -n "$IMAGE_TAG"
            test -f frontend/Dockerfile
            test -f backend/Dockerfile
            test -f frontend/package-lock.json
            test -f backend/package-lock.json
            echo "Building immutable image tag: ${IMAGE_TAG}"
          '''
        }
      }
    }

    stage('Build and push images') {
      steps {
        container('buildkit') {
          withCredentials([
            usernamePassword(
              credentialsId: 'nexus-longhn0710',
              usernameVariable: 'NEXUS_USERNAME',
              passwordVariable: 'NEXUS_PASSWORD'
            )
          ]) {
            sh '''
              set -eu
              set +x

              export DOCKER_CONFIG="$WORKSPACE/.docker-auth"
              mkdir -p "$DOCKER_CONFIG"
              AUTH="$(printf '%s:%s' "$NEXUS_USERNAME" "$NEXUS_PASSWORD" | base64 | tr -d '\n')"
              printf '{"auths":{"%s":{"auth":"%s"}}}\n' "$NEXUS_REGISTRY" "$AUTH" > "$DOCKER_CONFIG/config.json"
              chmod 600 "$DOCKER_CONFIG/config.json"
              unset AUTH NEXUS_USERNAME NEXUS_PASSWORD

              cleanup() {
                rm -rf "$DOCKER_CONFIG"
              }
              trap cleanup EXIT

              buildctl debug workers

              buildctl build \
                --frontend dockerfile.v0 \
                --local context=. \
                --local dockerfile=frontend \
                --opt filename=Dockerfile \
                --output "type=image,name=${FRONTEND_IMAGE}:${IMAGE_TAG},push=true"

              buildctl build \
                --frontend dockerfile.v0 \
                --local context=. \
                --local dockerfile=backend \
                --opt filename=Dockerfile \
                --output "type=image,name=${BACKEND_IMAGE}:${IMAGE_TAG},push=true"
            '''
          }
        }
      }
    }

    stage('Update GitOps image tag') {
      when {
        beforeAgent true
        branch 'master'
      }
      steps {
        container('jnlp') {
          dir('gitops-repository') {
            deleteDir()
            checkout([
              $class: 'GitSCM',
              branches: [[name: '*/master']],
              userRemoteConfigs: [[
                url: env.GITOPS_REPOSITORY,
                credentialsId: 'devsecopslonghn'
              ]]
            ])

            withCredentials([
              usernamePassword(
                credentialsId: 'devsecopslonghn',
                usernameVariable: 'GITHUB_APP_USERNAME',
                passwordVariable: 'GITHUB_APP_TOKEN'
              )
            ]) {
              sh '''
                set -eu
                set +x

                VALUES_FILE=card-credit/values.yaml
                test -f "$VALUES_FILE"
                test "$(grep -c '^  tag:' "$VALUES_FILE")" -eq 1
                sed -i -E "s/^  tag: .*/  tag: ${IMAGE_TAG}/" "$VALUES_FILE"
                grep -q "^  tag: ${IMAGE_TAG}$" "$VALUES_FILE"

                if git diff --quiet -- "$VALUES_FILE"; then
                  echo "GitOps already references ${IMAGE_TAG}"
                  exit 0
                fi

                git config user.name 'Jenkins GitOps Bot'
                git config user.email 'jenkins@drgdevlab.com'
                git add "$VALUES_FILE"
                git commit -m "Deploy card-credit ${IMAGE_TAG}"

                ASKPASS_FILE="$WORKSPACE/.git-askpass"
                printf '%s\n' \
                  '#!/bin/sh' \
                  'case "$1" in' \
                  '  *Username*) printf "%s\\n" "$GITHUB_APP_USERNAME" ;;' \
                  '  *) printf "%s\\n" "$GITHUB_APP_TOKEN" ;;' \
                  'esac' > "$ASKPASS_FILE"
                chmod 700 "$ASKPASS_FILE"
                trap 'rm -f "$ASKPASS_FILE"' EXIT

                GIT_ASKPASS="$ASKPASS_FILE" GIT_TERMINAL_PROMPT=0 \
                  git push origin HEAD:master
              '''
            }
          }
        }
      }
    }
  }

  post {
    always {
      container('buildkit') {
        sh 'rm -rf "$WORKSPACE/.docker-auth" 2>/dev/null || true'
      }
    }
    success {
      echo "Published card-credit images with tag ${env.IMAGE_TAG}"
    }
  }
}
