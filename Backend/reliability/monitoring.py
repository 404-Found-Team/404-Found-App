import boto3
import logging
import time
from functools import wraps

logger = logging.getLogger(__name__)


def monitor_pipeline(service_name: str, metric_prefix: str):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            cloudwatch = boto3.client("cloudwatch")

            try:
                result = func(*args, **kwargs)

                cloudwatch.put_metric_data(
                    Namespace="404FoundReliability",
                    MetricData=[
                        {
                            "MetricName": f"{metric_prefix}Success",
                            "Dimensions": [
                                {"Name": "Service", "Value": service_name}
                            ],
                            "Value": 1,
                            "Unit": "Count",
                        }
                    ],
                )

                return result

            except Exception as e:
                cloudwatch.put_metric_data(
                    Namespace="404FoundReliability",
                    MetricData=[
                        {
                            "MetricName": f"{metric_prefix}Failure",
                            "Dimensions": [
                                {"Name": "Service", "Value": service_name}
                            ],
                            "Value": 1,
                            "Unit": "Count",
                        }
                    ],
                )
                logger.error(f"Error in {service_name}: {str(e)}")
                raise

            finally:
                latency = (time.time() - start_time) * 1000
                cloudwatch.put_metric_data(
                    Namespace="404FoundReliability",
                    MetricData=[
                        {
                            "MetricName": f"{metric_prefix}Latency",
                            "Dimensions": [
                                {"Name": "Service", "Value": service_name}
                            ],
                            "Value": latency,
                            "Unit": "Milliseconds",
                        }
                    ],
                )

        return wrapper

    return decorator
