#!/usr/bin/env python3
"""
Autonomous overnight runner for the WebFlux MVP build.

Loops `claude -p` against this repo, one iteration at a time. Each iteration
is a fresh Claude session that reads agent_tasks.md, picks the next [ ] item,
implements it, and checks it off. State lives in agent_tasks.md, so iterations
are independent — no shared in-memory context between runs.

Stops when:
  - agent_tasks.md has no remaining [ ] items, OR
  - MAX_ITERATIONS reached, OR
  - MAX_WALL_CLOCK_HOURS exceeded, OR
  - MAX_BUDGET_USD spent (passed through to claude --max-budget-usd), OR
  - STALL_LIMIT consecutive iterations made no progress on agent_tasks.md, OR
  - Ctrl-C.

Logs land in ./logs/. Tail logs/run.log for a live summary.
"""

import json
import os
import signal
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# --- Config ---------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent
TASKS_FILE = PROJECT_ROOT / "agent_tasks.md"
PLAN_FILE = PROJECT_ROOT / "WebFlux_MVP_Plan.md"
LOG_DIR = PROJECT_ROOT / "logs"
RUN_LOG = LOG_DIR / "run.log"

MAX_ITERATIONS = 200
MAX_WALL_CLOCK_HOURS = 10.0
PER_ITERATION_TIMEOUT_SEC = 60 * 45          # 45 min hard cap per iteration
SLEEP_BETWEEN_ITERATIONS_SEC = 5
STALL_LIMIT = 3                              # bail after N no-progress runs
MAX_BUDGET_USD = float(os.environ.get("CLAUDE_MAX_BUDGET_USD", "75"))
MODEL = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-6")

PROMPT = f"""You are a senior software engineer building a production-grade SaaS codebase
autonomously. You are NOT a shell assistant; your job is to WRITE and MODIFY code.

Source of truth:
  - {PLAN_FILE.name} — full MVP design doc (read sections relevant to the current task)
  - {TASKS_FILE.name} — ordered task checklist; pick the next [ ] item

Rules:
  - Do not ask for clarification. Make reasonable assumptions and proceed.
  - Log every non-trivial assumption to docs/decisions.md (create if missing).
  - Implement ONE [ ] task fully, then mark it [x] in {TASKS_FILE.name}.
  - If the next task is too large, split it into sub-tasks in {TASKS_FILE.name}
    (still under the same phase) and complete the first sub-task this iteration.
  - Always leave the repo in a runnable state. If you add deps, install them.
  - Prefer editing files over creating new ones; do not duplicate existing code.
  - Do not revert or delete other people's work. The existing oracle-funded/
    Next.js app is real product code — integrate with it, don't replace it
    unless the task explicitly calls for replacement.
  - Stage and commit your changes when the task is done with a conventional
    commit message (e.g. "feat(auth): add JWT middleware"). Do not push.

Start now: read {TASKS_FILE.name}, pick the next [ ] task, implement it.
"""

# --- Helpers --------------------------------------------------------------

def log(msg: str) -> None:
    line = f"[{datetime.now(timezone.utc).isoformat(timespec='seconds')}] {msg}"
    print(line, flush=True)
    LOG_DIR.mkdir(exist_ok=True)
    with RUN_LOG.open("a") as f:
        f.write(line + "\n")


def count_open_tasks() -> int:
    if not TASKS_FILE.exists():
        return -1
    text = TASKS_FILE.read_text()
    return text.count("[ ]")


def tasks_snapshot() -> str:
    """Hash-equivalent snapshot of tasks file to detect 'no progress'."""
    if not TASKS_FILE.exists():
        return ""
    return TASKS_FILE.read_text()


