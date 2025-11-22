#!/bin/bash
# Startup script for Railway deployment
# Reads PORT from Railway environment variable

PORT=${PORT:-8001}
echo "Starting AI Service on port $PORT"
exec uvicorn main:app --host 0.0.0.0 --port "$PORT"

