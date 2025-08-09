from __future__ import annotations

import os
import re
from typing import Tuple

from anthropic import Anthropic


def _anthropic_client() -> Anthropic:
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key:
        raise RuntimeError("Missing ANTHROPIC_API_KEY env var")
    return Anthropic(api_key=key)


def summarize_ga_csv(csv_text: str) -> str:
    # Tiny heuristic summary to reduce tokens before sending to Claude.
    # In real usage we could compute CTRs, most frequent events, etc.
    lines = [ln for ln in csv_text.splitlines() if ln.strip()]
    header = lines[0] if lines else ""
    sample = "\n".join(lines[1:21])
    return f"Header: {header}\nSample (first 20 rows):\n{sample}"


def generate_instruction_and_code(
    initial_code: str, ga_summary: str, user_goal: str | None
) -> Tuple[str, str]:
    try:
        client = _anthropic_client()
    except Exception:
        # Heuristic fallback without Claude
        gs = ga_summary.lower()
        button_hits = gs.count("button") + gs.count("button_click")
        image_hits = gs.count("image") + gs.count("image_view")
        if image_hits >= button_hits:
            return (
                "Increase primary button size and contrast",
                ".btn { padding: 14px 22px; font-size: 18px; background:#0a66ff; box-shadow:0 2px 8px rgba(10,102,255,.35); }",
            )
        return (
            "Increase product image size and grid spacing",
            ".grid img { width: 100%; height: auto; } .grid { grid-template-columns: repeat(2, 1fr); gap: 20px; }",
        )

    prompt = f"""
Act as a senior frontend engineer and data analyst.

Your tasks:
1) If the user supplied a goal, distill it to a single imperative instruction. If not, infer a sensible UI improvement based on the GA engagement summary.
2) Produce a minimal HTML/CSS/JS snippet showing ONLY the new/changed code needed to implement that instruction.

User goal (optional): {user_goal or 'None provided'}

Google Analytics (GA) engagement summary:
{ga_summary}

Original HTML context (for reference only, do not repeat it):
{initial_code[:40000]}

Return exactly in this format:
INSTRUCTION: <one imperative sentence>
CODE_EDIT:
```
<only the new or edited code>
```
"""

    msg = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1200,
        messages=[{"role": "user", "content": prompt}],
    )

    content_text = "".join([b.text for b in msg.content if hasattr(b, "text")])

    instruction_match = re.search(
        r"INSTRUCTION:\s*(.*?)(?=\nCODE_EDIT:|\n```|$)", content_text, re.DOTALL
    )
    code_match = re.search(
        r"CODE_EDIT:\s*```(?:\w+)?\s*(.*?)\s*```", content_text, re.DOTALL
    )

    if instruction_match and code_match:
        instruction = instruction_match.group(1).strip()
        code_edit = code_match.group(1).strip()
        return instruction, code_edit

    # Fallback: return a safe minimal enhancement
    return (
        "Increase primary call-to-action button size and line-height",
        ".btn { padding: 14px 22px; font-size: 18px; line-height: 1.3; }",
    )


