# agenttrace/core/vfs_bridge.py
from typing import Dict, Any

# The single source of truth for the virtual filesystem.
# Maps absolute_path -> content (str or bytes)
VFS_FILES: Dict[str, Any] = {}

import os

def clear_vfs():
    """Wipe all virtual files."""
    VFS_FILES.clear()

def vfs_write(path: str, content: Any):
    """Authoritative write to the VFS. Always normalizes path."""
    VFS_FILES[os.path.abspath(os.path.normpath(path))] = content

def vfs_read(path: str) -> Any:
    """Authoritative read from the VFS. Always normalizes path."""
    return VFS_FILES.get(os.path.abspath(os.path.normpath(path)))
