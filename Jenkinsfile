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
      description: 'Local Docker image name without tag'
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

          if (!env.SAFE_BRANCH_NAME?.trim()) {
            env.SAFE_BRANCH_NAME = 'unknown'
          }

          env.APP_PORT_VALUE = params.APP_PORT?.trim() ?: '8080'
          env.DOCKER_IMAGE_NAME = params.DOCKER_IMAGE?.trim() ?: 'card-credit'

          env.DOCKER_TAG = "${env.SAFE_BRANCH_NAME}-${env.BUILD_NUMBER}"
          env.FULL_IMAGE_NAME = "${env.DOCKER_IMAGE_NAME}:${env.DOCKER_TAG}"

          echo "Branch name: ${branchName}"
          echo "Safe branch name: ${env.SAFE_BRANCH_NAME}"
          echo "Application port: ${env.APP_PORT_VALUE}"
          echo "Docker image: ${env.FULL_IMAGE_NAME}"
        }
      }
    }

    stage('Install Dependencies') {
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

              rm -rf node_modules .next public/card-images/generated

              npm ci --no-audit --no-fund

              chown -R "$HOST_UID:$HOST_GID" \
                node_modules \
                package-lock.json \
                2>/dev/null || true
            '
        '''
      }
    }

    stage('Validate Catalog') {
      agent {
        label 'eztechvn2'
      }

      steps {
        sh '''
          set -eu

          docker run --rm \
            -e HOME=/tmp \
            -e npm_config_cache=/tmp/.npm \
            -v "$WORKSPACE:/workspace" \
            -w /workspace \
            node:22-alpine \
            sh -lc 'set -eu; npm run validate:catalog'
        '''
      }
    }

    stage('Type Check') {
      agent {
        label 'eztechvn2'
      }

      steps {
        sh '''
          set -eu

          docker run --rm \
            -e HOME=/tmp \
            -e npm_config_cache=/tmp/.npm \
            -v "$WORKSPACE:/workspace" \
            -w /workspace \
            node:22-alpine \
            sh -lc 'set -eu; npm run typecheck'
        '''
      }
    }

    stage('Lint') {
      agent {
        label 'eztechvn2'
      }

      steps {
        sh '''
          set -eu

          docker run --rm \
            -e HOME=/tmp \
            -e npm_config_cache=/tmp/.npm \
            -v "$WORKSPACE:/workspace" \
            -w /workspace \
            node:22-alpine \
            sh -lc 'set -eu; npm run lint'
        '''
      }
    }

    stage('Unit Tests') {
      agent {
        label 'eztechvn2'
      }

      steps {
        sh '''
          set -eu

          docker run --rm \
            -e HOME=/tmp \
            -e npm_config_cache=/tmp/.npm \
            -v "$WORKSPACE:/workspace" \
            -w /workspace \
            node:22-alpine \
            sh -lc 'set -eu; npm run test:unit'
        '''
      }
    }

    stage('Integration Tests') {
      agent {
        label 'eztechvn2'
      }

      steps {
        sh '''
          set -eu

          docker run --rm \
            -e HOME=/tmp \
            -e npm_config_cache=/tmp/.npm \
            -v "$WORKSPACE:/workspace" \
            -w /workspace \
            node:22-alpine \
            sh -lc 'set -eu; npm run test:integration'
        '''
      }
    }

    stage('Prepare Card Images') {
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

              npm run prepare:card-images

              chown -R "$HOST_UID:$HOST_GID" \
                public/card-images \
                data/card-image-manifest.json \
                2>/dev/null || true
            '
        '''
      }
    }

    stage('Build Application') {
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

              npm run build

              chown -R "$HOST_UID:$HOST_GID" \
                .next \
                2>/dev/null || true
            '
        '''
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
          ),
          string(
            credentialsId: 'CARD-CREDIT-AUTH-SECRET',
            variable: 'AUTH_SECRET'
          ),
          string(
            credentialsId: 'CARD-CREDIT-AUTH-USERS-JSON',
            variable: 'AUTH_USERS_JSON'
          )
        ]) {
          sh '''
            set -eu

            echo "Validating authentication configuration"

            if [ "${#AUTH_SECRET}" -lt 32 ]; then
              echo "AUTH_SECRET must contain at least 32 characters"
              exit 1
            fi

            docker run --rm \
              --env AUTH_USERS_JSON \
              node:22-alpine \
              node -e '
                const users = JSON.parse(process.env.AUTH_USERS_JSON || "[]");

                if (!Array.isArray(users) || users.length === 0) {
                  throw new Error("AUTH_USERS_JSON must be a non-empty JSON array");
                }

                for (const user of users) {
                  if (
                    !user.id ||
                    !user.email ||
                    !user.password ||
                    !user.role ||
                    !user.workspaceId
                  ) {
                    throw new Error(
                      "Each auth user must contain id, email, password, role and workspaceId"
                    );
                  }

                  if (!["admin", "user"].includes(user.role)) {
                    throw new Error(
                      `Unsupported role for ${user.email}: ${user.role}`
                    );
                  }
                }

                console.log(`Authentication configuration contains ${users.length} user(s)`);
              '

            echo "Validating Docker Compose configuration"
            echo "Docker image: ${FULL_IMAGE_NAME}"
            echo "Application port: ${APP_PORT_VALUE}"

            docker version

            APP_PORT="${APP_PORT_VALUE}" \
            DOCKER_IMAGE="${DOCKER_IMAGE_NAME}" \
            DOCKER_TAG="${DOCKER_TAG}" \
              docker compose \
                -f docker-compose.prod.yml \
                config --quiet

            echo "Docker Compose configuration is valid"
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
          ),
          string(
            credentialsId: 'CARD-CREDIT-AUTH-SECRET',
            variable: 'AUTH_SECRET'
          ),
          string(
            credentialsId: 'CARD-CREDIT-AUTH-USERS-JSON',
            variable: 'AUTH_USERS_JSON'
          )
        ]) {
          sh '''
            set -eu

            echo "Building image: ${FULL_IMAGE_NAME}"

            APP_PORT="${APP_PORT_VALUE}" \
            DOCKER_IMAGE="${DOCKER_IMAGE_NAME}" \
            DOCKER_TAG="${DOCKER_TAG}" \
              docker compose \
                -f docker-compose.prod.yml \
                build

            docker image inspect "${FULL_IMAGE_NAME}" >/dev/null
          '''
        }
      }
    }

    /*
    stage('Container Smoke Test') {
      agent {
        label 'eztechvn2'
      }

      steps {
        withCredentials([
          string(
            credentialsId: 'MONGODB-ATLAS',
            variable: 'MONGODB_URI'
          ),
          string(
            credentialsId: 'CARD-CREDIT-AUTH-SECRET',
            variable: 'AUTH_SECRET'
          ),
          string(
            credentialsId: 'CARD-CREDIT-AUTH-USERS-JSON',
            variable: 'AUTH_USERS_JSON'
          )
        ]) {
          sh '''
            set -eu

            SMOKE_CONTAINER="card-credit-smoke-${BUILD_NUMBER}"

            cleanup() {
              docker rm -f "$SMOKE_CONTAINER" >/dev/null 2>&1 || true
            }

            trap cleanup EXIT
            cleanup

            docker run -d \
              --name "$SMOKE_CONTAINER" \
              -e NODE_ENV=production \
              -e PORT=3000 \
              -e MONGODB_URI \
              -e AUTH_SECRET \
              -e AUTH_USERS_JSON \
              "${FULL_IMAGE_NAME}" \
              >/dev/null

            for attempt in $(seq 1 30); do
              if docker exec \
                -e SMOKE_BASE_URL="http://127.0.0.1:3000" \
                -e SMOKE_TIMEOUT_MS="10000" \
                "$SMOKE_CONTAINER" \
                npm run smoke:deploy; then
                echo "Container smoke test passed"
                exit 0
              fi

              echo "Waiting for container smoke test attempt ${attempt}/30"
              sleep 2
            done

            echo "Container smoke test failed"
            docker logs "$SMOKE_CONTAINER" || true
            exit 1
          '''
        }
      }
    }
    */

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
          ),
          string(
            credentialsId: 'CARD-CREDIT-AUTH-SECRET',
            variable: 'AUTH_SECRET'
          ),
          string(
            credentialsId: 'CARD-CREDIT-AUTH-USERS-JSON',
            variable: 'AUTH_USERS_JSON'
          )
        ]) {
          sh '''
            set -eu

            echo "Deploying master image: ${FULL_IMAGE_NAME}"

            APP_PORT="${APP_PORT_VALUE}" \
            DOCKER_IMAGE="${DOCKER_IMAGE_NAME}" \
            DOCKER_TAG="${DOCKER_TAG}" \
              docker compose \
                -f docker-compose.prod.yml \
                up -d \
                --force-recreate \
                --remove-orphans

            APP_PORT="${APP_PORT_VALUE}" \
            DOCKER_IMAGE="${DOCKER_IMAGE_NAME}" \
            DOCKER_TAG="${DOCKER_TAG}" \
              docker compose \
                -f docker-compose.prod.yml \
                ps

            echo "Checking authentication variables inside the running container"

            docker exec card-credit sh -lc '
              test -n "$AUTH_SECRET" &&
                echo "AUTH_SECRET=set" ||
                {
                  echo "AUTH_SECRET=missing"
                  exit 1
                }

              test -n "$AUTH_USERS_JSON" &&
                echo "AUTH_USERS_JSON=set" ||
                {
                  echo "AUTH_USERS_JSON=missing"
                  exit 1
                }
            '
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
              -e MONGODB_URI \
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
          if (
            env.BRANCH_NAME != 'master' &&
            env.FULL_IMAGE_NAME?.trim()
          ) {
            sh '''
              echo "Removing temporary branch image: ${FULL_IMAGE_NAME}"

              docker image rm \
                "${FULL_IMAGE_NAME}" \
                2>/dev/null || true
            '''
          } else if (
            env.BRANCH_NAME == 'master' &&
            env.FULL_IMAGE_NAME?.trim()
          ) {
            echo "Keeping deployed master image: ${env.FULL_IMAGE_NAME}"
          }
        }

        sh '''
          set +e

          echo "Cleaning workspace build files"

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
              '

            if command -v git >/dev/null 2>&1 && [ -d "$WORKSPACE/.git" ]; then
              git -C "$WORKSPACE" checkout -- data/card-image-manifest.json 2>/dev/null || true
            else
              mkdir -p "$WORKSPACE/data"
              printf "{}\\n" > "$WORKSPACE/data/card-image-manifest.json"
            fi

            echo "Cleaning Docker build cache older than 24 hours"

            docker builder prune \
              -f \
              --filter "until=24h" \
              >/dev/null 2>&1 || true
          else
            rm -rf \
              node_modules \
              .next \
              public/card-images/generated

            if command -v git >/dev/null 2>&1 && [ -d "$WORKSPACE/.git" ]; then
              git -C "$WORKSPACE" checkout -- data/card-image-manifest.json 2>/dev/null || true
            else
              mkdir -p data
              printf "{}\\n" > data/card-image-manifest.json
            fi
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
