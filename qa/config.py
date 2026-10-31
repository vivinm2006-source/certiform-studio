"""
Configuration for CertiForm Studio QA Automation & Load Testing.
"""
import os
from pathlib import Path

QA_DIR = Path(__file__).resolve().parent
RESULTS_DIR = QA_DIR / "results"
FIXTURES_DIR = QA_DIR / "fixtures"

RESULTS_DIR.mkdir(parents=True, exist_ok=True)
FIXTURES_DIR.mkdir(parents=True, exist_ok=True)

# Target environment configuration
DEFAULT_LOCAL_URL = "http://127.0.0.1:8000"
LIVE_PRODUCTION_URL = "https://certiform-studio.vercel.app"

# Selectable execution target
TARGET_URL = os.getenv("TEST_TARGET_URL", DEFAULT_LOCAL_URL).rstrip("/")

# Load Testing Stages (Virtual Users)
LOAD_STAGES = [
    {"stage": 1, "vus": 10, "duration_seconds": 5, "name": "Baseline Verification"},
    {"stage": 2, "vus": 50, "duration_seconds": 6, "name": "Low Concurrency"},
    {"stage": 3, "vus": 100, "duration_seconds": 8, "name": "Medium Concurrency"},
    {"stage": 4, "vus": 250, "duration_seconds": 8, "name": "Moderate Enterprise Load"},
    {"stage": 5, "vus": 500, "duration_seconds": 10, "name": "High Enterprise Concurrency"},
    {"stage": 6, "vus": 1000, "duration_seconds": 12, "name": "Peak 1,000 Concurrent Users"},
    {"stage": 7, "vus": 1000, "duration_seconds": 15, "name": "Sustained Peak Load"},
    {"stage": 8, "vus": 50, "duration_seconds": 5, "name": "Recovery & Cool Down"}
]

# Acceptance Criteria Thresholds
ACCEPTANCE_CRITERIA = {
    "p95_response_time_sec": 2.0,
    "p99_response_time_sec": 5.0,
    "max_5xx_error_rate_pct": 1.0,
    "min_successful_operations_pct": 99.0,
    "zero_cross_user_leakage": True,
    "zero_mapping_errors": True,
    "zero_duplicate_columns": True
}

# Production Safety Limits & Circuit Breaker
CIRCUIT_BREAKER = {
    "max_error_percentage": 10.0,
    "max_consecutive_timeouts": 15,
    "max_request_latency_sec": 12.0
}

CHROME_EXECUTABLE = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
