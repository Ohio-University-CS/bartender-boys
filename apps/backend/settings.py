import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from the backend folder's .env regardless of CWD
_ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=_ENV_PATH, override=False)


class Settings:
    """Application settings loaded from environment variables"""
    
    # OpenAI Configuration
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    
    # Server Configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # CORS Configuration
    CORS_ORIGINS: list[str] = os.getenv("CORS_ORIGINS", "*").split(",")
    
    # MongoDB Configuration (use provided env vars only)
    # Expect: DB_URI (full Mongo connection string with credentials)
    # and DB_NAME (target database name). Do not infer from URI.
    # Optional: DB_USERNAME, DB_PASSWORD are ignored if DB_URI already contains them
    MONGODB_URI: Optional[str] = os.getenv("DB_URI")
    MONGODB_DB: Optional[str] = os.getenv("DB_NAME")
    
    # ID Scanning Configuration
    MAX_IMAGE_SIZE_MB: int = int(os.getenv("MAX_IMAGE_SIZE_MB", "10"))
    SUPPORTED_IMAGE_FORMATS: list[str] = ["jpeg", "png", "webp"]
    
    # OpenAI Model Configuration
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o")
    OPENAI_MAX_TOKENS: int = int(os.getenv("OPENAI_MAX_TOKENS", "500"))
    OPENAI_TEMPERATURE: float = float(os.getenv("OPENAI_TEMPERATURE", "0.1"))
    
    # Firmware API Configuration (fallback to legacy PI_CONTROLLER_URL)
    FIRMWARE_API_URL: str = os.getenv("FIRMWARE_API_URL") or os.getenv("PI_CONTROLLER_URL", "")
    
    def validate(self) -> None:
        """Validate required settings"""
        if not self.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        if not self.MONGODB_URI:
            raise ValueError("DB_URI environment variable is required")
        if not self.MONGODB_DB:
            raise ValueError("DB_NAME environment variable is required")


# Global settings instance
settings = Settings()
