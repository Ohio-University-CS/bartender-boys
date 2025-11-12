import base64
import logging
from typing import Dict, Any, Optional
from datetime import datetime
import re

logger = logging.getLogger(__name__)


def decode_base64_image(base64_data: str) -> bytes:
    """
    Decode base64 image data to bytes.

    Args:
        base64_data: Base64 encoded image string

    Returns:
        Decoded image bytes

    Raises:
        ValueError: If base64 data is invalid
    """
    try:
        # Remove data URL prefix if present
        if base64_data.startswith("data:image"):
            base64_data = base64_data.split(",")[1]

        return base64.b64decode(base64_data)
    except Exception as e:
        logger.error(f"Failed to decode base64 image: {str(e)}")
        raise ValueError(f"Invalid base64 image data: {str(e)}")


def validate_image_format(image_data: bytes) -> bool:
    """
    Validate that the image data is in a supported format.

    Args:
        image_data: Raw image bytes

    Returns:
        True if image format is supported, False otherwise
    """
    # Check for common image file signatures
    jpeg_signature = b"\xff\xd8\xff"
    png_signature = b"\x89PNG\r\n\x1a\n"
    webp_signature = b"RIFF"

    if (
        image_data.startswith(jpeg_signature)
        or image_data.startswith(png_signature)
        or image_data.startswith(webp_signature)
    ):
        return True

    return False


def parse_date_string(date_str: str) -> Optional[datetime]:
    """
    Parse various date formats to datetime object.

    Args:
        date_str: Date string in various formats

    Returns:
        Datetime object or None if parsing fails
    """
    if not date_str:
        return None

    # Common date formats to try
    date_formats = [
        "%Y-%m-%d",
        "%m/%d/%Y",
        "%d/%m/%Y",
        "%Y/%m/%d",
        "%m-%d-%Y",
        "%d-%m-%Y",
    ]

    for fmt in date_formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue

    # Try to extract date from string with regex
    date_pattern = r"(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})"
    match = re.search(date_pattern, date_str)
    if match:
        month, day, year = match.groups()
        try:
            return datetime(int(year), int(month), int(day))
        except ValueError:
            pass

    logger.warning(f"Could not parse date string: {date_str}")
    return None


def clean_extracted_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Clean and validate extracted ID data.

    Args:
        data: Raw extracted data from OpenAI

    Returns:
        Cleaned and validated data
    """
    cleaned = {}

    # Clean name
    if "name" in data and data["name"]:
        cleaned["name"] = str(data["name"]).strip()

    # Clean state
    if "state" in data and data["state"]:
        cleaned["state"] = str(data["state"]).strip()

    # Parse and clean date of birth
    if "date_of_birth" in data and data["date_of_birth"]:
        date_obj = parse_date_string(str(data["date_of_birth"]))
        if date_obj:
            cleaned["date_of_birth"] = date_obj.date()

    # Clean sex
    if "sex" in data and data["sex"]:
        sex = str(data["sex"]).strip().lower()
        if sex in ["male", "female", "m", "f"]:
            cleaned["sex"] = sex

    # Clean eye color
    if "eye_color" in data and data["eye_color"]:
        cleaned["eye_color"] = str(data["eye_color"]).strip()

    # Clean driver's license number (must start with VH)
    # Accepts keys 'drivers_license_number' or common alternatives for resilience
    dl_keys = [
        "drivers_license_number",
        "driver_license_number",
        "license_number",
        "id_number",
    ]
    dl_value = None
    for key in dl_keys:
        if key in data and data[key]:
            dl_value = str(data[key])
            break
    if dl_value:
        candidate = re.sub(r"\s+", "", dl_value).upper()
        match = re.match(r"^VH[A-Z0-9]+", candidate)
        if match:
            cleaned["drivers_license_number"] = match.group(0)

    # Clean is_valid
    if "is_valid" in data:
        if isinstance(data["is_valid"], bool):
            cleaned["is_valid"] = data["is_valid"]
        elif isinstance(data["is_valid"], str):
            cleaned["is_valid"] = data["is_valid"].lower() in [
                "true",
                "yes",
                "1",
                "valid",
            ]

    return cleaned
