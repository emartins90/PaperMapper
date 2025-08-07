import boto3
import os
from typing import List, Optional
from fastapi import UploadFile, HTTPException
import uuid
from pathlib import Path
from botocore.exceptions import ClientError

# File upload limits
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB per file
MAX_FILES_PER_CARD = 5  # 5 files per card
MAX_TOTAL_SIZE_PER_CARD = 200 * 1024 * 1024  # 200MB total per card

class R2Storage:
    """Handles file uploads to Cloudflare R2 storage"""
    
    def __init__(self):
        from config import settings
        # Initialize R2 client (S3-compatible)
        self.s3_client = boto3.client(
            's3',
            endpoint_url=settings.R2_ENDPOINT_URL,
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            region_name='auto'  # R2 uses 'auto' as region
        )
        self.bucket_name = settings.R2_BUCKET_NAME
    
    def validate_file_size(self, file: UploadFile) -> None:
        """Validate individual file size"""
        if file.size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400, 
                detail=f"File '{file.filename}' is too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB"
            )
    
    def validate_file_count(self, files: List[UploadFile], existing_count: int = 0) -> None:
        """Validate total number of files per card"""
        total_files = len(files) + existing_count
        if total_files > MAX_FILES_PER_CARD:
            raise HTTPException(
                status_code=400,
                detail=f"Too many files. Maximum {MAX_FILES_PER_CARD} files per card. You currently have {existing_count} files and are trying to add {len(files)} more."
            )
    
    def validate_total_size(self, files: List[UploadFile], existing_size: int = 0) -> None:
        """Validate total size of all files per card"""
        total_size = sum(file.size for file in files) + existing_size
        if total_size > MAX_TOTAL_SIZE_PER_CARD:
            raise HTTPException(
                status_code=400,
                detail=f"Total file size too large. Maximum {MAX_TOTAL_SIZE_PER_CARD // (1024 * 1024)}MB total per card. Current total would be {total_size // (1024 * 1024)}MB."
            )
    
    async def upload_file(self, file: UploadFile, folder: str = "uploads") -> dict:
        """
        Upload a single file to R2
        
        Args:
            file: FastAPI UploadFile object
            folder: R2 folder to store the file in
            
        Returns:
            dict: Contains file_url, key, and other metadata
        """
        try:
            # Validate file size
            self.validate_file_size(file)
            
            # Generate unique filename
            file_extension = Path(file.filename).suffix
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            key = f"{folder}/{unique_filename}"
            
            # Upload to R2
            self.s3_client.upload_fileobj(
                file.file,
                self.bucket_name,
                key,
                ExtraArgs={
                    'ContentType': file.content_type
                }
            )
            
            # Generate public URL using Cloudflare's public URL format
            file_url = f"https://pub-{self.bucket_name}.r2.dev/{key}"
            
            return {
                "file_url": file_url,
                "key": key,
                "filename": file.filename,
                "content_type": file.content_type
            }
            
        except Exception as e:
            raise Exception(f"Failed to upload file to R2: {str(e)}")
    
    async def upload_multiple_files(self, files: List[UploadFile], folder: str = "uploads", existing_count: int = 0, existing_size: int = 0) -> List[dict]:
        """
        Upload multiple files to R2
        
        Args:
            files: List of FastAPI UploadFile objects
            folder: R2 folder to store the files in
            existing_count: Number of existing files on the card
            existing_size: Total size of existing files on the card in bytes
            
        Returns:
            List[dict]: List of upload results
        """
        # Validate file count and size before uploading
        self.validate_file_count(files, existing_count)
        self.validate_total_size(files, existing_size)
        
        # Validate individual file sizes
        for file in files:
            self.validate_file_size(file)
        
        results = []
        for file in files:
            result = await self.upload_file(file, folder)
            results.append(result)
        return results
    
    async def delete_file(self, key: str) -> bool:
        """
        Delete a file from R2
        
        Args:
            key: R2 object key
            
        Returns:
            bool: True if deletion was successful
        """
        try:
            print(f"[R2] Deleting file: {key}")
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=key
            )
            print(f"[R2] Successfully deleted file: {key}")
            return True
        except ClientError as e:
            print(f"[R2] Failed to delete file {key}: {e}")
            return False
        except Exception as e:
            print(f"[R2] Unexpected error deleting file {key}: {e}")
            return False
    
    def extract_key_from_url(self, url: str) -> Optional[str]:
        """
        Extract R2 object key from a URL
        
        Args:
            url: R2 URL (format: https://pub-{bucket-name}.r2.dev/{key})
            
        Returns:
            str: object key or None if not a valid R2 URL
        """
        try:
            # R2 public URLs look like: https://pub-{bucket-name}.r2.dev/{key}
            if "r2.dev" in url:
                # Extract the part after the domain
                parts = url.split(f"pub-{self.bucket_name}.r2.dev/")
                if len(parts) > 1:
                    return parts[1]
            return None
        except Exception:
            return None 