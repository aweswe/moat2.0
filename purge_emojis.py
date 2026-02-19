import os
import re

# Mapping of common emojis to ASCII equivalents
EMOJI_MAP = {
    "✅": "[OK]",
    "❌": "[ERROR]",
    "⚠️": "[WARN]",
    "⚠": "[WARN]",
    "ℹ️": "[INFO]",
    "🚀": "[START]",
    "📤": "[SYNC]",
    "📥": "[IN]",
    "🏁": "[DONE]",
    "🔍": "[SEARCH]",
    "💡": "[FIX]",
    "🔄": "[REPLAY]",
    "▶️": "[RUN]",
    "📍": "[JUMP]",
    "🌿": "[BRANCH]",
    "🔮": "[FORK]",
    "🔒": "[LOCKED]",
    "🔓": "[UNLOCKED]",
    "⚡": "[LIVE]",
    "🔌": "[CONN]",
    "⏱️": "[RETRY]",
    "ℹ": "[INFO]",
    "✓": "[OK]"
}

def purge_non_ascii(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(".py"):
                path = os.path.join(root, file)
                print(f"Purging {path}...")
                
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                
                # Replace known emojis
                for emoji, replacement in EMOJI_MAP.items():
                    content = content.replace(emoji, replacement)
                
                # Replace any remaining non-ASCII characters with empty string or '?'
                new_content = ""
                for char in content:
                    if ord(char) < 128:
                        new_content += char
                    else:
                        # If it wasn't in our map, just strip it to be safe
                        pass
                
                if content != new_content:
                    with open(path, "w", encoding="utf-8") as f:
                        f.write(new_content)
                else:
                    print(f"No non-ASCII found in {file}")

if __name__ == "__main__":
    purge_non_ascii("agenttrace")
