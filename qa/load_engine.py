"""
High-performance asynchronous load testing engine simulating up to 1,000 concurrent users.
Executes controlled stages, captures per-request timings, and calculates statistical percentiles.
"""
import time
import asyncio
import math
import random
from typing import List, Dict, Any, Tuple
import httpx
from qa.config import ACCEPTANCE_CRITERIA, CIRCUIT_BREAKER
from qa.user_journeys import run_virtual_user_journey

def calculate_percentiles(durations: List[float]) -> Dict[str, float]:
    """Calculate min, median, p90, p95, p99, and max from latency durations."""
    if not durations:
        return {"min": 0, "p50": 0, "p90": 0, "p95": 0, "p99": 0, "max": 0, "avg": 0}
        
    sorted_d = sorted(durations)
    n = len(sorted_d)
    
    def get_p(p: float) -> float:
        idx = min(int(math.ceil(p * n)) - 1, n - 1)
        return sorted_d[max(0, idx)]
        
    return {
        "min": round(sorted_d[0], 2),
        "p50": round(get_p(0.50), 2),
        "p90": round(get_p(0.90), 2),
        "p95": round(get_p(0.95), 2),
        "p99": round(get_p(0.99), 2),
        "max": round(sorted_d[-1], 2),
        "avg": round(sum(sorted_d) / n, 2)
    }

