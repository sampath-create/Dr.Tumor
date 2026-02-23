import sys
import os

# Add the backend directory to the Python path so that
# "from app.core..." imports inside backend/ resolve correctly.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.main import app  # noqa: E402

# This file exposes the FastAPI `app` instance for Vercel.
