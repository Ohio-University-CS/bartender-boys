from pydantic import BaseModel, Field
from typing import Optional
from datetime import date


class IDScanRequest(BaseModel):
    """Request model for ID scanning endpoint"""

    image_data: str = Field(..., description="Base64 encoded image data")


class IDScanResponse(BaseModel):
    """Response model for ID scanning endpoint"""

    name: Optional[str] = Field(None, description="Full name as it appears on the ID")
    state: Optional[str] = Field(
        None, description="State or jurisdiction that issued the ID"
    )
    date_of_birth: Optional[date] = Field(None, description="Date of birth")
    sex: Optional[str] = Field(None, description="Gender/sex as indicated on the ID")
    eye_color: Optional[str] = Field(None, description="Eye color as listed on the ID")
    drivers_license_number: Optional[str] = Field(
        None, description="Driver's license number starting with 'VH'"
    )
    is_valid: Optional[bool] = Field(
        None, description="Whether this appears to be a legitimate ID"
    )
    error: Optional[str] = Field(None, description="Error message if processing failed")
    raw_response: Optional[str] = Field(
        None, description="Raw OpenAI response for debugging"
    )
