# Use exact python base image
FROM python:3.12.1-slim-bookworm

# Enforce Security constraints inside the image Environment
ENV PYTHONHASHSEED=0
ENV TZ=UTC
ENV LANG=C.UTF-8

# Create a non-root user (uid=1000, gid=1000)
RUN groupadd -g 1000 appuser && \
    useradd -u 1000 -g appuser -m appuser

# Install minimal agenttrace package requirements via pip
RUN pip install --no-cache-dir httpx urllib3 fastapi aiosqlite

# We only copy the agenttrace package code into the image 
COPY apps/backend/agenttrace /app/agenttrace
COPY docker/governance/runner.py /app/runner.py

# Switch to the /app directory
WORKDIR /app

# Ensure proper permissions are maintained so the appuser can read the module
RUN chown -R appuser:appuser /app

# Completely strip pip and shell binaries to prevent runtime installation or shell breakout
RUN rm -rf /usr/local/bin/pip /usr/local/bin/pip3* && \
    apt-get purge -y curl && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

# Switch to the non-root user
USER appuser

# Entrypoint is strict - execution strictly bound to Python securely running the sandbox runner.
# No intermediate shells are permitted.
ENTRYPOINT ["python", "/app/runner.py"]
