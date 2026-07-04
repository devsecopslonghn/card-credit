pipeline {
  agent none

  options {
    timestamps()
    disableConcurrentBuilds()
    skipDefaultCheckout(true)
  }

  parameters {
    booleanParam(name: 'DEPLOY_LOCAL', defaultValue: true, description: 'Start the app on eztechvn2 after building the image')
    string(name: 'APP_PORT', defaultValue: '8080', description: 'Host port for the Next.js container')
    string(name: 'DOCKER_IMAGE', defaultValue: 'card-credit', description: 'Local Docker image name')
  }

  environment {
    DOCKER_BUILDKIT = '1'
  }

  stages {
    stage('Checkout') {
      agent {
        label 'eztechvn2'
      }
      steps {
        sh '''
          echo "Jenkins node: ${NODE_NAME}"
          echo "Workspace: ${WORKSPACE}"
        '''
        checkout scm
      }
    }

    stage('Build Node Workspace') {
      agent {
        label 'eztechvn2'
      }
      steps {
        sh '''
          set -eu

          HOST_UID="$(id -u)"
          HOST_GID="$(id -g)"

          docker run --rm \
            -u root:root \
            -e HOME=/tmp \
            -e npm_config_cache=/tmp/.npm \
            -e HOST_UID="$HOST_UID" \
            -e HOST_GID="$HOST_GID" \
            -v "$WORKSPACE:/workspace" \
            -w /workspace \
            node:22-alpine \
            sh -lc '
              apk add --no-cache python3 make g++
              rm -rf node_modules .next
              npm ci --no-audit --no-fund
              npm run build
              chown -R "$HOST_UID:$HOST_GID" \
                node_modules \
                .next \
                package-lock.json \
                2>/dev/null || true
            '
        '''
      }
    }

    stage('Lint') {
      agent {
        label 'eztechvn2'
      }
      steps {
        catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
          sh '''
            set -eu

            HOST_UID="$(id -u)"
            HOST_GID="$(id -g)"

            docker run --rm \
              -u root:root \
              -e HOME=/tmp \
              -e npm_config_cache=/tmp/.npm \
              -e HOST_UID="$HOST_UID" \
              -e HOST_GID="$HOST_GID" \
              -v "$WORKSPACE:/workspace" \
              -w /workspace \
              node:22-alpine \
              sh -lc '
                npm run lint
                chown -R "$HOST_UID:$HOST_GID" node_modules .next 2>/dev/null || true
              '
          '''
        }
      }
    }

    stage('Validate Docker') {
      agent {
        label 'eztechvn2'
      }
      steps {
        withCredentials([string(credentialsId: 'MONGODB-ATLAS', variable: 'MONGODB_URI')]) {
          sh '''
            docker version
            APP_PORT="${APP_PORT}" \
            DOCKER_IMAGE="${DOCKER_IMAGE}" \
              docker compose -f docker-compose.prod.yml config --quiet
          '''
        }
      }
    }

    stage('Build Production Image') {
      agent {
        label 'eztechvn2'
      }
      steps {
        withCredentials([string(credentialsId: 'MONGODB-ATLAS', variable: 'MONGODB_URI')]) {
          sh '''
            APP_PORT="${APP_PORT}" \
            DOCKER_IMAGE="${DOCKER_IMAGE}" \
              docker compose -f docker-compose.prod.yml build

            docker image inspect "${DOCKER_IMAGE}:latest" >/dev/null
          '''
        }
      }
    }

    stage('Start Application') {
      agent {
        label 'eztechvn2'
      }
      when {
        expression { return params.DEPLOY_LOCAL }
      }
      steps {
        withCredentials([string(credentialsId: 'MONGODB-ATLAS', variable: 'MONGODB_URI')]) {
          sh '''
            APP_PORT="${APP_PORT}" \
            DOCKER_IMAGE="${DOCKER_IMAGE}" \
              docker compose -f docker-compose.prod.yml up -d --force-recreate --remove-orphans

            APP_PORT="${APP_PORT}" \
            DOCKER_IMAGE="${DOCKER_IMAGE}" \
              docker compose -f docker-compose.prod.yml ps

            docker port card-credit

            docker run --rm --network host curlimages/curl:8.10.1 -fsS "http://localhost:${APP_PORT}/" >/dev/null
          '''
        }
      }
    }
  }

  post {
    always {
      node('eztechvn2') {
        sh '''
          if command -v docker >/dev/null 2>&1; then
            docker run --rm \
              -u root:root \
              -v "$WORKSPACE:/workspace" \
              -w /workspace \
              node:22-alpine \
              sh -lc 'rm -rf node_modules .next'
          else
            rm -rf node_modules .next
          fi
        '''
      }
    }
  }
}
