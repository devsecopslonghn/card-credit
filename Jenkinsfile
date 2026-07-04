pipeline {
  agent none

  options {
    timestamps()
    disableConcurrentBuilds()
    skipDefaultCheckout(true)
  }

  parameters {
    booleanParam(
      name: 'SEED_SAMPLE_DATA',
      defaultValue: false,
      description: 'Insert or update sample data after deploy. Only runs on master branch.'
    )

    string(
      name: 'APP_PORT',
      defaultValue: '8080',
      description: 'Host port for the Next.js container'
    )

    string(
      name: 'DOCKER_IMAGE',
      defaultValue: 'card-credit',
      description: 'Local Docker image name'
    )
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
          set -eu

          echo "Jenkins node: ${NODE_NAME}"
          echo "Workspace: ${WORKSPACE}"
          echo "Branch: ${BRANCH_NAME:-unknown}"
          echo "Build number: ${BUILD_NUMBER}"
        '''

        checkout scm
      }
    }

    stage('Prepare Build Variables') {
      agent {
        label 'eztechvn2'
      }

      steps {
        script {
          String branchName = env.BRANCH_NAME ?: 'unknown'

          env.SAFE_BRANCH_NAME = branchName
            .toLowerCase()
            .replaceAll('[^a-z0-9_.-]', '-')
            .replaceAll('-+', '-')
            .replaceAll('^-|-$', '')

          env.IMAGE_TAG = "${env.SAFE_BRANCH_NAME}-${env.BUILD_NUMBER}"
          env.FULL_IMAGE_NAME = "${params.DOCKER_IMAGE}:${env.IMAGE_TAG}"

          echo "Docker image: ${env.FULL_IMAGE_NAME}"
        }
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
              set -eu

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
        catchError(
          buildResult: 'SUCCESS',
          stageResult: 'UNSTABLE'
        ) {
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
                set -eu

                npm run lint

                chown -R "$HOST_UID:$HOST_GID" \
                  node_modules \
                  .next \
                  2>/dev/null || true
              '
          '''
        }
      }
    }

    stage('Validate Docker Compose') {
      agent {
        label 'eztechvn2'
      }

      steps {
        withCredentials([
          string(
            credentialsId: 'MONGODB-ATLAS',
            variable: 'MONGODB_URI'
          )
        ]) {
          sh '''
            set -eu

            docker version

            APP_PORT="${APP_PORT}" \
            DOCKER_IMAGE="${FULL_IMAGE_NAME}" \
            MONGODB_URI="${MONGODB_URI}" \
              docker compose \
                -f docker-compose.prod.yml \
                config --quiet
          '''
        }
      }
    }

    stage('Build Production Image') {
      agent {
        label 'eztechvn2'
      }

      steps {
        withCredentials([
          string(
            credentialsId: 'MONGODB-ATLAS',
            variable: 'MONGODB_URI'
          )
        ]) {
          sh '''
            set -eu

            echo "Building image: ${FULL_IMAGE_NAME}"

            APP_PORT="${APP_PORT}" \
            DOCKER_IMAGE="${FULL_IMAGE_NAME}" \
            MONGODB_URI="${MONGODB_URI}" \
              docker compose \
                -f docker-compose.prod.yml \
                build

            docker image inspect "${FULL_IMAGE_NAME}" >/dev/null

            echo "Image built successfully:"
            docker image ls "${FULL_IMAGE_NAME}"
          '''
        }
      }
    }

    stage('Start Application') {
      when {
        beforeAgent true
        branch 'master'
      }

      agent {
        label 'eztechvn2'
      }

      steps {
        withCredentials([
          string(
            credentialsId: 'MONGODB-ATLAS',
            variable: 'MONGODB_URI'
          )
        ]) {
          sh '''
            set -eu

            echo "Deploying image: ${FULL_IMAGE_NAME}"

            APP_PORT="${APP_PORT}" \
            DOCKER_IMAGE="${FULL_IMAGE_NAME}" \
            MONGODB_URI="${MONGODB_URI}" \
              docker compose \
                -f docker-compose.prod.yml \
                up -d \
                --force-recreate \
                --remove-orphans

            APP_PORT="${APP_PORT}" \
            DOCKER_IMAGE="${FULL_IMAGE_NAME}" \
            MONGODB_URI="${MONGODB_URI}" \
              docker compose \
                -f docker-compose.prod.yml \
                ps
          '''
        }
      }
    }

    stage('Seed Sample Data') {
      when {
        beforeAgent true

        allOf {
          branch 'master'

          expression {
            return params.SEED_SAMPLE_DATA
          }
        }
      }

      agent {
        label 'eztechvn2'
      }

      steps {
        withCredentials([
          string(
            credentialsId: 'MONGODB-ATLAS',
            variable: 'MONGODB_URI'
          )
        ]) {
          sh '''
            set -eu

            echo "Seeding sample data using image: ${FULL_IMAGE_NAME}"

            docker run --rm \
              -e MONGODB_URI="$MONGODB_URI" \
              "${FULL_IMAGE_NAME}" \
              npm run seed:sample
          '''
        }
      }
    }
  }

  post {
    always {
      node('eztechvn2') {
        script {
          if (env.BRANCH_NAME != 'master' && env.FULL_IMAGE_NAME) {
            sh '''
              echo "Removing temporary branch image: ${FULL_IMAGE_NAME}"
              docker image rm "${FULL_IMAGE_NAME}" 2>/dev/null || true
            '''
          } else if (env.BRANCH_NAME == 'master' && env.FULL_IMAGE_NAME) {
            echo "Keeping deployed master image: ${env.FULL_IMAGE_NAME}"
          }
        }

        sh '''
          set +e

          if command -v docker >/dev/null 2>&1; then
            docker run --rm \
              -u root:root \
              -v "$WORKSPACE:/workspace" \
              -w /workspace \
              node:22-alpine \
              sh -lc '
                rm -rf \
                  node_modules \
                  .next \
                  public/card-images/generated

                mkdir -p data
                printf "{}\\n" > data/card-image-manifest.json
              '

            docker builder prune \
              -f \
              --filter "until=24h" \
              >/dev/null 2>&1 || true
          else
            rm -rf \
              node_modules \
              .next \
              public/card-images/generated

            mkdir -p data
            printf "{}\\n" > data/card-image-manifest.json
          fi
        '''
      }
    }

    success {
      echo "Pipeline successful for branch: ${env.BRANCH_NAME ?: 'unknown'}"
    }

    unstable {
      echo "Pipeline unstable for branch: ${env.BRANCH_NAME ?: 'unknown'}"
    }

    failure {
      echo "Pipeline failed for branch: ${env.BRANCH_NAME ?: 'unknown'}"
    }
  }
}