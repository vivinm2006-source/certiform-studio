"""
Automated Defect & Performance Bottleneck Analyzer.
Inspects load testing and browser regression results, verifies SLA compliance,
detects resource saturation, and identifies actionable root causes.
"""
from typing import Dict, Any, List
from qa.config import ACCEPTANCE_CRITERIA

class DefectAnalyzer:
    @staticmethod
    def analyze_load_results(stage_summaries: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Exhaustively inspect all stages and flag any SLA violations or bottlenecks."""
        findings = []
        bottlenecks = []
        sla_compliance = {}
        
        for stage in stage_summaries:
            s_num = stage["stage_number"]
            vus = stage["target_vus"]
            lat = stage["latency_ms"]
            p95 = lat.get("p95", 0)
            p99 = lat.get("p99", 0)
            err_pct = stage.get("error_rate_pct", 0)
            c5xx_pct = stage.get("http_5xx_rate_pct", 0)
            rps = stage.get("throughput_rps", 0)
            
            stage_pass = True
            reasons = []
            
            if p95 > (ACCEPTANCE_CRITERIA["p95_response_time_sec"] * 1000):
                stage_pass = False
                reasons.append(f"p95 latency ({p95}ms) exceeded SLA threshold ({ACCEPTANCE_CRITERIA['p95_response_time_sec']*1000}ms)")
                bottlenecks.append({
                    "stage": s_num,
                    "vus": vus,
                    "type": "HIGH_P95_LATENCY",
                    "value_ms": p95,
                    "threshold_ms": ACCEPTANCE_CRITERIA["p95_response_time_sec"] * 1000
                })
                
            if p99 > (ACCEPTANCE_CRITERIA["p99_response_time_sec"] * 1000):
                stage_pass = False
                reasons.append(f"p99 latency ({p99}ms) exceeded SLA threshold ({ACCEPTANCE_CRITERIA['p99_response_time_sec']*1000}ms)")
                bottlenecks.append({
                    "stage": s_num,
                    "vus": vus,
                    "type": "HIGH_P99_LATENCY",
                    "value_ms": p99,
                    "threshold_ms": ACCEPTANCE_CRITERIA["p99_response_time_sec"] * 1000
                })
                
            if c5xx_pct > ACCEPTANCE_CRITERIA["max_5xx_error_rate_pct"]:
                stage_pass = False
                reasons.append(f"5xx server error rate ({c5xx_pct}%) exceeded threshold ({ACCEPTANCE_CRITERIA['max_5xx_error_rate_pct']}%)")
                findings.append({
                    "stage": s_num,
                    "vus": vus,
                    "severity": "CRITICAL",
                    "issue": f"Server 5xx error surge under {vus} VUs"
                })
                
            sla_compliance[f"stage_{s_num}_{vus}_vus"] = {
                "passed": stage_pass,
                "reasons": reasons,
                "p50_ms": lat.get("p50"),
                "p95_ms": p95,
                "p99_ms": p99,
                "rps": rps,
                "error_rate_pct": err_pct
            }
            
            # Action-level bottleneck analysis
            actions = stage.get("action_breakdown", {})
            for act_name, act_meta in actions.items():
                if act_meta.get("p95_ms", 0) > 3000:
                    bottlenecks.append({
                        "stage": s_num,
                        "vus": vus,
                        "action": act_name,
                        "p95_ms": act_meta.get("p95_ms"),
                        "recommendation": f"Action {act_name} experienced elevated p95 latency under {vus} VUs."
                    })
                    
        return {
            "overall_status": "PASSED" if all(v["passed"] for v in sla_compliance.values()) else "DEFECTS_DETECTED",
            "sla_compliance_per_stage": sla_compliance,
            "detected_bottlenecks": bottlenecks,
            "critical_findings": findings
        }
