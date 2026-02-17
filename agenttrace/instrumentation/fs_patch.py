import os
import io
import fnmatch
from typing import List, Any
from agenttrace.core.tracer import Tracer, Mode, ReplayPhase
from agenttrace.core.vfs_bridge import VFS_FILES, vfs_read, vfs_write

# In-memory file system for REPLAY mode is now provided by vfs_bridge.VFS_FILES

# Locals to store original functions
_original_open = None
_original_os_path_exists = None
_original_os_path_isfile = None
_original_os_listdir = None
_original_os_scandir = None
_original_glob_glob = None

def _get_vfs_path(path: str) -> str:
    """Normalize path for VFS lookup."""
    return os.path.abspath(os.path.normpath(path))

def _vfs_open(file, mode='r', buffering=-1, encoding=None, errors=None, newline=None, closefd=True, opener=None):
    """Custom open() that uses in-memory VFS in REPLAY mode."""
    tracer = Tracer.get_instance()
    
    if tracer.mode == Mode.OFF:
        return _original_open(file, mode, buffering, encoding, errors, newline, closefd, opener)
    
    # RECORD/REPLAY: use virtual filesystem
    filepath = _get_vfs_path(file)
    
    # Allow access to system/library files
    if '.agenttrace' in filepath or 'site-packages' in filepath or '__pycache__' in filepath:
        return _original_open(file, mode, buffering, encoding, errors, newline, closefd, opener)
    
    is_read = 'r' in mode and 'w' not in mode and 'a' not in mode and '+' not in mode
    is_write = 'w' in mode or 'x' in mode
    is_append = 'a' in mode
    
    if is_read:
        # In REPLAY mode, we ONLY serve from VFS if we are in the LIVE phase.
        # This prevents reading from VFS during APPLY phase (when deltas are being loaded)
        # or after CLEANUP (when tracer is stopped).
        if tracer.mode == Mode.REPLAY and tracer.replay_phase != ReplayPhase.LIVE:
            # Fall back to real FS for early/late reads if not specifically virtual
            if filepath in VFS_FILES: # VFS_FILES is still used for this check
                raise RuntimeError(f"[AgentTrace] VFS access to {filepath} outside LIVE phase ({tracer.replay_phase})")

        vfs_content = vfs_read(filepath)
        if vfs_content is not None:
            content = vfs_content
            if encoding:
                # Decode bytes to string if needed
                if isinstance(content, bytes):
                    content = content.decode(encoding or 'utf-8')
                return io.StringIO(content)
            else:
                return io.BytesIO(content.encode() if isinstance(content, str) else content)
        else:
            # Fallback to real FS for initial state
            if _original_os_path_exists(filepath):
                with _original_open(filepath, 'r', encoding=encoding) as f:
                    content = f.read()
                vfs_write(filepath, content)
                return io.StringIO(content) if encoding else io.BytesIO(content.encode())
            else:
                # RECORD: Log the read event
                if tracer.mode == Mode.RECORD:
                    tracer.record_event("file_read", {"path": filepath})
                raise FileNotFoundError(f"[VFS] {filepath}")
    
    elif is_append:
        if vfs_read(filepath) is None:
            vfs_write(filepath, "")
        
        class AppendFile:
            def __init__(self, path, enc):
                self.path = path
                self.encoding = enc
                self.closed = False
            def write(self, data):
                if self.closed: raise ValueError("I/O operation on closed file")
                if isinstance(data, bytes) and self.encoding:
                    data = data.decode(self.encoding)
                vfs_write(self.path, vfs_read(self.path) + data)
                return len(data)
            def read(self): return vfs_read(self.path)
            def close(self): self.closed = True
            def __enter__(self): return self
            def __exit__(self, *args): self.close()
            def flush(self): pass
        return AppendFile(filepath, encoding)
    
    elif is_write:
        is_binary = 'b' in mode
        class WriteFile:
            def __init__(self, path, enc, binary):
                self.path = path
                self.encoding = enc
                self.is_binary = binary
                self.buffer = io.BytesIO() if binary else io.StringIO()
                self.closed = False
            def write(self, data):
                if self.closed: raise ValueError("I/O operation on closed file")
                if self.is_binary and isinstance(data, str):
                    data = data.encode(self.encoding or 'utf-8')
                elif not self.is_binary and isinstance(data, bytes):
                    data = data.decode(self.encoding or 'utf-8')
                return self.buffer.write(data)
            def close(self):
                if not self.closed:
                    content = self.buffer.getvalue()
                    vfs_write(self.path, content)
                    # RECORD: Log the write event
                    if tracer.mode == Mode.RECORD:
                        tracer.record_event("file_write", {
                            "path": self.path,
                            "content": content if isinstance(content, str) else content.decode('utf-8', errors='replace')
                        })
                    self.closed = True
            def __enter__(self): return self
            def __exit__(self, *args): self.close()
            def flush(self): pass
        return WriteFile(filepath, encoding, is_binary)
    
    return _original_open(file, mode, buffering, encoding, errors, newline, closefd, opener)

