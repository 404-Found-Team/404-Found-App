# services/monitoring.py
import logging
import time
import boto3
from functools import wraps
import json

# Configure logger
logger = logging.getLogger("monitoring")
logger.setLevel(logging.INFO)


class CloudWatchMetrics:
    """
    CloudWatchMetrics client with lazy initialization.
    Client is only created when put_metric is called.
    """
    def __init__(self):
        self.client = None  # Do not create client on import

    def _get_client(self):
        if self.client is None:
            # Lazily create boto3 client with default region
            self.client = boto3.client("cloudwatch", region_name="us-east-1")
        return self.client

    def put_metric(self, metric_name, value, unit="Count"):
        client = self._get_client()
        client.put_metric_data(
            Namespace="GSUDataPipeline",
            MetricData=[{
                "MetricName": metric_name,
                "Value": value,
                "Unit": unit
            }]
        )


def monitor_pipeline(service_name: str, metric_prefix: str):
    """
    Decorator to monitor function execution and send CloudWatch metrics
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start = time.time()
            try:
                # Call the actual function
                result = func(*args, **kwargs)
                duration = (time.time() - start) * 1000  # milliseconds

                # Log success
                logger.info(json.dumps({
                    "event": "success",
                    "service": service_name,
                    "duration_ms": duration
                }))

                # Send metrics to CloudWatch
                metrics = CloudWatchMetrics()
                metrics.put_metric(f"{metric_prefix}Success", 1)
                metrics.put_metric(f"{metric_prefix}Latency", duration, "Milliseconds")

                return result

            except Exception as e:
                duration = (time.time() - start) * 1000

                # Log failure
                logger.error(json.dumps({
                    "event": "failure",
                    "service": service_name,
                    "error": str(e),
                    "duration_ms": duration
                }))

                metrics = CloudWatchMetrics()
                metrics.put_metric(f"{metric_prefix}Failure", 1)
                raise

        return wrapper
    return decorator
