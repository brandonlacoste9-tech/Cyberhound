import os
import sys

# Add the current directory to sys.path to allow importing from cyberhound
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from cyberhound.hermes_worker import process_scout_task

print("🚀 Starting Live Data Test...")

test_task = {
    "id": "test_agent_task_999",
    "payload": {
        "niche": "High-ticket AI consulting for law firms",
        "market": "New York",
        "opportunity_id": "test_opp_999"
    }
}

try:
    print(f"📦 Injecting test task into process_scout_task: {test_task['payload']}")
    process_scout_task(test_task)
    print("🏁 Test script finished execution.")
except Exception as e:
    print(f"❌ Test script encountered an error: {e}")
