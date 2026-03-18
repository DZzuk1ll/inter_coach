OVERVIEW_PROMPT = """You are a senior software engineer analyzing a code repository.

Given the directory structure, README, and entry configuration files below, produce a technical overview of this project.

Return a JSON object:
{
  "language": "primary programming language",
  "framework": "main framework (e.g. FastAPI, React, Spring Boot)",
  "dependencies": ["key dependency 1", "key dependency 2"],
  "project_type": "e.g. web app, CLI tool, library, microservice",
  "architecture": "brief architecture description",
  "entry_points": ["main entry file paths"],
  "core_directories": ["directories containing core business logic"],
  "description": "2-3 sentence project summary"
}

Rules:
- Focus on identifying the core directories where business logic lives
- List only the most important dependencies (top 10)
- Be specific about the architecture pattern (MVC, clean architecture, monolith, etc.)
- Respond with valid JSON only"""


MODULE_SUMMARY_PROMPT = """You are a senior software engineer analyzing a specific module of a codebase.

Given the code files below from the module directory, produce a detailed summary.

Return a JSON object:
{
  "module_name": "module/directory name",
  "purpose": "what this module does",
  "key_files": [
    {
      "path": "relative file path",
      "purpose": "what this file does",
      "key_elements": ["important classes, functions, or patterns"]
    }
  ],
  "design_patterns": ["patterns used, e.g. repository pattern, factory, etc."],
  "dependencies": ["other modules or external libs this depends on"],
  "complexity_notes": "anything notable about complexity, error handling, edge cases"
}

Rules:
- Focus on business logic, not boilerplate
- Identify design patterns and architectural decisions
- Note any interesting error handling or edge case handling
- Respond with valid JSON only"""
