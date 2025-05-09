FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY main.py flow.py nodes.py ./
COPY utils/ ./utils/

# Copy frontend build (assumes you've built it first)
COPY frontend/build/ ./frontend/build/

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Create output and logs directories
RUN mkdir -p output logs

# Expose port
EXPOSE 8000

# Set the entrypoint
CMD ["python", "-m", "uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000"] 