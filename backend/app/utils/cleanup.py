import shutil
from pathlib import Path

import structlog

log = structlog.get_logger()


async def cleanup_temp_dir(path: str) -> None:
    try:
        p = Path(path)
        if p.exists() and p.is_dir():
            shutil.rmtree(p)
            await log.ainfo("temp_dir_cleaned", path=path)
    except Exception as e:
        await log.awarning("temp_dir_cleanup_failed", path=path, error=str(e))


async def cleanup_temp_file(path: str) -> None:
    try:
        p = Path(path)
        if p.exists() and p.is_file():
            p.unlink()
            await log.ainfo("temp_file_cleaned", path=path)
    except Exception as e:
        await log.awarning("temp_file_cleanup_failed", path=path, error=str(e))
