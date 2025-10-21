import base64
import json
import asyncio
from typing import Dict, Any, Optional
from openai import OpenAI
from settings import settings


class OpenAIService:
    # Use Singleton pattern cause it's goated
    _instance: Optional['OpenAIService'] = None
    _client: Optional[OpenAI] = None
    
    def __new__(cls) -> 'OpenAIService':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._client is None:
            if not settings.OPENAI_API_KEY:
                raise ValueError("OpenAI API key not configured in settings")
            self._client = OpenAI(api_key=settings.OPENAI_API_KEY)
    
    @property
    def client(self) -> OpenAI:
        return self._client
    
    async def analyze_id_image(self, image_data: bytes) -> Dict[str, Any]:
        """
        Analyze an ID image using GPT-4o and extract structured information.
        Includes retry logic for transient failures.
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            Dictionary containing extracted ID information
        """
        # Encode image to base64
        base64_image = base64.b64encode(image_data).decode('utf-8')
        
        # Create the prompt for ID extraction
        prompt = """
        Analyze this ID image and extract the following information in JSON format:
        - name: Full name as it appears on the ID
        - state: State or jurisdiction that issued the ID
        - date_of_birth: Date of birth in YYYY-MM-DD format
        - sex: Gender/sex as indicated on the ID
        - eye_color: Eye color as listed on the ID
        - is_valid: Boolean indicating if this appears to be a legitimate ID
        
        Return only valid JSON with these exact field names. If any information is not visible or unclear, use null for that field.
        """
        
        retry_count = 0
        max_retries = 1  # Retry once after failure
        
        while retry_count <= max_retries:
            try:
                response = self.client.chat.completions.create(
                    model=settings.OPENAI_MODEL,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{base64_image}"
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens=settings.OPENAI_MAX_TOKENS,
                    temperature=settings.OPENAI_TEMPERATURE
                )
                
                # Extract the response content
                content = response.choices[0].message.content
                
                # Clean the content by removing markdown code blocks if present
                cleaned_content = content.strip()
                if cleaned_content.startswith('```json'):
                    cleaned_content = cleaned_content[7:]  # Remove ```json
                if cleaned_content.startswith('```'):
                    cleaned_content = cleaned_content[3:]   # Remove ```
                if cleaned_content.endswith('```'):
                    cleaned_content = cleaned_content[:-3]  # Remove trailing ```
                cleaned_content = cleaned_content.strip()
                
                # Parse the JSON response
                try:
                    result = json.loads(cleaned_content)
                    return result
                except json.JSONDecodeError:
                    # If JSON parsing fails, return error
                    return {
                        "error": "Failed to parse OpenAI response as JSON",
                        "raw_response": content
                    }
                    
            except Exception as e:
                retry_count += 1
                print(f"OpenAI API call attempt {retry_count} failed: {str(e)}")
                
                if retry_count > max_retries:
                    # Final attempt failed, return error
                    return {
                        "error": f"OpenAI API error after {max_retries + 1} attempts: {str(e)}"
                    }
                
                # Wait a moment before retry
                await asyncio.sleep(1)
                print(f"Retrying OpenAI API call (attempt {retry_count + 1}/{max_retries + 1})...")
        
        # This should never be reached, but just in case
        return {
            "error": "Unexpected error in retry logic"
        }
