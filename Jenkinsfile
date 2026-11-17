  pipeline {
    // Configure this label on a Linux agent with Node 24/npm 11, Terraform and AWS CLI v2.
    agent { label 'corp-portal-deploy' }

    options {
        disableConcurrentBuilds()
        timestamps()
        timeout(time: 60, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    parameters {
        choice(name: 'ACTION', choices: ['verify', 'plan', 'deploy'], description: 'verify builds/tests only; plan previews AWS changes; deploy applies and uploads.')
        string(name: 'AWS_ACCOUNT_ID', defaultValue: '', description: 'Expected 12-digit deployment account.')
        string(name: 'AWS_REGION', defaultValue: 'ap-southeast-1', description: 'Frontend S3 region.')
        string(name: 'TF_STATE_BUCKET', defaultValue: '', description: 'Existing private/versioned Terraform state bucket.')
        string(name: 'TF_STATE_REGION', defaultValue: 'ap-southeast-1', description: 'Region of the state bucket.')
        string(name: 'API_BASE_URL', defaultValue: '/api', description: 'Public HTTPS API Gateway URL when available; /api remains unconfigured for now.')
    }

    environment {
        CI = 'true'
        TF_IN_AUTOMATION = 'true'
        TF_INPUT = 'false'
        AWS_PAGER = ''
        AWS_DEFAULT_REGION = "${params.AWS_REGION}"
        TF_VAR_aws_region = "${params.AWS_REGION}"
        TF_VAR_aws_account_id = "${params.AWS_ACCOUNT_ID}"
    }

    stages {
        stage('Select environment from branch') {
            steps {
                script {
                    // Configure the Git branch -> runtime environment mapping here.
                    def environmentsByBranch = ['dev': 'dev', 'prod': 'prod']
                    if (env.CHANGE_ID || env.TAG_NAME) {
                        error('This pipeline is for environment branches, not pull requests or tags. Use a separate verification job for those.')
                    }
                    def selectedEnvironment = environmentsByBranch[env.BRANCH_NAME]
                    if (!selectedEnvironment) {
                        error('Unsupported branch. Configure a Multibranch Pipeline for dev/prod or update environmentsByBranch.')
                    }
                    env.APP_ENV = selectedEnvironment
                    env.TARGET_ENV = selectedEnvironment
                    echo('Branch ' + env.BRANCH_NAME + ' uses environment ' + env.APP_ENV)
                }
            }
        }
        stage('Check deployment settings') {
            steps {
                script {
                    if (params.ACTION != 'verify') {
                        if (!(params.AWS_ACCOUNT_ID ==~ /[0-9]{12}/)) {
                            error('Set AWS_ACCOUNT_ID to the expected 12-digit account.')
                        }
                        if (!(params.TF_STATE_BUCKET ==~ /[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]/)) {
                            error('Set TF_STATE_BUCKET to an existing Terraform state bucket.')
                        }
                    }
                }
            }
        }

        stage('Install and test') {
            steps {
                sh 'npm ci --no-audit --no-fund'
                sh 'npm run format:check'
                sh 'npm run test:deployment'
                sh 'npm test -- --watch=false'
            }
        }

        stage('Build frontend') {
            steps {
                sh 'npm run build:ci -- "$TARGET_ENV"'
                archiveArtifacts artifacts: 'dist/corp-portal-ui/browser/**/*', fingerprint: true
            }
        }

        stage('Validate Terraform') {
            steps {
                sh '''
                    terraform -chdir=infra/terraform fmt -check -recursive
                    terraform -chdir=infra/terraform init -backend=false -input=false -lockfile=readonly
                    terraform -chdir=infra/terraform validate
                '''
            }
        }

        stage('Plan infrastructure') {
            when { expression { params.ACTION != 'verify' } }
            steps {
                // Credentials come from the agent's IAM role / temporary AWS credential chain.
                sh '''
                    set -eu
                    account=$(aws sts get-caller-identity --query Account --output text)
                    test "$account" = "$AWS_ACCOUNT_ID"
                    terraform -chdir=infra/terraform init -reconfigure -input=false -lockfile=readonly \
                        -backend-config="bucket=$TF_STATE_BUCKET" \
                        -backend-config="key=corp-portal/$TARGET_ENV/terraform.tfstate" \
                        -backend-config="region=$TF_STATE_REGION"
                    terraform -chdir=infra/terraform plan -input=false -lock-timeout=5m \
                        -var-file="environments/$TARGET_ENV.tfvars" -out=deployment.tfplan
                '''
            }
        }

        stage('Apply infrastructure') {
            when { expression { params.ACTION == 'deploy' } }
            steps {
                sh 'terraform -chdir=infra/terraform apply -input=false -lock-timeout=5m deployment.tfplan'
            }
        }

        stage('Publish and verify frontend') {
            when { expression { params.ACTION == 'deploy' } }
            steps {
                sh 'npm run deploy:frontend'
            }
        }
    }

    post {
        always {
            // Plans can contain sensitive infrastructure values; do not archive them.
            sh 'rm -f infra/terraform/deployment.tfplan'
        }
    }
}