class LoadTestEngine:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.stage_results: List[Dict[str, Any]] = []

    async def execute_virtual_user(
        self, 
        client: httpx.AsyncClient, 
        user_id: int, 
        end_time: float, 
        results_accumulator: List[Dict[str, Any]],
        sem: asyncio.Semaphore,
        total_vus: int = 1,
        duration_seconds: int = 5
    ):
        """Simulate an active virtual user running continuous realistic workflows until end_time."""
        async with sem:
            # Stagger initial requests to establish steady ramp and prevent connection starvation
            if total_vus > 15:
                ramp_delay = (user_id / total_vus) * min(2.5, duration_seconds * 0.3)
                await asyncio.sleep(ramp_delay)

            while time.perf_counter() < end_time:
                try:
                    records = await run_virtual_user_journey(client, self.base_url, user_id)
                    results_accumulator.extend(records)
                except httpx.TimeoutException:
                    results_accumulator.append({
                        "action": "timeout",
                        "duration_ms": 10000.0,
                        "status_code": 504,
                        "success": False,
                        "user_id": user_id,
                        "error": "TimeoutException"
                    })
                except Exception as e:
                    results_accumulator.append({
                        "action": "network_exception",
                        "duration_ms": 1000.0,
                        "status_code": 500,
                        "success": False,
                        "user_id": user_id,
                        "error": str(e)
                    })
                # Realistic user think-time between workflow iterations (250ms - 600ms)
                await asyncio.sleep(random.uniform(0.25, 0.60))

    async def run_stage(self, vus: int, duration_seconds: int, stage_num: int, stage_name: str) -> Dict[str, Any]:
        """Execute a single workload stage with specified virtual users and duration."""
        print(f"\n=======================================================")
        print(f"STAGE {stage_num}: {stage_name.upper()} ({vus} CONCURRENT USERS)")
        print(f"Target URL: {self.base_url} | Duration: {duration_seconds}s")
        print(f"=======================================================")
        
        limits = httpx.Limits(max_connections=max(1200, vus + 200), max_keepalive_connections=max(600, vus))
        timeout = httpx.Timeout(15.0, connect=8.0)
        
        stage_records: List[Dict[str, Any]] = []
        sem = asyncio.Semaphore(vus)
        
        t_start = time.perf_counter()
        t_end = t_start + duration_seconds
        
        async with httpx.AsyncClient(limits=limits, timeout=timeout, headers={"User-Agent": "CertiForm-LoadBot/1.0"}) as client:
            tasks = [
                self.execute_virtual_user(client, uid, t_end, stage_records, sem, vus, duration_seconds)
                for uid in range(vus)
            ]
            await asyncio.gather(*tasks)
            
        t_total = time.perf_counter() - t_start
        
        # Analyze stage metrics
        total_requests = len(stage_records)
        successful_requests = sum(1 for r in stage_records if r.get("success") is True)
        failed_requests = total_requests - successful_requests
        
        c_4xx = sum(1 for r in stage_records if 400 <= r.get("status_code", 0) < 500)
        c_5xx = sum(1 for r in stage_records if r.get("status_code", 0) >= 500)
        
        error_rate_pct = round((failed_requests / total_requests * 100), 2) if total_requests > 0 else 0.0
        c_5xx_rate_pct = round((c_5xx / total_requests * 100), 2) if total_requests > 0 else 0.0
        rps = round(total_requests / t_total, 2) if t_total > 0 else 0.0
        
        durations = [r["duration_ms"] for r in stage_records]
        percentiles = calculate_percentiles(durations)
        
        # Evaluate against Acceptance Criteria
        passed_p95 = percentiles["p95"] <= (ACCEPTANCE_CRITERIA["p95_response_time_sec"] * 1000)
        passed_p99 = percentiles["p99"] <= (ACCEPTANCE_CRITERIA["p99_response_time_sec"] * 1000)
        passed_5xx = c_5xx_rate_pct <= ACCEPTANCE_CRITERIA["max_5xx_error_rate_pct"]
        passed_success = (100.0 - error_rate_pct) >= ACCEPTANCE_CRITERIA["min_successful_operations_pct"]
        stage_passed = passed_p95 and passed_p99 and passed_5xx and passed_success
        
        # Per-Action Breakdown
        action_stats = {}
        for r in stage_records:
            act = r.get("action", "unknown")
            if act not in action_stats:
                action_stats[act] = {"count": 0, "success": 0, "durations": []}
            action_stats[act]["count"] += 1
            if r.get("success"):
                action_stats[act]["success"] += 1
            action_stats[act]["durations"].append(r["duration_ms"])
            
        action_summary = {}
        for act, data in action_stats.items():
            action_summary[act] = {
                "count": data["count"],
                "success_rate_pct": round(data["success"] / data["count"] * 100, 1) if data["count"] > 0 else 0,
                "p50_ms": calculate_percentiles(data["durations"])["p50"],
                "p95_ms": calculate_percentiles(data["durations"])["p95"]
            }
            
        stage_summary = {
            "stage_number": stage_num,
            "stage_name": stage_name,
            "target_vus": vus,
            "actual_duration_sec": round(t_total, 2),
            "total_requests": total_requests,
            "successful_requests": successful_requests,
            "failed_requests": failed_requests,
            "http_4xx": c_4xx,
            "http_5xx": c_5xx,
            "error_rate_pct": error_rate_pct,
            "http_5xx_rate_pct": c_5xx_rate_pct,
            "throughput_rps": rps,
            "latency_ms": percentiles,
            "action_breakdown": action_summary,
            "passed_acceptance_criteria": stage_passed,
            "criteria_checks": {
                "p95_under_2s": passed_p95,
                "p99_under_5s": passed_p99,
                "5xx_under_1pct": passed_5xx,
                "success_rate_over_99pct": passed_success
            }
        }
        
        self.stage_results.append(stage_summary)
        
        print(f"Results for Stage {stage_num} ({vus} VUs):")
        print(f"  Total Requests: {total_requests} | RPS: {rps} | Errors: {failed_requests} ({error_rate_pct}%)")
        print(f"  Latency: p50={percentiles['p50']}ms | p90={percentiles['p90']}ms | p95={percentiles['p95']}ms | p99={percentiles['p99']}ms")
        print(f"  Acceptance Check: {'PASSED' if stage_passed else 'FAILED'}")
        if failed_requests > 0:
            failed_breakdown = {act: data for act, data in action_summary.items() if data['success_rate_pct'] < 100.0}
            print(f"  Failed Breakdown: {failed_breakdown}")
        
        # Check circuit breaker
        if error_rate_pct > CIRCUIT_BREAKER["max_error_percentage"]:
            print(f"[CIRCUIT BREAKER TRIGGERED] Error rate {error_rate_pct}% exceeded safety ceiling {CIRCUIT_BREAKER['max_error_percentage']}%. Halting further load escalation.")
            stage_summary["circuit_breaker_tripped"] = True
            
        return stage_summary

    async def run_full_suite(self, stages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Run all configured stages sequentially with recovery periods."""
        results = []
        for s in stages:
            res = await self.run_stage(s["vus"], s["duration_seconds"], s["stage"], s["name"])
            results.append(res)
            if res.get("circuit_breaker_tripped"):
                print("Stopping subsequent stages due to circuit breaker trip.")
                break
            # Short cool-down between stages
            await asyncio.sleep(1.0)
        return results
