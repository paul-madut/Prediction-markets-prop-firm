import subprocess
import time

SYSTEM_PROMPT = """
You are a senior staff engineer building a production-grade SaaS.

You are operating autonomously.

Rules:
- Do not ask for clarification
- Make reasonable assumptions and proceed
- Do not repeat completed work
- Always progress forward
- Always leave the repo in a runnable state
- Write clean, modular, scalable code

Execution strategy:
- Always pick the next incomplete task from agent_tasks.md
- Mark tasks complete when done
- Log decisions in /docs/decisions.md
- Commit after each completed task
"""

TASK_PROMPT = """
Continue building the WebFlux platform.

Follow agent_tasks.md strictly.
"""

FULL_PROMPT = SYSTEM_PROMPT + "\n\n" + TASK_PROMPT


def run_claude():
    result = subprocess.run(
        ["claude-code", "run", FULL_PROMPT],
        capture_output=True,
        text=True
    )

    print(result.stdout)
    if result.stderr:
        print("ERROR:", result.stderr)


while True:
    print("🚀 Running Claude...\n")
    run_claude()
    print("\n⏳ Sleeping...\n")
    time.sleep(5)