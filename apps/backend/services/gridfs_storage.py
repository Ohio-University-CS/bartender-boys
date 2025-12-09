import logging
from typing import Optional
from io import BytesIO
import httpx
from motor.motor_asyncio import AsyncIOMotorGridFSBucket, AsyncIOMotorDatabase
from bson import ObjectId

from services.db import get_db_handle

logger = logging.getLogger(__name__)


def get_gridfs_bucket(db: Optional[AsyncIOMotorDatabase] = None) -> AsyncIOMotorGridFSBucket:
    """Get GridFS bucket for storing images.
    
    Args:
        db: Optional database handle (will get default if not provided)
        
    Returns:
        GridFS bucket instance
    """
    if db is None:
        db = get_db_handle()
    return AsyncIOMotorGridFSBucket(db, bucket_name="images")


async def store_image_from_url(
    image_url: str,
    filename: Optional[str] = None,
    metadata: Optional[dict] = None,
    db: Optional[AsyncIOMotorDatabase] = None,
) -> str:
    """Download an image from a URL and store it in GridFS.
    
    Args:
        image_url: URL of the image to download
        filename: Optional filename for the stored image
        metadata: Optional metadata to store with the image
        db: Optional database handle (will get default if not provided)
        
    Returns:
        GridFS file ID as a string
    """
    try:
        logger.info(f"Downloading image from URL: {image_url}")
        
        # Download the image
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(image_url)
            response.raise_for_status()
            image_data = response.content
        
        logger.info(f"Downloaded {len(image_data)} bytes of image data")
        
        # Store in GridFS
        gridfs = get_gridfs_bucket(db)
        
        # Prepare metadata
        file_metadata = metadata or {}
        file_metadata["source_url"] = image_url
        
        # Determine content type from response headers or default to image/png
        content_type = response.headers.get("content-type", "image/png")
        file_metadata["content_type"] = content_type
        
        # Generate filename if not provided
        if not filename:
            filename = f"image_{ObjectId()}.png"
        
        # Upload to GridFS
        file_id = await gridfs.upload_from_stream(
            filename=filename,
            source=BytesIO(image_data),
            metadata=file_metadata,
        )
        
        file_id_str = str(file_id)
        logger.info(f"Stored image in GridFS with ID: {file_id_str}")
        
        return file_id_str
        
    except httpx.HTTPError as e:
        logger.error(f"Failed to download image from {image_url}: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Failed to store image in GridFS: {str(e)}")
        raise


async def get_image(
    file_id: str,
    db: Optional[AsyncIOMotorDatabase] = None,
) -> tuple[bytes, Optional[str]]:
    """Retrieve an image from GridFS.
    
    Args:
        file_id: GridFS file ID
        db: Optional database handle (will get default if not provided)
        
    Returns:
        Tuple of (image bytes, content_type)
    """
    try:
        if db is None:
            db = get_db_handle()
        gridfs = get_gridfs_bucket(db)
        
        # Convert string ID to ObjectId
        try:
            object_id = ObjectId(file_id)
        except Exception:
            raise ValueError(f"Invalid file ID format: {file_id}")
        
        # Find the file document in the files collection to get metadata
        files_collection = db.images.files
        file_doc = await files_collection.find_one({"_id": object_id})
        if not file_doc:
            raise ValueError(f"File not found in GridFS: {file_id}")
        
        # Get content type from metadata
        content_type = None
        if file_doc.get("metadata") and isinstance(file_doc["metadata"], dict):
            content_type = file_doc["metadata"].get("content_type")
        
        # Download from GridFS using download_to_stream
        destination = BytesIO()
        await gridfs.download_to_stream(object_id, destination)
        destination.seek(0)
        image_data = destination.read()
        
        logger.info(f"Retrieved image from GridFS: {file_id} ({len(image_data)} bytes)")
        
        return image_data, content_type
        
    except Exception as e:
        logger.error(f"Failed to retrieve image from GridFS: {file_id}, error: {str(e)}")
        raise


async def delete_image(
    file_id: str,
    db: Optional[AsyncIOMotorDatabase] = None,
) -> bool:
    """Delete an image from GridFS.
    
    Args:
        file_id: GridFS file ID
        db: Optional database handle (will get default if not provided)
        
    Returns:
        True if deleted, False if not found
    """
    try:
        gridfs = get_gridfs_bucket(db)
        
        # Convert string ID to ObjectId
        try:
            object_id = ObjectId(file_id)
        except Exception:
            raise ValueError(f"Invalid file ID format: {file_id}")
        
        # Delete from GridFS
        await gridfs.delete(object_id)
        
        logger.info(f"Deleted image from GridFS: {file_id}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to delete image from GridFS: {file_id}, error: {str(e)}")
        return False

