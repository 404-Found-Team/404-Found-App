from reliability.security import (
    validate_environment,
    validate_aws_identity,
    validate_cloudwatch_permissions,
)

@app.on_event("startup")
def reliability_startup_checks():
    validate_environment()
    validate_aws_identity()
    validate_cloudwatch_permissions()
