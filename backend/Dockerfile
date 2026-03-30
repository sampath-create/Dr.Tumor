# Use the PyTorch runtime with CUDA support
FROM pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime

WORKDIR /app

# 1. Install system dependencies for OpenSSL (required for MongoDB TLS)
RUN apt-get update && apt-get install -y libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# 2. Copy and install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3. Copy the entire project
COPY . .

# 4. Expose the port for FastAPI
EXPOSE 8000

# 5. Run Uvicorn pointing to your app/main.py
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
