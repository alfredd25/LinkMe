pipeline {
    agent any
    
    environment {
        AWS_REGION = 'us-east-1'
        ECR_REGISTRY = '121728644131.dkr.ecr.us-east-1.amazonaws.com'
        FRONTEND_REPO = 'shrinklink-frontend'
        CLUSTER_NAME = 'shrinklink-eks'
    }
    
    stages {
        stage('Build Frontend Image') {
            steps {
                script {
                    // Automatically generate a new version tag based on the Jenkins build number
                    env.IMAGE_TAG = "v1.0.${BUILD_NUMBER}"
                    sh "docker build -t ${ECR_REGISTRY}/${FRONTEND_REPO}:${IMAGE_TAG} ./frontend"
                }
            }
        }
        
        stage('Push to Amazon ECR') {
            steps {
                // This injects the aws-credentials you created in the Jenkins dashboard
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-credentials',
                    accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                    secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
                ]]) {
                    sh """
                        aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}
                        docker push ${ECR_REGISTRY}/${FRONTEND_REPO}:${IMAGE_TAG}
                    """
                }
            }
        }
        
        stage('Deploy to Amazon EKS') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-credentials',
                    accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                    secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
                ]]) {
                    sh """
                        # Authenticate kubectl with your specific EKS cluster
                        aws eks update-kubeconfig --region ${AWS_REGION} --name ${CLUSTER_NAME}
                        
                        # Trigger the rolling update with the new image tag
                        kubectl set image deployment/frontend frontend=${ECR_REGISTRY}/${FRONTEND_REPO}:${IMAGE_TAG} -n shrinklink
                        kubectl rollout status deployment/frontend -n shrinklink
                    """
                }
            }
        }
    }
}