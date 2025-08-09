from __future__ import annotations

import os
import sys
from typing import Dict, Any

import requests
from git import Repo, GitCommandError


def push_local_repo(
    local_path: str,
    repo_owner: str,
    repo_name: str,
    branch: str,
    user: str,
    token: str,
) -> Dict[str, Any]:
    if not user or not token:
        return {"ok": False, "error": "Missing GH user or token"}

    # Validate PAT
    u = "https://api.github.com/user"
    r = requests.get(u, headers={"Authorization": f"token {token}"}, timeout=15)
    if r.status_code != 200:
        return {"ok": False, "error": "PAT check failed"}

    repo = Repo(local_path)
    remote_url = f"https://{user}:{token}@github.com/{repo_owner}/{repo_name}.git"

    if "origin" not in [rm.name for rm in repo.remotes]:
        repo.create_remote("origin", remote_url)
    else:
        repo.remote("origin").set_url(remote_url)

    repo.git.add(A=True)
    if repo.is_dirty(index=True, working_tree=True, untracked_files=True):
        repo.index.commit("Automated commit via orchestrator")

    try:
        repo.git.push("origin", branch, set_upstream=True)
        return {"ok": True, "branch": branch}
    except GitCommandError as e:
        msg = str(e)
        if "403" in msg or "The requested URL returned error: 403" in msg:
            return {
                "ok": False,
                "error": "403 Forbidden",
                "hint": (
                    "Ensure PAT has write scope and SSO authorized; confirm push permission"
                ),
                "remote": remote_url.replace(token, "***"),
            }
        return {"ok": False, "error": msg}


