# Services Module – Monitoring & Security

This folder contains utility modules for **monitoring** and **security** within the commuter app.  
These modules are designed to be used with FastAPI or other Python services and include AWS CloudWatch integration for metrics.

 Purpose

### `monitoring.py`
- Tracks function execution (success, failure, and latency).  
- Sends metrics to AWS CloudWatch under the namespace `GSUDataPipeline`.  
- Logs events in JSON format for centralized logging and observability.

### `security.py`
- Validates critical environment variables and AWS credentials.  
- Checks IAM roles and permissions for accessing AWS resources.  
- Provides helper functions for identity validation and secure pipeline operations.

## Installation

1. Python version: **3.11**  
2. Required packages:
```bash
pip install boto3 pytest fastapi uvicorn
