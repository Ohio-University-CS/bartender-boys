import logging
import httpx
from typing import Optional
from settings import settings

logger = logging.getLogger(__name__)


class FirmwareClient:
    """Client for communicating with the firmware API."""

    def __init__(self, base_url: Optional[str] = None, token: Optional[str] = None):
        self.base_url = base_url or settings.FIRMWARE_API_URL
        self.token = token or settings.FIRMWARE_API_TOKEN
        if not self.base_url:
            raise ValueError("FIRMWARE_API_URL must be set in environment variables")

    def _auth_headers(self) -> dict[str, str]:
        """Build headers for firmware auth (supports token or Bearer)."""
        if not self.token:
            return {}
        return {
            "X-Firmware-Token": self.token,
            "Authorization": f"Bearer {self.token}",
        }

    async def send_drink_request(self, drink: dict) -> dict:
        """
        Send a drink request to the firmware API.

        Args:
            drink: Drink object as dictionary

        Returns:
            Response from firmware API
        """
        url = f"{self.base_url.rstrip('/')}/iot/drink"
        headers = self._auth_headers()

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    url,
                    json={"drink": drink},
                    headers=headers,
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Failed to send drink request to firmware: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error sending drink request: {e}")
            raise
