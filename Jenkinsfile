pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  parameters {
    string(name: 'DOCKER_IMAGE', defaultValue: 'card-credit', description: 'Docker image name, without tag')
    string(name: 'DOCKER_REGISTRY', defaultValue: '', description: 'Optional registry, for example registry.example.com/team')
    string(name: 'BUILD_MONGODB_URI', defaultValue: 'mongodb://localhost:27017/card-credit', description: 'MongoDB URI used only during Next.js build')
    booleanParam(name: 'PUSH_IMAGE', defaultValue: false, description: 'Push image to registry')
    string(name: 'DOCKER_CREDENTIALS_ID', defaultValue: '', description: 'Jenkins username/password credentials ID for docker login')
  }

  stages {
    stage('Install') {
      steps {
        sh 'node --version'
        sh 'npm ci'
      }
    }

    stage('Lint') {
      steps {
        catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
          sh 'npm run lint'
        }
      }
    }

    stage('Build') {
      steps {
        sh 'MONGODB_URI="$BUILD_MONGODB_URI" npm run build'
      }
    }

    stage('Docker Build') {
      steps {
        script {
          def imagePrefix = params.DOCKER_REGISTRY?.trim()
          def imageName = params.DOCKER_IMAGE.trim()
          env.IMAGE_TAG = imagePrefix ? "${imagePrefix}/${imageName}:${env.BUILD_NUMBER}" : "${imageName}:${env.BUILD_NUMBER}"
          env.IMAGE_LATEST = imagePrefix ? "${imagePrefix}/${imageName}:latest" : "${imageName}:latest"
        }

        sh 'docker build --build-arg MONGODB_URI="$BUILD_MONGODB_URI" -t "$IMAGE_TAG" -t "$IMAGE_LATEST" .'
      }
    }

    stage('Docker Push') {
      when {
        expression { return params.PUSH_IMAGE }
      }
      steps {
        script {
          if (!params.DOCKER_REGISTRY?.trim()) {
            error('DOCKER_REGISTRY is required when PUSH_IMAGE is true')
          }
          if (!params.DOCKER_CREDENTIALS_ID?.trim()) {
            error('DOCKER_CREDENTIALS_ID is required when PUSH_IMAGE is true')
          }
        }

        withCredentials([usernamePassword(credentialsId: params.DOCKER_CREDENTIALS_ID, usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
          sh '''
            set -eu
            echo "$DOCKER_PASSWORD" | docker login "$DOCKER_REGISTRY" --username "$DOCKER_USERNAME" --password-stdin
            docker push "$IMAGE_TAG"
            docker push "$IMAGE_LATEST"
            docker logout "$DOCKER_REGISTRY"
          '''
        }
      }
    }
  }

}
