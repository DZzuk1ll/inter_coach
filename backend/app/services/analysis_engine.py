import structlog

from app.prompts.code_analysis import MODULE_SUMMARY_PROMPT, OVERVIEW_PROMPT
from app.prompts.triangulation import QUESTION_POOL_PROMPT, TRIANGULATION_PROMPT
from app.services.llm_client import LLMClient
from app.services.repo_reader import RepoContent

log = structlog.get_logger()


def _build_tree_text(tree: list[str], max_lines: int = 200) -> str:
    lines = []
    for path in sorted(tree)[:max_lines]:
        lines.append(path)
    if len(tree) > max_lines:
        lines.append(f"... and {len(tree) - max_lines} more files")
    return "\n".join(lines)


def _select_core_modules(
    overview: dict,
    repo: RepoContent,
    resume_profile: dict,
) -> list[tuple[str, dict[str, str]]]:
    """Select core module directories and their files for detailed analysis."""
    core_dirs = overview.get("core_directories", [])

    # Also consider directories related to resume project descriptions
    resume_keywords = set()
    for project in resume_profile.get("projects", []):
        desc = project.get("description", "").lower()
        for word in desc.split():
            if len(word) > 3:
                resume_keywords.add(word)

    modules = []
    for dir_name in core_dirs[:5]:  # Analyze up to 5 core modules
        module_files = {}
        for path, content in repo.files.items():
            if path.startswith(dir_name) or f"/{dir_name}/" in f"/{path}":
                module_files[path] = content
        if module_files:
            modules.append((dir_name, module_files))

    return modules


def _truncate_file_content(content: str, max_lines: int = 150) -> str:
    lines = content.split("\n")
    if len(lines) <= max_lines:
        return content
    return "\n".join(lines[:max_lines]) + f"\n... ({len(lines) - max_lines} more lines)"


async def run_analysis(
    repo: RepoContent,
    resume_text: str,
    resume_profile: dict,
    jd_text: str,
    llm_client: LLMClient,
) -> dict:
    """Run the full analysis pipeline: overview → module summaries → triangulation → question pool."""

    await log.ainfo("analysis_start")

    # Step 1: Overview analysis
    tree_text = _build_tree_text(repo.tree)
    overview_input = f"""## Directory Structure
{tree_text}

## README
{repo.readme or '(no README found)'}

## Configuration Files
"""
    for name, content in repo.entry_configs.items():
        overview_input += f"\n### {name}\n```\n{_truncate_file_content(content, 50)}\n```\n"

    overview = await llm_client.chat_json(
        [
            {"role": "system", "content": OVERVIEW_PROMPT},
            {"role": "user", "content": overview_input},
        ],
        temperature=0.3,
    )
    await log.ainfo("analysis_overview_done", language=overview.get("language"))

    # Step 2: Module-level summaries
    modules = _select_core_modules(overview, repo, resume_profile)
    module_summaries = []

    for dir_name, module_files in modules:
        module_input = f"## Module: {dir_name}\n\n"
        for path, content in list(module_files.items())[:15]:  # Max 15 files per module
            module_input += f"### {path}\n```\n{_truncate_file_content(content)}\n```\n\n"

        summary = await llm_client.chat_json(
            [
                {"role": "system", "content": MODULE_SUMMARY_PROMPT},
                {"role": "user", "content": module_input},
            ],
            temperature=0.3,
        )
        module_summaries.append(summary)

    await log.ainfo("analysis_modules_done", count=len(module_summaries))

    # Step 3: Triangulation
    triangulation_input = f"""## Resume
{resume_text}

## Resume Structured Profile
{_format_resume_profile(resume_profile)}

## Project Overview
Language: {overview.get('language')}
Framework: {overview.get('framework')}
Architecture: {overview.get('architecture')}
Description: {overview.get('description')}

## Module Summaries
"""
    for ms in module_summaries:
        triangulation_input += f"\n### {ms.get('module_name', 'unknown')}\n"
        triangulation_input += f"Purpose: {ms.get('purpose', '')}\n"
        for kf in ms.get("key_files", []):
            triangulation_input += f"- {kf.get('path', '')}: {kf.get('purpose', '')}\n"

    triangulation_input += f"\n## Job Description\n{jd_text}"

    triangulation = await llm_client.chat_json(
        [
            {"role": "system", "content": TRIANGULATION_PROMPT},
            {"role": "user", "content": triangulation_input},
        ],
        temperature=0.5,
    )
    await log.ainfo(
        "analysis_triangulation_done",
        matches=len(triangulation.get("matches", [])),
        gaps=len(triangulation.get("gaps", [])),
    )

    # Step 4: Question pool generation
    # Collect key code snippets for question context
    code_context = _extract_code_context(repo, overview, module_summaries)

    question_input = f"""## Triangulation Analysis
{_format_triangulation(triangulation)}

## Project Overview
{overview.get('description', '')}
Architecture: {overview.get('architecture', '')}
Framework: {overview.get('framework', '')}

## Key Code Context
{_format_code_context(code_context)}

## Job Description
{jd_text}
"""

    question_pool = await llm_client.chat_json(
        [
            {"role": "system", "content": QUESTION_POOL_PROMPT},
            {"role": "user", "content": question_input},
        ],
        temperature=0.6,
    )
    await log.ainfo(
        "analysis_questions_done",
        total=len(question_pool.get("questions", [])),
    )

    # Assemble final result
    result = {
        "overview": overview,
        "module_summaries": module_summaries,
        "triangulation": triangulation,
        "question_pool": question_pool.get("questions", []),
        "code_context": code_context,
    }

    await log.ainfo("analysis_complete")
    return result


def _format_resume_profile(profile: dict) -> str:
    lines = []
    for project in profile.get("projects", []):
        lines.append(f"- {project.get('name', '')}: {project.get('description', '')}")
        lines.append(f"  Tech: {', '.join(project.get('tech_stack', []))}")
    lines.append(f"\nSkills: {', '.join(profile.get('skills', []))}")
    return "\n".join(lines)


def _format_triangulation(tri: dict) -> str:
    lines = []
    for m in tri.get("matches", []):
        lines.append(f"[Match] {m.get('topic', '')}: {m.get('resume_claim', '')}")
    for e in tri.get("exaggerations", []):
        lines.append(f"[Exaggeration] {e.get('topic', '')}: {e.get('resume_claim', '')}")
    for g in tri.get("gaps", []):
        lines.append(f"[Gap] {g.get('topic', '')}: {g.get('jd_requirement', '')}")
    for h in tri.get("highlights", []):
        lines.append(f"[Highlight] {h.get('topic', '')}: {h.get('code_evidence', '')}")
    return "\n".join(lines)


def _extract_code_context(
    repo: RepoContent,
    overview: dict,
    module_summaries: list[dict],
) -> dict[str, str]:
    """Extract key code snippets for interview reference."""
    context = {}

    # Collect key files from module summaries
    key_paths = set()
    for ms in module_summaries:
        for kf in ms.get("key_files", []):
            path = kf.get("path", "")
            if path:
                key_paths.add(path)

    # Also include entry points
    for ep in overview.get("entry_points", []):
        key_paths.add(ep)

    # Get content for key files
    for path in key_paths:
        if path in repo.files:
            context[path] = _truncate_file_content(repo.files[path], 100)

    return context


def _format_code_context(context: dict[str, str]) -> str:
    lines = []
    for path, content in list(context.items())[:10]:
        lines.append(f"### {path}\n```\n{content}\n```\n")
    return "\n".join(lines)
