from __future__ import annotations

import os
import io
import json
import shutil
import tempfile
from pathlib import Path
from typing import Optional, Dict, Any

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from git import Repo, GitCommandError

from .services.claude import (
    summarize_ga_csv,
    generate_instruction_and_code,
)
from .services.morph import merge_code_with_morph


load_dotenv()  # Load variables from orchestrator/.env if present

APP_PORT = int(os.getenv("ORCH_PORT", "8001"))
APP_HOST = os.getenv("ORCH_HOST", "127.0.0.1")

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

MOCK_GA_PATH = DATA_DIR / "mock_ga.csv"
SAMPLE_HTML_PATH = DATA_DIR / "sample_site.html"


def ensure_seed_files() -> None:
    if not MOCK_GA_PATH.exists():
        MOCK_GA_PATH.write_text(
            """
date,event_name,event_category,event_label,value
2025-01-01,button_click,engagement,add_to_cart,34
2025-01-01,image_view,engagement,hero_image,212
2025-01-02,button_click,engagement,checkout,12
2025-01-02,image_view,engagement,product_image,198
2025-01-03,button_click,engagement,add_to_cart,28
2025-01-03,image_view,engagement,hero_image,240
""".strip()
        )

    if not SAMPLE_HTML_PATH.exists():
        SAMPLE_HTML_PATH.write_text(
            """
<!doctype html>
<html lang=\"en\">
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>Sample Boutique</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; }
      header { background: #111; color: #fff; padding: 20px; }
      .hero { display: grid; place-items: center; height: 50vh; background: #fafafa; }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding: 24px; }
      .card { border: 1px solid #eee; padding: 12px; }
      .btn { background: #0070f3; color: #fff; padding: 10px 16px; border-radius: 6px; border: 0; cursor: pointer; }
    </style>
  </head>
  <body>
    <header>
      <h1>Elegance — Women's Clothing</h1>
    </header>
    <section class=\"hero\">
      <div>
        <h2>Discover the new collection</h2>
        <p>Hand‑picked pieces to elevate your style.</p>
        <button class=\"btn\">Shop Now</button>
      </div>
    </section>
    <section class=\"grid\">
      <div class=\"card\"><img src=\"https://picsum.photos/seed/1/400/240\" alt=\"Look 1\" /><p>Look 1</p></div>
      <div class=\"card\"><img src=\"https://picsum.photos/seed/2/400/240\" alt=\"Look 2\" /><p>Look 2</p></div>
      <div class=\"card\"><img src=\"https://picsum.photos/seed/3/400/240\" alt=\"Look 3\" /><p>Look 3</p></div>
    </section>
  </body>
</html>
""".strip()
        )


ensure_seed_files()


class ConfigureRequest(BaseModel):
    token: str = Field(..., description="GitHub PAT (not persisted to disk)")
    repo_owner: str
    repo_name: str
    branch: str = "main"
    website_url: Optional[str] = None
    analytics_property: Optional[str] = None
    agent_name: str
    schedule_minutes: Optional[int] = Field(
        default=None, description="Interval minutes for periodic review"
    )
    file_path: Optional[str] = Field(
        default="simple_site.html",
        description="Target file path within repo to update or create",
    )


class ReviewRequest(BaseModel):
    user_goal: Optional[str] = None
    # Optional: inline CSV text or URL. If none, use bundled mock.
    csv_text: Optional[str] = None
    csv_url: Optional[str] = None


class OrchestratorState(BaseModel):
    token: str
    gh_user: str
    repo_owner: str
    repo_name: str
    branch: str
    website_url: Optional[str]
    analytics_property: Optional[str]
    agent_name: str
    schedule_minutes: Optional[int]
    file_path: str


app = FastAPI(title="SEO Agent Orchestrator", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_scheduler: Optional[BackgroundScheduler] = None
_state: Optional[OrchestratorState] = None


def _validate_pat(token: str) -> str:
    resp = requests.get(
        "https://api.github.com/user",
        headers={"Authorization": f"token {token}"},
        timeout=15,
    )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail="GitHub PAT validation failed. Check scopes and SSO authorization.",
        )
    data = resp.json()
    login = data.get("login") or ""
    if not login:
        raise HTTPException(status_code=400, detail="Unable to determine GitHub username from PAT")
    return login


