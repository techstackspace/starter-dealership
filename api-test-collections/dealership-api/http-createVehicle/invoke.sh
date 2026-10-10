#!/bin/bash
set -euo pipefail
curl -sS -i -X POST "http://localhost:5040/api/vehicles" \
  -H "Content-Type: application/json" \
  --data @"$(dirname "$0")/sample-data.json"
