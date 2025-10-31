import logging
from datetime import datetime, time
from fastapi import APIRouter, HTTPException

from id_scanning.models import IDScanRequest, IDScanResponse
from id_scanning.utils import decode_base64_image, validate_image_format, clean_extracted_data
from services.openai import OpenAIService
from services.users import get_or_insert_user_from_id_scan
from settings import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/id-scanning", tags=["ID Scanning"])

# Lazily initialize OpenAI service so missing API key doesn't affect startup
openai_service: OpenAIService | None = None

def get_openai_service() -> OpenAIService | None:
    global openai_service
    if openai_service is None:
        try:
            openai_service = OpenAIService()
        except ValueError as e:
            logger.error(f"Failed to initialize OpenAI service: {str(e)}")
            openai_service = None
    return openai_service


@router.post("/scan", response_model=IDScanResponse)
async def scan_id(request: IDScanRequest):
    """
    Scan an ID image and extract information using GPT-4o.
    
    Args:
        request: IDScanRequest containing base64 encoded image data
        
    Returns:
        IDScanResponse with extracted ID information
    """
    logger.info("=" * 50)
    logger.info("Received ID scan request")
    try:
        # Decode the base64 image data
        try:
            image_data = decode_base64_image(request.image_data)
        except ValueError as e:
            logger.error(f"Invalid image data: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
        
        # Validate image format
        if not validate_image_format(image_data):
            logger.error("Unsupported image format")
            raise HTTPException(
                status_code=400, 
                detail="Unsupported image format. Please use JPEG, PNG, or WebP."
            )
        
        # Check image size
        max_size_bytes = settings.MAX_IMAGE_SIZE_MB * 1024 * 1024
        if len(image_data) > max_size_bytes:
            logger.error("Image too large")
            raise HTTPException(
                status_code=400, 
                detail=f"Image too large. Maximum size is {settings.MAX_IMAGE_SIZE_MB}MB."
            )
        
        # Check if OpenAI service is available
        service = get_openai_service()
        if service is None:
            logger.error("OpenAI service not available")
            raise HTTPException(
                status_code=500,
                detail="OpenAI service not configured"
            )
        
        # Call OpenAI service to analyze the image
        logger.info("Sending image to OpenAI for analysis...")
        result = await service.analyze_id_image(image_data)
        logger.info(f"OpenAI analysis complete: {result}")
        
        # Print the result to console for debugging
        print("=" * 50)
        print("ID SCAN RESULT:")
        print("=" * 50)
        print(f"Name: {result.get('name', 'N/A')}")
        print(f"State: {result.get('state', 'N/A')}")
        print(f"Date of Birth: {result.get('date_of_birth', 'N/A')}")
        print(f"Sex: {result.get('sex', 'N/A')}")
        print(f"Eye Color: {result.get('eye_color', 'N/A')}")
        print(f"Driver's License #: {result.get('drivers_license_number', 'N/A')}")
        print(f"Is Valid: {result.get('is_valid', 'N/A')}")
        print(f"Raw Response: {result.get('raw_response', 'N/A')}")
        
        if result.get('error'):
            print(f"Error: {result.get('error')}")
        print("=" * 50)
        
        # Check for errors in the response
        if "error" in result:
            logger.error(f"OpenAI service error: {result['error']}")
            return IDScanResponse(
                error=result["error"],
                raw_response=result.get("raw_response")
            )
        
        # Clean and validate the extracted data
        cleaned_data = clean_extracted_data(result)
        
        # Fetch existing user or insert new one without modifying existing records
        try:
            user_doc = await get_or_insert_user_from_id_scan(cleaned_data)
        except Exception as e:
            logger.error("Failed to persist/fetch user record: %s", str(e))
            user_doc = cleaned_data

        # Create response from stored/existing user document, restricting to known fields
        allowed_keys = {
            "name",
            "state",
            "date_of_birth",
            "sex",
            "eye_color",
            "drivers_license_number",
            "is_valid",
            "error",
            "raw_response",
        }
        response_payload = {k: user_doc.get(k) for k in allowed_keys if k in user_doc}
        response = IDScanResponse(**response_payload)
        
        logger.info("ID scanning completed successfully")
        return response
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected error during ID scanning: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Internal server error during ID scanning"
        )
