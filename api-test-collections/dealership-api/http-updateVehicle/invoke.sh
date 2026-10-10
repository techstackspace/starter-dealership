#!/bin/bash
set -euo pipefail
ID="${1:-00000000-0000-0000-0000-000000000000}"
curl -sS -i -X PUT "http://localhost:5040/api/vehicles/${ID}" \
  -H "Content-Type: application/json" \
  --data @"$(dirname "$0")/sample-data.json"
