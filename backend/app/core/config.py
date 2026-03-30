from pydantic import field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Hospital Management System"
    MONGODB_URL: str = "mongodb+srv://<username>:<password>@cluster0.mongodb.net/hospital_db?retryWrites=true&w=majority"
    DATABASE_NAME: str = "hospital_db"
    SECRET_KEY: str = ""
    DATA_ENCRYPTION_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "https://dr-tumor.vercel.app",
    ]
    
    # Cloudinary Settings
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    
    # Gemini API
    GEMINI_API_KEY: str = ""

    # AI model paths
    CNN_MODEL_PATH: str = ""
    SEGMENT_MODEL_PATH: str = ""
    SLICE_MODEL_PATH: str = ""
    VLM_MODEL_PATH: str = ""

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, value):
        if isinstance(value, str):
            value = value.strip()
            if not value:
                return []
            # Support comma-separated origin strings in .env files
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    class Config:
        env_file = ".env"

settings = Settings()
