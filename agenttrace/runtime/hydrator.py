from typing import Any, Dict, List
import sys

class DeepHydrator:
    """
    Intelligently restores state by updating EXISTING objects in memory
    instead of replacing them with dictionaries from JSON.
    """
    
    @staticmethod
    def hydrate(live_locals: Dict[str, Any], checkpoint_state: Dict[str, Any]):
        """
        Merge checkpoint_state (JSON dicts) into live_locals (Python Objects).
        """
        print(f"[Hydrator] Hydrating {len(checkpoint_state)} variables...")
        
        updates = {}
        
        for name, json_value in checkpoint_state.items():
            if name not in live_locals:
                # New variable? Just set it.
                updates[name] = json_value
                continue
                
            live_obj = live_locals[name]
            
            # If live object is a complex class instance and json_value is a dict
            # We attempt to update the instance's __dict__
            if DeepHydrator._is_complex_object(live_obj) and isinstance(json_value, dict):
                try:
                    DeepHydrator._recursive_update(live_obj, json_value)
                    # We do NOT add to updates, because we modified the object in-place.
                    # The reference in locals remains valid.
                    print(f"[Hydrator] Deep updated object: {name}")
                except Exception as e:
                    print(f"[Hydrator] Failed to deep update {name}: {e}")
                    # Fallback: simple replace (might break things, but better than partial consistency)
                    updates[name] = json_value
            else:
                # Primitive or simple replace
                updates[name] = json_value
        
        # Apply updates to locals
        live_locals.update(updates)

    @staticmethod
    def _is_complex_object(obj: Any) -> bool:
        """Check if object is a user-defined class instance."""
        if obj is None: return False
        if isinstance(obj, (int, float, str, bool, list, dict, set, tuple)):
            return False
        return hasattr(obj, '__dict__')

    @staticmethod
    def _recursive_update(target_obj: Any, state_dict: Dict[str, Any]):
        """
        Recursively update target_obj attributes from state_dict.
        """
        if hasattr(target_obj, '__dict__'):
            target_dict = target_obj.__dict__
            
            for k, v in state_dict.items():
                # Skip private/internal keys if needed, but usually we want to restore them
                if k.startswith("__"): continue
                
                if k in target_dict:
                    current_val = target_dict[k]
                    # Recurse if both are complex/dict
                    if DeepHydrator._is_complex_object(current_val) and isinstance(v, dict):
                        DeepHydrator._recursive_update(current_val, v)
                    else:
                        target_dict[k] = v
                else:
                    # Attribute didn't exist? Set it.
                    setattr(target_obj, k, v)