def _clone_or_prepare_repo(state: OrchestratorState) -> Path:
    temp_dir = Path(tempfile.mkdtemp(prefix="seo-agent-repo-"))
    remote_url = (
        f"https://{state.gh_user}:{state.token}@github.com/"
        f"{state.repo_owner}/{state.repo_name}.git"
    )
    try:
        Repo.clone_from(remote_url, temp_dir, branch=state.branch)
    except GitCommandError as e:
        # If branch doesn't exist, clone default then checkout new branch
        repo = Repo.clone_from(remote_url, temp_dir)
        new_branch = repo.create_head(state.branch)
        repo.head.reference = new_branch
        repo.head.reset(index=True, working_tree=True)
    return temp_dir


def _load_source_html(state: OrchestratorState) -> str:
    # Prefer live website if provided
    if state.website_url:
        try:
            r = requests.get(state.website_url, timeout=20)
            if r.status_code == 200 and r.text:
                return r.text
        except Exception:
            pass
    # Fallback to local sample
    return SAMPLE_HTML_PATH.read_text(encoding="utf-8")


def _load_csv_text(req: ReviewRequest) -> str:
    if req.csv_text:
        return req.csv_text
    if req.csv_url:
        try:
            r = requests.get(req.csv_url, timeout=20)
            if r.status_code == 200:
                return r.text
        except Exception:
            pass
    return MOCK_GA_PATH.read_text(encoding="utf-8")


def _commit_and_push(
    repo_dir: Path, branch: str, file_rel_path: str, content: str, commit_msg: str
) -> Dict[str, Any]:
    repo = Repo(repo_dir)
    target_path = repo_dir / file_rel_path
    target_path.parent.mkdir(parents=True, exist_ok=True)
    target_path.write_text(content, encoding="utf-8")

    repo.git.add(A=True)
    if repo.is_dirty(index=True, working_tree=True, untracked_files=True):
        repo.index.commit(commit_msg)

    try:
        origin = repo.remote("origin")
    except ValueError:
        origin = repo.create_remote("origin")

    try:
        repo.git.push("origin", branch, set_upstream=True)
        return {"pushed": True, "branch": branch, "path": file_rel_path}
    except GitCommandError as e:
        return {"pushed": False, "error": str(e)}


def _run_review(state: OrchestratorState, req: Optional[ReviewRequest] = None) -> Dict[str, Any]:
    source_html = _load_source_html(state)
    csv_text = _load_csv_text(req or ReviewRequest())
    ga_summary = summarize_ga_csv(csv_text)

    instruction, code_edit = generate_instruction_and_code(
        initial_code=source_html,
        ga_summary=ga_summary,
        user_goal=(req.user_goal if req else None),
    )

    merged_code = merge_code_with_morph(
        initial_code=source_html,
        instruction=instruction,
        code_edit=code_edit,
    )

    # Push to GitHub
    repo_dir = _clone_or_prepare_repo(state)
    try:
        result = _commit_and_push(
            repo_dir=repo_dir,
            branch=state.branch,
            file_rel_path=state.file_path or "optimized_site.html",
            content=merged_code,
            commit_msg=f"Automated UI enhancement via {state.agent_name}",
        )
    finally:
        shutil.rmtree(repo_dir, ignore_errors=True)

    return {
        "instruction": instruction,
        "file_path": state.file_path,
        "ga_summary": ga_summary,
        "push": result,
    }


@app.post("/configure")
def configure(req: ConfigureRequest):
    global _state, _scheduler
    gh_user = _validate_pat(req.token)

    payload = req.model_dump()
    payload["gh_user"] = gh_user
    _state = OrchestratorState(**payload)

    # Setup or reset scheduler
    if _scheduler is None:
        _scheduler = BackgroundScheduler(daemon=True)
        _scheduler.start()
    else:
        for job in _scheduler.get_jobs():
            job.remove()

    if _state.schedule_minutes and _state.schedule_minutes > 0:
        _scheduler.add_job(
            lambda: _run_review(_state),
            trigger=IntervalTrigger(minutes=_state.schedule_minutes),
            id="periodic_review",
            replace_existing=True,
        )

    return {"configured": True, "scheduled": bool(_state.schedule_minutes)}


@app.post("/review")
def review(req: ReviewRequest):
    if _state is None:
        raise HTTPException(status_code=400, detail="Agent not configured")
    try:
        result = _run_review(_state, req)
        # Avoid returning raw code; return only a small artifact
        return {
            "ok": True,
            "instruction": result["instruction"],
            "file_path": result["file_path"],
            "push": result["push"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/status")
def status():
    return {
        "configured": _state is not None,
        "scheduled": (_state.schedule_minutes > 0) if _state else False,
        "agent": _state.agent_name if _state else None,
        "gh_user": _state.gh_user if _state else None,
        "repo": f"{_state.repo_owner}/{_state.repo_name}" if _state else None,
        "branch": _state.branch if _state else None,
    }


