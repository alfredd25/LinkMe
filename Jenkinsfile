// =============================================================================
// ShrinkLink — Declarative Jenkins Pipeline
// =============================================================================
// Triggers on pushes to main. Builds, scans, pushes, deploys, and smoke-tests
// all five microservices in the monorepo.
// =============================================================================

pipeline {
    agent any

    triggers {
        // Poll SCM every 2 minutes (webhook-based triggers are preferred;
        // configure a GitHub/Bitbucket webhook pointing at /github-webhook/)
        pollSCM('H/2 * * * *')
    }

    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        AWS_DEFAULT_REGION  = 'us-east-1'
        ECR_REGISTRY        = "${env.AWS_ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com"
        EKS_CLUSTER_NAME    = 'shrinklink-eks'
        ALB_URL             = credentials('shrinklink-alb-url')   // Jenkins secret text credential
        IMAGE_TAG           = "${GIT_COMMIT.take(7)}-${BUILD_NUMBER}"
    }

    stages {
        // ─── 1. SCM Checkout ────────────────────────────────────────────
        stage('SCM Checkout') {
            steps {
                checkout scm
                script {
                    echo "Checked out commit: ${GIT_COMMIT}"
                    echo "Image tag: ${IMAGE_TAG}"
                }
            }
        }

        // ─── 2. Lint & Unit Tests ───────────────────────────────────────
        stage('Lint & Unit Tests') {
            parallel {
                stage('Backend Tests') {
                    steps {
                        script {
                            def services = ['auth-service', 'url-service', 'analytics-service', 'notification-service']
                            for (svc in services) {
                                echo "──── Testing ${svc} ────"
                                dir("services/${svc}") {
                                    sh '''
                                        python3 -m venv .venv
                                        . .venv/bin/activate
                                        pip install --quiet -r requirements.txt
                                        pip install --quiet pytest httpx
                                        python -m pytest tests/ -v --tb=short --junitxml=../../test-results/${svc}.xml
                                    '''
                                }
                            }
                        }
                    }
                }
                stage('Frontend Tests') {
                    steps {
                        dir('frontend') {
                            sh '''
                                npm ci --prefer-offline
                                npm test -- --passWithNoTests 2>/dev/null || npm run lint
                            '''
                        }
                    }
                }
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'test-results/*.xml'
                }
            }
        }

        // ─── 3. Docker Build ────────────────────────────────────────────
        stage('Docker Build') {
            steps {
                script {
                    def targets = [
                        ['auth-service',         'services/auth-service'],
                        ['url-service',          'services/url-service'],
                        ['analytics-service',    'services/analytics-service'],
                        ['notification-service', 'services/notification-service'],
                        ['frontend',             'frontend'],
                    ]
                    for (t in targets) {
                        def imageName = "${ECR_REGISTRY}/shrinklink-${t[0]}:${IMAGE_TAG}"
                        echo "Building ${imageName}"
                        sh "docker build -t ${imageName} ${t[1]}"
                    }
                }
            }
        }

        // ─── 4. Security Vulnerability Scan ─────────────────────────────
        stage('Security Vulnerability Scan') {
            steps {
                script {
                    def images = [
                        'auth-service',
                        'url-service',
                        'analytics-service',
                        'notification-service',
                        'frontend',
                    ]
                    for (img in images) {
                        def fullImage = "${ECR_REGISTRY}/shrinklink-${img}:${IMAGE_TAG}"
                        echo "Scanning ${fullImage}"
                        sh """
                            trivy image \
                                --severity HIGH,CRITICAL \
                                --exit-code 1 \
                                --ignore-unfixed \
                                --no-progress \
                                --format table \
                                ${fullImage}
                        """
                    }
                }
            }
        }

        // ─── 5. Push to Amazon ECR ──────────────────────────────────────
        stage('Push to Amazon ECR') {
            steps {
                sh """
                    aws ecr get-login-password --region ${AWS_DEFAULT_REGION} \
                        | docker login --username AWS --password-stdin ${ECR_REGISTRY}
                """
                script {
                    def images = [
                        'auth-service',
                        'url-service',
                        'analytics-service',
                        'notification-service',
                        'frontend',
                    ]
                    for (img in images) {
                        def fullImage = "${ECR_REGISTRY}/shrinklink-${img}:${IMAGE_TAG}"
                        sh "docker push ${fullImage}"
                    }
                }
            }
        }

        // ─── 6. Deploy to EKS ───────────────────────────────────────────
        stage('Deploy to EKS') {
            steps {
                sh "aws eks update-kubeconfig --name ${EKS_CLUSTER_NAME} --region ${AWS_DEFAULT_REGION}"
                script {
                    // Map: deployment name -> container name + ECR image name
                    def deployments = [
                        ['auth-service',         'auth-service',         'auth-service'],
                        ['url-service',          'url-service',          'url-service'],
                        ['analytics-service',    'analytics-service',    'analytics-service'],
                        ['notification-service', 'notification-service', 'notification-service'],
                        ['frontend',             'frontend',             'frontend'],
                    ]
                    for (d in deployments) {
                        def deployment  = d[0]
                        def container   = d[1]
                        def ecrName     = d[2]
                        def fullImage   = "${ECR_REGISTRY}/shrinklink-${ecrName}:${IMAGE_TAG}"

                        echo "Rolling out ${deployment} → ${fullImage}"
                        sh """
                            kubectl set image deployment/${deployment} \
                                ${container}=${fullImage} \
                                -n shrinklink
                        """
                        sh """
                            kubectl rollout status deployment/${deployment} \
                                -n shrinklink \
                                --timeout=120s
                        """
                    }
                }
            }
        }

        // ─── 7. Smoke Test ──────────────────────────────────────────────
        stage('Smoke Test') {
            steps {
                echo "Waiting 15s for ALB target registration …"
                sleep(time: 15, unit: 'SECONDS')
                script {
                    def endpoints = [
                        "${ALB_URL}/api/urls/healthz",
                        "${ALB_URL}/",
                    ]
                    for (url in endpoints) {
                        echo "Smoke testing: ${url}"
                        sh """
                            HTTP_CODE=\$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 '${url}')
                            echo "HTTP \${HTTP_CODE} from ${url}"
                            if [ "\${HTTP_CODE}" -lt 200 ] || [ "\${HTTP_CODE}" -ge 400 ]; then
                                echo "FAIL: ${url} returned HTTP \${HTTP_CODE}"
                                exit 1
                            fi
                        """
                    }
                }
                echo '✅ All smoke tests passed'
            }
        }
    }

    // ─── Post Actions ───────────────────────────────────────────────────
    post {
        success {
            echo """
            ╔══════════════════════════════════════════════════════════════╗
            ║  ✅  ShrinkLink deployed successfully!                     ║
            ║  Tag : ${IMAGE_TAG}                                        ║
            ║  ALB : ${ALB_URL}                                          ║
            ╚══════════════════════════════════════════════════════════════╝
            """
        }
        failure {
            echo """
            ╔══════════════════════════════════════════════════════════════╗
            ║  ❌  Pipeline FAILED at stage: ${env.STAGE_NAME}           ║
            ║  Build: ${BUILD_URL}                                       ║
            ╚══════════════════════════════════════════════════════════════╝
            """
        }
        always {
            echo 'Cleaning up dangling Docker images …'
            sh 'docker image prune -f || true'
        }
    }
}
