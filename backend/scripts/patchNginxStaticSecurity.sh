#!/bin/bash
# ponytail: run patchNginxStaticSecurity.py on the server after deploy
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
python3 "$SCRIPT_DIR/patchNginxStaticSecurity.py"
