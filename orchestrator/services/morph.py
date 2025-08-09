from __future__ import annotations

import os
from openai import OpenAI


def _morph_client() -> OpenAI:
    key = os.getenv("MORPH_API_KEY")
    if not key:
        # In absence of Morph, we will fallback to naive merge
        raise RuntimeError("Missing MORPH_API_KEY env var")
    return OpenAI(api_key=key, base_url="https://api.morphllm.com/v1")


def merge_code_with_morph(initial_code: str, instruction: str, code_edit: str) -> str:
    try:
        client = _morph_client()
        resp = client.chat.completions.create(
            model="morph-v3-large",
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"<instruction>{instruction}</instruction>\n"
                        f"<code>{initial_code}</code>\n"
                        f"<update>{code_edit}</update>"
                    ),
                }
            ],
        )

        final_code = resp.choices[0].message.content
        return final_code
    except Exception:
        # Fallback: naive injection of CSS into <head>, or append at top
        if "</head>" in initial_code:
            injected = initial_code.replace(
                "</head>", f"\n<style>\n{code_edit}\n</style>\n</head>", 1
            )
            return injected
        return f"<style>\n{code_edit}\n</style>\n{initial_code}"


