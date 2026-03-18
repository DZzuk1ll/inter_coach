import base64
import os
import re
import zipfile
from dataclasses import dataclass, field
from pathlib import Path

import httpx
import structlog

from app.config import get_settings
from app.utils.file_filter import MAX_FILE_SIZE, should_include

log = structlog.get_logger()

MAX_FILES = 200


@dataclass
class RepoContent:
    tree: list[str] = field(default_factory=list)
    files: dict[str, str] = field(default_factory=dict)  # path -> content
    readme: str | None = None
    entry_configs: dict[str, str] = field(default_factory=dict)  # filename -> content


def _parse_github_url(url: str) -> tuple[str, str]:
    pattern = r"github\.com/([^/]+)/([^/]+)"
    match = re.search(pattern, url.rstrip("/"))
    if not match:
        raise ValueError(f"Invalid GitHub URL: {url}")
    owner = match.group(1)
    repo = match.group(2).removesuffix(".git")
    return owner, repo


async def read_github(url: str) -> RepoContent:
    settings = get_settings()
    token = settings.github.token
    owner, repo = _parse_github_url(url)

    headers = {"Accept": "application/vnd.github.v3+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    content = RepoContent()

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Get default branch
        repo_resp = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}",
            headers=headers,
        )
        repo_resp.raise_for_status()
        default_branch = repo_resp.json().get("default_branch", "main")

        # Get file tree
        tree_resp = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/git/trees/{default_branch}?recursive=1",
            headers=headers,
        )
        tree_resp.raise_for_status()
        tree_data = tree_resp.json()

        all_paths = []
        files_to_fetch = []

        for item in tree_data.get("tree", []):
            path = item["path"]
            all_paths.append(path)

            if item["type"] != "blob":
                continue
            if not should_include(path):
                continue

            size = item.get("size", 0)
            if size > MAX_FILE_SIZE:
                continue

            files_to_fetch.append(path)

        content.tree = all_paths

        # Limit total files
        files_to_fetch = files_to_fetch[:MAX_FILES]

        await log.ainfo(
            "github_fetch",
            owner=owner,
            repo=repo,
            total_files=len(all_paths),
            fetching=len(files_to_fetch),
        )

        # Fetch file contents
        for path in files_to_fetch:
            try:
                file_resp = await client.get(
                    f"https://api.github.com/repos/{owner}/{repo}/contents/{path}?ref={default_branch}",
                    headers=headers,
                )
                file_resp.raise_for_status()
                file_data = file_resp.json()

                if file_data.get("encoding") == "base64":
                    file_content = base64.b64decode(file_data["content"]).decode("utf-8", errors="replace")
                else:
                    file_content = file_data.get("content", "")

                content.files[path] = file_content

                # Identify README and config files
                name = Path(path).name.lower()
                if name.startswith("readme"):
                    content.readme = file_content

                if Path(path).name in {
                    "package.json", "pyproject.toml", "go.mod",
                    "Cargo.toml", "pom.xml", "requirements.txt",
                }:
                    content.entry_configs[Path(path).name] = file_content

            except Exception as e:
                await log.awarning("github_file_fetch_failed", path=path, error=str(e))

    return content


async def read_zip(file_path: str) -> RepoContent:
    content = RepoContent()

    if not zipfile.is_zipfile(file_path):
        raise ValueError("Invalid zip file")

    with zipfile.ZipFile(file_path, "r") as zf:
        all_names = zf.namelist()

        # Build tree (strip common prefix if all files share one)
        parts = [n.split("/") for n in all_names if not n.endswith("/")]
        if parts and all(p[0] == parts[0][0] for p in parts if p):
            prefix = parts[0][0] + "/"
        else:
            prefix = ""

        files_fetched = 0
        for name in all_names:
            # Normalize path
            rel_path = name[len(prefix):] if prefix and name.startswith(prefix) else name

            if not rel_path or rel_path.endswith("/"):
                content.tree.append(rel_path.rstrip("/"))
                continue

            content.tree.append(rel_path)

            if not should_include(rel_path):
                continue

            info = zf.getinfo(name)
            if info.file_size > MAX_FILE_SIZE:
                continue

            if files_fetched >= MAX_FILES:
                break

            try:
                file_content = zf.read(name).decode("utf-8", errors="replace")
                content.files[rel_path] = file_content
                files_fetched += 1

                fname = Path(rel_path).name.lower()
                if fname.startswith("readme"):
                    content.readme = file_content

                if Path(rel_path).name in {
                    "package.json", "pyproject.toml", "go.mod",
                    "Cargo.toml", "pom.xml", "requirements.txt",
                }:
                    content.entry_configs[Path(rel_path).name] = file_content

            except Exception as e:
                await log.awarning("zip_file_read_failed", path=rel_path, error=str(e))

    await log.ainfo(
        "zip_read",
        total_entries=len(all_names),
        files_read=len(content.files),
    )

    return content
