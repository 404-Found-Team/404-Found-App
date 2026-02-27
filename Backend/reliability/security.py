import os
import logging
from typing import List
import boto3
from botocore.exceptions import ClientError, NoCredentialsError

logger = logging.getLogger("pipeline_security")
logger.setLevel(logging.INFO)



REQUIRED_ENV_VARS = [
    "AWS_REGION",
    "DATABASE_URL",
    "ENVIRONMENT"
]


def validate_environment() -> None:
    """
    Ensure required environment variables are present.
    Fail fast if missing.
    """
    missing = []

    for var in REQUIRED_ENV_VARS:
        if not os.getenv(var):
            missing.append(var)

    if missing:
        raise EnvironmentError(
            f"Missing required environment variables: {missing}"
        )

    logger.info("Environment variables validated successfully.")



def validate_aws_identity() -> None:
    """
    Validate AWS credentials and identity.
    Ensures IAM role is properly attached.
    """
    try:
        sts = boto3.client("sts")
        identity = sts.get_caller_identity()

        logger.info(
            f"AWS Identity validated: Account {identity['Account']}, "
            f"ARN {identity['Arn']}"
        )

    except NoCredentialsError:
        raise RuntimeError("AWS credentials not found.")
    except ClientError as e:
        raise RuntimeError(f"AWS identity validation failed: {e}")



def validate_cloudwatch_permissions() -> None:
    """
    Attempt to publish a test metric to verify CloudWatch permissions.
    """
    try:
        cloudwatch = boto3.client("cloudwatch")

        cloudwatch.put_metric_data(
            Namespace="GSUDataPipelineSecurityCheck",
            MetricData=[
                {
                    "MetricName": "PermissionCheck",
                    "Value": 1,
                    "Unit": "Count"
                }
            ]
        )

        logger.info("CloudWatch permission validated.")

    except ClientError as e:
        raise RuntimeError(
            f"Missing CloudWatch permissions: {e}"
        )



PIPELINE_DEPENDENCIES = {
    "external_apis": [
        "MARTA API",
        "GSU Parking Webpage"
    ],
    "aws_services": [
        "CloudWatch",
        "IAM",
        "RDS / PostgreSQL"
    ],
    "python_dependencies": [
        "boto3",
        "selenium",
        "httpx",
        "sqlalchemy"
    ]
}


def document_pipeline_behavior() -> dict:
    """
    Returns documentation describing pipeline behavior,
    failure modes, and dependencies.
    """
    return {
        "retry_strategy": "3 attempts with exponential backoff",
        "timeout_policy": "5 second API timeout",
        "failure_modes": [
            "External API timeout",
            "Scraper DOM structure change",
            "Database connection failure",
            "CloudWatch permission error"
        ],
        "recovery_behavior": [
            "Retry transient failures",
            "Log and emit metric on permanent failure",
            "Do not crash entire service"
        ],
        "dependencies": PIPELINE_DEPENDENCIES
    }
