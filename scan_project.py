import os
import re
from pathlib import Path
import pathspec

# Configuration
KEYWORDS = [
    # NextAuth.js/session/middleware
    'nextauth', 'session', 'jwt', 'callback', 'middleware', 'authorize', 'token', 'secret',
    'gettoken', 'getsession', 'useSession', 'authOptions', 'jwtCallback', 'sessionCallback',
    # Cookie/security
    'cookie', 'cookies', 'set-cookie', 'httpOnly', 'secure', 'sameSite', 'domain', 'path',
    # Proxy/Docker/Nginx
    'nginx', 'proxy', 'reverse_proxy', 'location', 'rewrite', 'upstream', 'docker', 'network',
    # Routing/protection
    'protected', 'redirect', 'signin', 'signout', 'login', 'logout', 'api/auth', 'api/user-auth',
    # FastAPI OAuth2
    'OAuth2PasswordBearer', 'tokenUrl', 'dependency', 'verify_token',
    # Misc
    'production', 'dev', 'env', 'environment', 'hostname', 'localhost', '127.0.0.1'
]  # Focused for deployment, routing, websockets, API, and security

'''KEYWORDS = [
    'axios','api','env','fetch(','auth',
    'route','router','endpoint','request','response','url','baseurl','host','port','proxy','cors',
    'token','jwt','bearer','cookie','session','login','logout','register','signup',
    'ssl','tls','certificate','cert','key','redirect','callback','origin','header','set-cookie',
    'csrf','secure','httpOnly','domain','path','403','401','404','500'
]'''
CONTEXT_LINES = 1

# Load .gitignore as a PathSpec
def load_gitignore(root_dir):
    gitignore_path = os.path.join(root_dir, '.gitignore')
    if not os.path.exists(gitignore_path):
        return pathspec.PathSpec.from_lines('gitwildmatch', [])
    with open(gitignore_path, 'r') as f:
        lines = f.readlines()
    return pathspec.PathSpec.from_lines('gitwildmatch', lines)

# Search with context
def print_with_context(file_path, keyword_regex):
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
    except Exception as e:
        print(f"Could not read file: {file_path} ({e})")
        return

    matches = sorted(set(i for i, line in enumerate(lines) if keyword_regex.search(line)))

    if not matches:
        return

    # Step 1: Create a list of context blocks for each match
    blocks = []
    for match_index in matches:
        start = max(0, match_index - CONTEXT_LINES)
        end = min(len(lines), match_index + CONTEXT_LINES + 1)
        blocks.append([start, end])

    if not blocks:
        return

    # Step 2: Merge overlapping blocks
    merged_blocks = [blocks[0]]
    for current_start, current_end in blocks[1:]:
        last_start, last_end = merged_blocks[-1]

        # If the current block overlaps with the last one, merge them
        if current_start < last_end:
            merged_blocks[-1][1] = max(last_end, current_end)
        else:
            # Otherwise, it's a new, distinct block
            merged_blocks.append([current_start, current_end])

    # Step 3: Print the merged blocks
    print(f"\n--- {file_path} ---")
    for start, end in merged_blocks:
        for i in range(start, end):
            print(f"{i+1:>4}: {lines[i].rstrip()}")
        print("-" * 40)

def print_whole_file(file_path):
    print(f"\n=== {file_path} ===")
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            print(f.read())
    except Exception as e:
        print(f"Could not read file: {file_path} ({e})")

def is_text_file(filepath, blocksize=512):
    try:
        with open(filepath, 'rb') as f:
            chunk = f.read(blocksize)
            if b'\x00' in chunk:
                return False  # likely binary
            return True
    except Exception:
        return False


def walk_project(root='.'):
    root = os.path.abspath(root)
    spec = load_gitignore(root)
    keyword_regex = re.compile('|'.join(re.escape(k) for k in KEYWORDS), re.IGNORECASE)

    for dirpath, _, filenames in os.walk(root):
        # Skip .git directories entirely
        if '.git' in dirpath.split(os.sep):
            continue
        # Skip frontend/src/components and any app/components directory
        if (
            'components' in dirpath.split(os.sep)
            and (
                dirpath.endswith('components') or
                dirpath.endswith(os.sep + 'components') or
                os.sep + 'components' + os.sep in dirpath
            )
        ):
            continue
        for filename in filenames:
            full_path = os.path.join(dirpath, filename)
            relative_path = os.path.relpath(full_path, root)

            # Skip files inside .git directory (extra safety)
            if '/.git/' in full_path or full_path.endswith('/.git') or relative_path.startswith('.git/'):
                continue

            # Skip .svg files
            if filename.lower().endswith('.svg'):
                continue

            if spec.match_file(relative_path):
                continue

            if '.csv' in filename.lower():
                continue

            if not is_text_file(full_path):
                continue

            if 'docker' in filename.lower():
                print_whole_file(full_path)
            else:
                print_with_context(full_path, keyword_regex)

if __name__ == '__main__':
    walk_project('.')

