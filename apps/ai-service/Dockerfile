# Python AI Service Dockerfile

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create data directory
RUN mkdir -p /app/data

# Make startup script executable
RUN chmod +x start.sh

# Expose port (Railway will map this dynamically via PORT env var)
EXPOSE 8001

# Health check (uses PORT env var or defaults to 8001)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import os, requests; port = os.getenv('PORT', '8001'); requests.get(f'http://localhost:{port}/health').raise_for_status()"

# Start application using startup script (reads PORT from Railway env)
CMD ["./start.sh"]
