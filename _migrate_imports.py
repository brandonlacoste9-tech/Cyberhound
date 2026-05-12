import os, re

base = r"C:\Users\booboo\cyberhound\Cyberhound\cyberhound"

replacements = {
    "autonomy_engine.py": [
        (r"from email_envoy_v2 import", "from cyberhound.email_envoy_v2 import"),
        (r"from deal_tracker import", "from cyberhound.deal_tracker import"),
        (r"from config import", "from cyberhound.config import"),
        (r"from response_tracker_v2 import", "from cyberhound.response_tracker_v2 import"),
        (r"from sequence_scheduler import", "from cyberhound.sequence_scheduler import"),
    ],
    "closing_loop.py": [
        (r"from deal_tracker import", "from cyberhound.deal_tracker import"),
        (r"from email_envoy_v2 import", "from cyberhound.email_envoy_v2 import"),
        (r"from response_tracker_v2 import", "from cyberhound.response_tracker_v2 import"),
        (r"from config import", "from cyberhound.config import"),
    ],
    "email_envoy.py": [
        (r"^from config import", "from cyberhound.config import"),
    ],
    "email_envoy_v2.py": [
        (r"^from config import", "from cyberhound.config import"),
        (r"^from email_templates import", "from cyberhound.email_templates import"),
        (r"^from deal_tracker import", "from cyberhound.deal_tracker import"),
    ],
    "response_tracker.py": [
        (r"^from config import", "from cyberhound.config import"),
    ],
    "response_tracker_v2.py": [
        (r"^from config import", "from cyberhound.config import"),
        (r"^from deal_tracker import", "from cyberhound.deal_tracker import"),
    ],
    "sequence_scheduler.py": [
        (r"^from deal_tracker import", "from cyberhound.deal_tracker import"),
        (r"^from email_envoy_v2 import", "from cyberhound.email_envoy_v2 import"),
    ],
}

for filename, rules in replacements.items():
    filepath = os.path.join(base, filename)
    if not os.path.exists(filepath):
        print(f"MISSING: {filename}")
        continue

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    original = content
    for pattern, replacement in rules:
        content = re.sub(pattern, replacement, content, flags=re.MULTILINE)

    if content != original:
        with open(filepath, "w", encoding="utf-8", newline="") as f:
            f.write(content)
        print(f"UPDATED: {filename}")
    else:
        print(f"NO CHANGE (already done): {filename}")

print("\nDone!")
