pipeline {
  agent none

  options {
    timestamps()
    disableConcurrentBuilds()
    skipDefaultCheckout(true)
  }

  parameters {
    booleanParam(name: 'SEED_SAMPLE_DATA', defaultValue: false, description: 'Insert or update sample data after deploy')
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
              npm run validate:catalog
              npm test
              npm run prepare:card-images
              npm run build
              chown -R "$HOST_UID:$HOST_GID" \
                node_modules \
                .next \
                public/card-images \
                data/card-image-manifest.json \
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
        branch 'master'
      }
      steps {
        withCredentials([string(credentialsId: 'MONGODB-ATLAS', variable: 'MONGODB_URI')]) {
          sh '''
            APP_PORT="${APP_PORT}" \
            DOCKER_IMAGE="${DOCKER_IMAGE}" \
              docker compose -f docker-compose.prod.yml up -d --force-recreate --remove-orphans
          '''
        }
      }
    }

    stage('Seed Sample Data') {
      agent {
        label 'eztechvn2'
      }
      when {
        expression { return params.SEED_SAMPLE_DATA }
      }
      steps {
        withCredentials([string(credentialsId: 'MONGODB-ATLAS', variable: 'MONGODB_URI')]) {
          sh '''
            docker run --rm \
              -e MONGODB_URI="$MONGODB_URI" \
              "${DOCKER_IMAGE}:latest" \
              npm run seed:sample
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
              sh -lc 'rm -rf node_modules .next public/card-images/generated && printf "{}\\n" > data/card-image-manifest.json'
          else
            rm -rf node_modules .next public/card-images/generated
            printf "{}\\n" > data/card-image-manifest.json
          fi
        '''
      }
    }
  }
}
