import os
import io
from typing import Dict, Union, Optional, Any

class VFSManager:
    _instance = None
    
    def __init__(self):
        # files: path -> content (str or bytes)
        self.files: Dict[str, Union[str, bytes]] = {}
        # change_log: list of modified paths since last snapshot
        self.modified_paths = set()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def reset(self):
        self.files = {}
        self.modified_paths = set()

    def write_file(self, path: str, content: Union[str, bytes]):
        """Write content to VFS at path."""
        norm_path = os.path.abspath(os.path.normpath(path))
        self.files[norm_path] = content
        self.modified_paths.add(norm_path)
        
        # Notify Tracer
        try:
            from agenttrace.core.tracer import Tracer
            t = Tracer.get_instance()
            # Only record if we are in recording mode
            # content payload might be large, maybe truncate for event stream?
            # For V1, let's store full content for small text files.
            display_content = content
            if isinstance(content, bytes):
                display_content = f"<binary: {len(content)} bytes>"
            elif len(content) > 5000:
                display_content = content[:5000] + "...(truncated)"

            t.record_event("file_write", {
                "path": norm_path,
                "content_preview": display_content,
                "size": len(content),
                "is_binary": isinstance(content, bytes)
            })
            # Also attach full content to the snapshot/keyframe logic via Tracer if needed
            # But strictly speaking, the 'file_write' event is enough to reconstruct if we replay.
        except Exception as e:
            # STRICT: Propagate ReplayError up to the runtime
            if type(e).__name__ == "ReplayError":
                raise e
            print(f"[VFS] Failed to record event: {e}")

    def read_file(self, path: str, binary: bool = False) -> Union[str, bytes]:
        """Read from VFS. Falls back to disk if allowed (TODO)."""
        norm_path = os.path.abspath(os.path.normpath(path))
        if norm_path in self.files:
            content = self.files[norm_path]
            return content
        else:
            raise FileNotFoundError(f"VFS: File not found: {path}")

    def exists(self, path: str) -> bool:
        norm_path = os.path.abspath(os.path.normpath(path))
        if norm_path in self.files:
            return True
        # Also check if it's a virtual directory
        for f in self.files:
            if f.startswith(norm_path + os.sep):
                return True
        return False

    def remove(self, path: str):
        norm_path = os.path.abspath(os.path.normpath(path))
        if norm_path in self.files:
            del self.files[norm_path]
            self.modified_paths.add(norm_path)
            
            try:
                from agenttrace.core.tracer import Tracer
                Tracer.get_instance().record_event("file_remove", {"path": norm_path})
            except Exception as e:
                if type(e).__name__ == "ReplayError": raise e
                pass
        else:
            raise FileNotFoundError(f"VFS: File not found: {path}")

    def rename(self, old_path: str, new_path: str):
        old_norm = os.path.abspath(os.path.normpath(old_path))
        new_norm = os.path.abspath(os.path.normpath(new_path))
        
        if old_norm in self.files:
            self.files[new_norm] = self.files.pop(old_norm)
            self.modified_paths.add(old_norm)
            self.modified_paths.add(new_norm)
            
            try:
                from agenttrace.core.tracer import Tracer
                Tracer.get_instance().record_event("file_rename", {"old": old_norm, "new": new_norm})
            except Exception as e:
                if type(e).__name__ == "ReplayError": raise e
                pass
        else:
            # Check if it's a directory move
            found = False
            to_move = []
            for f in self.files:
                if f.startswith(old_norm + os.sep) or f == old_norm:
                    to_move.append(f)
            
            if to_move:
                for f in to_move:
                    rel = os.path.relpath(f, old_norm)
                    target = os.path.normpath(os.path.join(new_norm, rel))
                    self.files[target] = self.files.pop(f)
                    self.modified_paths.add(f)
                    self.modified_paths.add(target)
                
                try:
                    from agenttrace.core.tracer import Tracer
                    Tracer.get_instance().record_event("dir_rename", {"old": old_norm, "new": new_norm, "count": len(to_move)})
                except Exception as e:
                    if type(e).__name__ == "ReplayError": raise e
                    pass
            else:
                raise FileNotFoundError(f"VFS: Source not found: {old_path}")

    def makedirs(self, path: str, exist_ok: bool = False):
        # In this simple VFS, directories are implicit. 
        # But we record the event for replay determinism.
        norm_path = os.path.abspath(os.path.normpath(path))
        try:
            from agenttrace.core.tracer import Tracer
            Tracer.get_instance().record_event("makedirs", {"path": norm_path, "exist_ok": exist_ok})
        except Exception as e:
            if type(e).__name__ == "ReplayError": raise e
            pass

    def listdir(self, path: str) -> list:
        norm_path = os.path.abspath(os.path.normpath(path))
        results = set()
        for f in self.files:
            if f.startswith(norm_path + os.sep):
                # Get the next part after the prefix
                rel = f[len(norm_path) + 1:]
                parts = rel.split(os.sep)
                if parts:
                    results.add(parts[0])
        return list(results)

    def rmdir(self, path: str):
        """Remove a virtual directory and its contents."""
        norm_path = os.path.abspath(os.path.normpath(path))
        to_delete = [f for f in self.files if f.startswith(norm_path + os.sep) or f == norm_path]
        for f in to_delete:
            del self.files[f]
            self.modified_paths.add(f)
            
        try:
            from agenttrace.core.tracer import Tracer
            Tracer.get_instance().record_event("rmdir", {"path": norm_path, "count": len(to_delete)})
        except Exception as e:
            if type(e).__name__ == "ReplayError": raise e
            pass

    def get_snapshot(self) -> Dict[str, Any]:
        """Return copy of current state."""
        return self.files.copy()
    
    def pop_modified_files(self) -> Dict[str, Any]:
        """Return dict of {path: content} for files changed since last call."""
        diff = {}
        for path in self.modified_paths:
            diff[path] = self.files[path]
        self.modified_paths.clear()
        return diff
