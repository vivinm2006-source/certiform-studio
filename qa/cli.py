"""
Command Line Interface for CertiForm Studio QA Automation & Load Testing.
Usage:
  python -m qa.cli smoke [--target URL]
  python -m qa.cli functional [--target URL]
  python -m qa.cli load [--vus COUNT] [--target URL]
  python -m qa.cli full [--target URL]
"""
import sys
import argparse
import asyncio
from qa.config import DEFAULT_LOCAL_URL, LIVE_PRODUCTION_URL, LOAD_STAGES
from qa.autonomous_qa_agent import AutonomousQAAgent

def parse_args():
    parser = argparse.ArgumentParser(description="CertiForm Studio QA Automation & Load Testing CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # Smoke command
    smoke_p = subparsers.add_parser("smoke", help="Execute API smoke test suite")
    smoke_p.add_argument("--target", default=DEFAULT_LOCAL_URL, help="Target URL (default: http://127.0.0.1:8000)")
    
    # Functional browser command
    func_p = subparsers.add_parser("functional", help="Execute browser automated functional regression suite")
    func_p.add_argument("--target", default=DEFAULT_LOCAL_URL, help="Target URL (default: http://127.0.0.1:8000)")
    
    # Load command
    load_p = subparsers.add_parser("load", help="Execute staged virtual user load tests")
    load_p.add_argument("--vus", type=int, default=1000, help="Max virtual users (default: 1000)")
    load_p.add_argument("--target", default=DEFAULT_LOCAL_URL, help="Target URL (default: http://127.0.0.1:8000)")
    
    # Full command
    full_p = subparsers.add_parser("full", help="Execute complete Autonomous QA & 1,000-User Load Suite")
    full_p.add_argument("--target", default=DEFAULT_LOCAL_URL, help="Target URL (default: http://127.0.0.1:8000)")
    
    return parser.parse_args()

async def main():
    args = parse_args()
    agent = AutonomousQAAgent(target_url=args.target)
    
    if args.command == "smoke":
        await agent.verify_target_availability()
        res = await agent.run_smoke_tests()
        sys.exit(0 if res.get("suite_passed") else 1)
        
    elif args.command == "functional":
        await agent.verify_target_availability()
        res = await agent.run_browser_functional_tests()
        sys.exit(0 if res.get("suite_passed") else 1)
        
    elif args.command == "load":
        await agent.verify_target_availability()
        stages = [s for s in LOAD_STAGES if s["vus"] <= args.vus]
        res = await agent.run_load_stages(stages)
        passed = all(s.get("passed_acceptance_criteria") for s in res)
        sys.exit(0 if passed else 1)
        
    elif args.command == "full":
        res = await agent.execute_full_autonomous_qa()
        passed = res.get("smoke_suite", {}).get("suite_passed") and \
                 res.get("browser_suite", {}).get("suite_passed") and \
                 all(s.get("passed_acceptance_criteria") for s in res.get("load_suite", []))
        sys.exit(0 if passed else 1)

if __name__ == "__main__":
    asyncio.run(main())
