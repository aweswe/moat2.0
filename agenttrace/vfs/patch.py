import builtins
import os
import contextlib
from typing import IO, Any
from .manager import VFSManager

# Save originals
_original_open = builtins.open
_original_remove = os.remove
_original_rename = os.rename
_original_exists = os.path.exists
_original_makedirs = os.makedirs
_original_mkdir = os.mkdir
_original_listdir = os.listdir
_original_isdir = os.path.isdir
_original_rmdir = os.rmdir

class VFSFileObj:
    """Mock file object for VFS with complete file-like interface."""
    def __init__(self, path, mode, vfs):
        self.path = path
        self.mode = mode
        self.vfs = vfs
        self.closed = False
        self._pos = 0
        self._buffer = ""
        
    def write(self, content):
        if self.closed:
            raise ValueError("I/O operation on closed file.")
        self.vfs.write_file(self.path, content)
        return len(content) if isinstance(content, (str, bytes)) else 0
        
    def read(self, size=-1):
        if self.closed:
            raise ValueError("I/O operation on closed file.")
        content = self.vfs.read_file(self.path) or ""
        if size < 0:
            return content[self._pos:]
        result = content[self._pos:self._pos + size]
        self._pos += len(result)
        return result

    def readline(self, limit=-1):
        """Read a single line from the file."""
        content = self.vfs.read_file(self.path) or ""
        remaining = content[self._pos:]
        newline_idx = remaining.find('\n')
        if newline_idx == -1:
            line = remaining
        else:
            line = remaining[:newline_idx + 1]
        if limit > 0:
            line = line[:limit]
        self._pos += len(line)
        return line

    def readlines(self, hint=-1):
        """Read all lines from the file."""
        lines = []
        while True:
            line = self.readline()
            if not line:
                break
            lines.append(line)
        return lines

    def writelines(self, lines):
        """Write a list of lines to the file."""
        for line in lines:
            self.write(line)

    def seek(self, pos, whence=0):
        """Set file position."""
        if whence == 0:
            self._pos = pos
        elif whence == 1:
            self._pos += pos
        elif whence == 2:
            content = self.vfs.read_file(self.path) or ""
            self._pos = len(content) + pos
        return self._pos

    def tell(self):
        """Return current file position."""
        return self._pos

    def flush(self):
        """Flush write buffers (no-op for VFS)."""
        pass

    def fileno(self):
        """Return file descriptor (not supported by VFS)."""
        raise OSError("VFS does not support fileno()")

    def isatty(self):
        """Return whether this is a TTY (always False for VFS)."""
        return False

    def truncate(self, size=None):
        """Truncate file to specified size."""
        content = self.vfs.read_file(self.path) or ""
        if size is None:
            size = self._pos
        self.vfs.write_file(self.path, content[:size])
        return size

    def close(self):
        self.closed = True

    def __enter__(self):
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

def _vfs_open(file, mode="r", buffering=-1, encoding=None, errors=None, newline=None, closefd=True, opener=None):
    # CRITICAL: Exclude .agenttrace paths from VFS to allow tracer to write events to disk
    file_str = os.path.abspath(os.path.normpath(str(file)))
    if ".agenttrace" in file_str or "agenttrace" in file_str:
        return _original_open(file, mode, buffering, encoding, errors, newline, closefd, opener)
    
    vfs = VFSManager.get_instance()
    
    # REPLAY MODE: We still return a VFSFileObj.
    # The writes/reads on this object will trigger VFSManager which triggers events.
    # We do NOT record 'file_open' itself as it creates an object, not a result.

    if "w" in mode or "a" in mode or "+" in mode:
        return VFSFileObj(file_str, mode, vfs)
    
    if vfs.exists(file_str):
        return VFSFileObj(file_str, mode, vfs)
        
    return _original_open(file, mode, buffering, encoding, errors, newline, closefd, opener)

def _vfs_remove(path, *, dir_fd=None):
    # CRITICAL: Exclude .agenttrace paths to allow tracer to cleanup old traces
    path_str = os.path.abspath(os.path.normpath(str(path)))
    if ".agenttrace" in path_str or "agenttrace" in path_str:
        return _original_remove(path, dir_fd=dir_fd)

    vfs = VFSManager.get_instance()
    
    # REPLAY MODE: Redirect to tracer and return
    from agenttrace.core.tracer import Tracer, Mode
    t = Tracer.get_instance()
    if t.mode == Mode.REPLAY:
        return t.record_event("file_remove", {"path": path_str})

    if vfs.exists(path_str):
        vfs.remove(path_str)
    else:
        # Fallback only if we want to support deleting real files (Dangerous!)
        # Safety: Block real deletions in this mode
        raise FileNotFoundError(f"VFS: File not found and deletion blocked on host: {path}")

def _vfs_exists(path):
    path_str = os.path.abspath(os.path.normpath(str(path)))
    if ".agenttrace" in path_str or "agenttrace" in path_str:
        return _original_exists(path)

    vfs = VFSManager.get_instance()
    
    # REPLAY MODE: Redirect to tracer and return
    from agenttrace.core.tracer import Tracer, Mode
    t = Tracer.get_instance()
    if t.mode == Mode.REPLAY:
        return t.record_event("file_exists", {"path": path_str})

    # RECORD MODE
    exists_in_vfs = vfs.exists(path_str)
    result = exists_in_vfs or _original_exists(path)
    t.record_event("file_exists", {"path": path_str, "result": result})
    return result