def _vfs_listdir(path='.'):
    """
    Combined listdir that sees both real files AND VFS files.
    """
    tracer = Tracer.get_instance()
    if tracer.mode != Mode.REPLAY:
        return _original_os_listdir(path)

    real_results = set()
    try:
        real_results = set(_original_os_listdir(path))
    except FileNotFoundError:
        pass

    abs_path = _get_vfs_path(path)
    
    # 1. Add VFS files that are in this directory
    for vfs_path in VFS_FILES:
        # Check if vfs_path is a direct child of abs_path
        # e.g. /tmp/app/foo.txt is child of /tmp/app
        # but /tmp/app/subdir/bar.txt is NOT (listdir is shallow)
        
        parent = os.path.dirname(vfs_path)
        if parent == abs_path:
            real_results.add(os.path.basename(vfs_path))
            
    # 2. Add VFS directories
    # If /tmp/app/subdir/bar.txt exists, then 'subdir' must appear in /tmp/app listing
    for vfs_path in VFS_FILES:
        if vfs_path.startswith(abs_path) and vfs_path != abs_path:
            # Get relative path
            rel = os.path.relpath(vfs_path, abs_path)
            parts = rel.split(os.sep)
            if parts:
                real_results.add(parts[0])

    return list(real_results)

def _vfs_scandir(path='.'):
    """
    Mock scandir to return DirEntry-like objects for VFS.
    """
    tracer = Tracer.get_instance()
    if tracer.mode != Mode.REPLAY:
        return _original_os_scandir(path)
    
    # For now, simplistic implementation: use listdir and generate mock entries
    # This is a bit expensive but correct
    names = _vfs_listdir(path)
    entries = []
    
    import os as real_os
    
    class MockDirEntry:
        def __init__(self, name, path, is_dir_val, is_file_val):
            self.name = name
            self.path = path
            self._is_dir = is_dir_val
            self._is_file = is_file_val
        
        def is_dir(self, follow_symlinks=True): return self._is_dir
        def is_file(self, follow_symlinks=True): return self._is_file
        def is_symlink(self): return False
        def stat(self): return real_os.stat(self.path) # Fallback to real stat (might fail for pure VFS)
        def inode(self): return 0
    
    abs_dir = _get_vfs_path(path)
    
    for name in names:
        full_path = os.path.join(abs_dir, name)
        
        # Determine type
        is_file_val = full_path in VFS_FILES or _original_os_path_isfile(full_path)
        # It's a dir if it's not a file (simplification) or if it has VFS children
        is_dir_val = not is_file_val 
        
        entries.append(MockDirEntry(name, full_path, is_dir_val, is_file_val))
        
    return (e for e in entries)


def patch_fs():
    """Apply all FS patches."""
    global _original_open, _original_os_path_exists, _original_os_path_isfile, _original_os_listdir, _original_os_scandir
    
    import builtins
    import os
    
    # 1. Save originals
    if not _original_open:
        _original_open = builtins.open
        _original_os_path_exists = os.path.exists
        _original_os_path_isfile = os.path.isfile
        _original_os_listdir = os.listdir
        
        # scandir added in Python 3.5
        if hasattr(os, 'scandir'):
            _original_os_scandir = os.scandir
    
    # 2. Patch builtins.open
    builtins.open = _vfs_open 
    if hasattr(builtins, '__dict__'):
         if 'open' in builtins.__dict__:
             # This is tricky in Python C-API, usually just setting module attr works
             pass

    # 3. Patch os.path
    def vfs_exists(path):
        p = _get_vfs_path(path)
        if '.agenttrace' in p: return _original_os_path_exists(path)
        return p in VFS_FILES or _original_os_path_exists(path)

    def vfs_isfile(path):
        p = _get_vfs_path(path)
        if '.agenttrace' in p: return _original_os_path_isfile(path)
        return p in VFS_FILES or _original_os_path_isfile(path)

    os.path.exists = vfs_exists
    os.path.isfile = vfs_isfile
    
    # 4. Patch Directory Listing
    os.listdir = _vfs_listdir
    if hasattr(os, 'scandir'):
        os.scandir = _vfs_scandir
    
    print("AgentTrace: Filesystem (Open/ListDir/Scandir) Instrumented")
