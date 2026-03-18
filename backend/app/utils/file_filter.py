from pathlib import PurePosixPath

IGNORED_DIRS = {
    "node_modules", ".git", "__pycache__", ".venv", "venv",
    "dist", "build", ".next", "vendor", ".tox", ".mypy_cache",
    ".pytest_cache", "htmlcov", ".eggs", "egg-info",
}

IGNORED_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".bmp", ".webp",
    ".woff", ".woff2", ".ttf", ".eot", ".otf",
    ".mp4", ".mp3", ".wav", ".avi", ".mov",
    ".exe", ".dll", ".so", ".dylib", ".o", ".a",
    ".pyc", ".pyo", ".class",
    ".zip", ".tar", ".gz", ".bz2", ".rar", ".7z",
    ".lock", ".bin", ".dat", ".db", ".sqlite",
}

CODE_EXTENSIONS = {
    ".py", ".js", ".ts", ".tsx", ".jsx",
    ".go", ".java", ".rs", ".rb", ".php",
    ".c", ".cpp", ".h", ".hpp",
    ".swift", ".kt", ".scala",
    ".sql", ".sh", ".bash",
    ".yaml", ".yml", ".json", ".toml",
    ".md", ".html", ".css", ".scss", ".less",
    ".vue", ".svelte",
}

CONFIG_FILES = {
    "package.json", "pyproject.toml", "go.mod", "Cargo.toml",
    "pom.xml", "build.gradle", "Gemfile",
    "Dockerfile", "docker-compose.yml", "docker-compose.yaml",
    ".env.example", "Makefile", "CMakeLists.txt",
    "tsconfig.json", "next.config.js", "next.config.mjs",
    "tailwind.config.js", "tailwind.config.ts",
    "vite.config.ts", "webpack.config.js",
    "requirements.txt", "setup.py", "setup.cfg",
    "alembic.ini",
}

MAX_FILE_SIZE = 100_000  # 100KB per file


def should_include(filepath: str) -> bool:
    path = PurePosixPath(filepath)

    # Check ignored directories
    for part in path.parts:
        if part in IGNORED_DIRS:
            return False

    # Check ignored extensions
    if path.suffix.lower() in IGNORED_EXTENSIONS:
        return False

    # Check if it's a code/config file
    if path.name in CONFIG_FILES:
        return True

    if path.suffix.lower() in CODE_EXTENSIONS:
        return True

    return False
