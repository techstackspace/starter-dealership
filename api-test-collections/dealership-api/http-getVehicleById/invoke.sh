#!/bin/bash
set -euo pipefail
ID="${1:-00000000-0000-0000-0000-000000000000}"
curl -sS -i "http://localhost:5040/api/vehicles/${ID}"