def _vfs_rename(src, dst, *, src_dir_fd=None, dst_dir_fd=None):
    src_str = os.path.abspath(os.path.normpath(str(src)))
    dst_str = os.path.abspath(os.path.normpath(str(dst)))
    
    # Bypass for internal files
    if "agenttrace" in src_str or "agenttrace" in dst_str:
        return _original_rename(src, dst, src_dir_fd=src_dir_fd, dst_dir_fd=dst_dir_fd)
        
    vfs = VFSManager.get_instance()
    
    # REPLAY MODE: Redirect to tracer and return
    from agenttrace.core.tracer import Tracer, Mode
    t = Tracer.get_instance()
    if t.mode == Mode.REPLAY:
        return t.record_event("file_rename", {"old": src_str, "new": dst_str})

    if vfs.exists(src_str):
        return vfs.rename(src_str, dst_str)
    
    return _original_rename(src, dst, src_dir_fd=src_dir_fd, dst_dir_fd=dst_dir_fd)

def _vfs_makedirs(name, mode=0o777, exist_ok=False):
    name_str = os.path.abspath(os.path.normpath(str(name)))
    if "agenttrace" in name_str:
        return _original_makedirs(name, mode, exist_ok)
    
    # REPLAY MODE: Redirect to tracer and return
    from agenttrace.core.tracer import Tracer, Mode
    t = Tracer.get_instance()
    if t.mode == Mode.REPLAY:
        return t.record_event("makedirs", {"path": name_str, "exist_ok": exist_ok})

    VFSManager.get_instance().makedirs(name_str, exist_ok)

def _vfs_mkdir(path, mode=0o777, *, dir_fd=None):
    path_str = os.path.abspath(os.path.normpath(str(path)))
    if "agenttrace" in path_str:
        return _original_mkdir(path, mode, dir_fd=dir_fd)
    
    # REPLAY MODE: Redirect to tracer and return (maps to makedirs for simplicity)
    from agenttrace.core.tracer import Tracer, Mode
    t = Tracer.get_instance()
    if t.mode == Mode.REPLAY:
        return t.record_event("makedirs", {"path": path_str, "exist_ok": True})

    VFSManager.get_instance().makedirs(path_str, exist_ok=True)

def _vfs_rmdir(path, *, dir_fd=None):
    path_str = os.path.abspath(os.path.normpath(str(path)))
    if "agenttrace" in path_str:
        return _original_rmdir(path, dir_fd=dir_fd)
    
    # REPLAY MODE: Redirect to tracer and return
    from agenttrace.core.tracer import Tracer, Mode
    t = Tracer.get_instance()
    if t.mode == Mode.REPLAY:
        return t.record_event("rmdir", {"path": path_str})

    VFSManager.get_instance().rmdir(path_str)

def _vfs_listdir(path='.'):
    path_str = os.path.abspath(os.path.normpath(str(path)))
    if "agenttrace" in path_str:
        return _original_listdir(path)
        
    vfs = VFSManager.get_instance()
    # Merge virtual and real (simple version)
    v_files = vfs.listdir(path_str)
    try:
        r_files = _original_listdir(path)
    except:
        r_files = []
    return list(set(v_files + r_files))

def _vfs_isdir(path):
    path_str = os.path.abspath(os.path.normpath(str(path)))
    if "agenttrace" in path_str:
        return _original_isdir(path)
        
    vfs = VFSManager.get_instance()

    # REPLAY MODE: Redirect to tracer and return
    from agenttrace.core.tracer import Tracer, Mode
    t = Tracer.get_instance()
    if t.mode == Mode.REPLAY:
        return t.record_event("file_isdir", {"path": path_str})

    # RECORD MODE
    # In VFS, directories are implicit if any file has that prefix
    result = False
    if vfs.exists(path_str):
        # Check if any virtual file exists in this directory
        for f in vfs.files:
            if f.startswith(path_str + os.sep):
                result = True
                break
    
    if not result:
        result = _original_isdir(path)
        
    t.record_event("file_isdir", {"path": path_str, "result": result})
    return result

@contextlib.contextmanager
def patch_io():
    """Context manager to intercept I/O calls."""
    builtins.open = _vfs_open
    os.remove = _vfs_remove
    os.rename = _vfs_rename
    os.makedirs = _vfs_makedirs
    os.mkdir = _vfs_mkdir
    os.listdir = _vfs_listdir
    os.path.exists = _vfs_exists
    os.path.isdir = _vfs_isdir
    os.rmdir = _vfs_rmdir
    
    try:
        yield
    finally:
        builtins.open = _original_open
        os.remove = _original_remove
        os.rename = _original_rename
        os.makedirs = _original_makedirs
        os.mkdir = _original_mkdir
        os.listdir = _original_listdir
        os.path.exists = _original_exists
        os.path.isdir = _original_isdir
        os.rmdir = _original_rmdir
