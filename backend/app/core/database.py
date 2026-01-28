from urllib.parse import urlparse
import ssl

import certifi
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings

class Database:
    client: AsyncIOMotorClient = None

db = Database()

async def get_database():
    return db.client[settings.DATABASE_NAME]

async def connect_to_mongo():
    # Use CA bundle when talking to hosted MongoDB (e.g., *.mongodb.net) to avoid TLS handshake issues on Windows
    parsed = urlparse(settings.MONGODB_URL)
    needs_tls = (parsed.hostname or "").endswith(".mongodb.net")
    
    if needs_tls:
        # Create a custom SSL context for Windows compatibility with Python 3.14
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        ssl_context.check_hostname = True
        ssl_context.verify_mode = ssl.CERT_REQUIRED
        # Set minimum TLS version for security
        ssl_context.minimum_version = ssl.TLSVersion.TLSv1_2
        
        tls_kwargs = {
            "tls": True,
            "tlsCAFile": certifi.where(),
            "serverSelectionTimeoutMS": 60000,
            "connectTimeoutMS": 60000,
            "socketTimeoutMS": 60000,
            "retryWrites": True,
            "w": "majority",
            "maxPoolSize": 10,
            "minPoolSize": 1,
        }
    else:
        tls_kwargs = {}

    db.client = AsyncIOMotorClient(settings.MONGODB_URL, **tls_kwargs)
    
    # Actually test the connection
    try:
        await db.client.admin.command('ping')
        print("Connected to MongoDB successfully!")
    except Exception as e:
        print(f"MongoDB connection test failed: {e}")
        raise

async def close_mongo_connection():
    db.client.close()
    print("Closed MongoDB connection")
