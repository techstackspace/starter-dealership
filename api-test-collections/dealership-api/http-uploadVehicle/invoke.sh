#!/bin/bash
set -euo pipefail
ID="${1:-00000000-0000-0000-0000-000000000000}"
FILE_PATH="$(dirname "$0")/sample-upload.txt"
if [[ ! -f "$FILE_PATH" ]]; then
  echo "Upload sample file not found: $FILE_PATH" >&2
  exit 1
fi
curl -sS -i -X POST "http://localhost:5040/api/upload" \
  -F "vehicleId=${ID}" \
  -F "file=@${FILE_PATH};type=text/plain"