def run_claude(iteration: int) -> tuple[int, dict | None]:
    """Run one claude -p iteration. Returns (exit_code, parsed_json_or_None)."""
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    iter_log = LOG_DIR / f"iter-{iteration:03d}-{ts}.log"

    cmd = [
        "claude",
        "-p",
        "--dangerously-skip-permissions",
        "--add-dir", str(PROJECT_ROOT),
        "--model", MODEL,
        "--max-budget-usd", str(MAX_BUDGET_USD),
        "--output-format", "json",
        "--permission-mode", "bypassPermissions",
        PROMPT,
    ]

    log(f"iter {iteration}: spawning claude (log -> {iter_log.name})")
    parsed: dict | None = None
    try:
        proc = subprocess.run(
            cmd,
            cwd=str(PROJECT_ROOT),
            capture_output=True,
            text=True,
            timeout=PER_ITERATION_TIMEOUT_SEC,
        )
    except subprocess.TimeoutExpired as e:
        iter_log.write_text(
            f"TIMEOUT after {PER_ITERATION_TIMEOUT_SEC}s\n\n"
            f"--- partial stdout ---\n{e.stdout or ''}\n"
            f"--- partial stderr ---\n{e.stderr or ''}\n"
        )
        log(f"iter {iteration}: TIMEOUT after {PER_ITERATION_TIMEOUT_SEC}s")
        return 124, None

    iter_log.write_text(
        f"exit={proc.returncode}\n\n"
        f"--- stdout ---\n{proc.stdout}\n"
        f"--- stderr ---\n{proc.stderr}\n"
    )

    if proc.stdout.strip():
        try:
            parsed = json.loads(proc.stdout)
        except json.JSONDecodeError:
            parsed = None

    if proc.returncode != 0:
        log(f"iter {iteration}: claude exited {proc.returncode} (see {iter_log.name})")
    return proc.returncode, parsed


# --- Main loop ------------------------------------------------------------

def main() -> int:
    LOG_DIR.mkdir(exist_ok=True)
    log("=" * 60)
    log(f"autonomous run starting | model={MODEL} | budget=${MAX_BUDGET_USD}")
    log(f"open tasks at start: {count_open_tasks()}")

    if not TASKS_FILE.exists():
        log(f"FATAL: {TASKS_FILE} missing — nothing to do.")
        return 1

    start = time.monotonic()
    stall = 0
    total_cost = 0.0

    for i in range(1, MAX_ITERATIONS + 1):
        elapsed_h = (time.monotonic() - start) / 3600
        if elapsed_h > MAX_WALL_CLOCK_HOURS:
            log(f"halt: wall-clock cap hit ({elapsed_h:.2f}h > {MAX_WALL_CLOCK_HOURS}h)")
            break

        remaining = count_open_tasks()
        if remaining == 0:
            log("halt: no remaining [ ] tasks in agent_tasks.md — DONE")
            break

        before = tasks_snapshot()
        _, parsed = run_claude(i)

        # Track cost if claude returned structured output.
        if parsed and isinstance(parsed, dict):
            cost = parsed.get("total_cost_usd") or parsed.get("cost_usd")
            if isinstance(cost, (int, float)):
                total_cost += float(cost)

        after = tasks_snapshot()
        progressed = after != before
        if progressed:
            stall = 0
            log(f"iter {i}: progressed | open tasks now: {count_open_tasks()} | spent ~${total_cost:.2f}")
        else:
            stall += 1
            log(f"iter {i}: NO PROGRESS ({stall}/{STALL_LIMIT}) | spent ~${total_cost:.2f}")
            if stall >= STALL_LIMIT:
                log(f"halt: {STALL_LIMIT} consecutive no-progress iterations")
                break

        if total_cost >= MAX_BUDGET_USD:
            log(f"halt: budget cap hit (~${total_cost:.2f} >= ${MAX_BUDGET_USD})")
            break

        time.sleep(SLEEP_BETWEEN_ITERATIONS_SEC)
    else:
        log(f"halt: MAX_ITERATIONS ({MAX_ITERATIONS}) reached")

    log(f"final open tasks: {count_open_tasks()} | total spent ~${total_cost:.2f}")
    log("=" * 60)
    return 0


if __name__ == "__main__":
    def _graceful(signum, _frame):
        log(f"received signal {signum} — exiting")
        sys.exit(130)

    signal.signal(signal.SIGINT, _graceful)
    signal.signal(signal.SIGTERM, _graceful)
    sys.exit(main())
