import os
from google.cloud import secretmanager
from google.cloud import storage
from google.cloud import tasks_v2
from google.cloud import logging as cloud_logging
import logging

logger = logging.getLogger(__name__)

class GCPServices:
    """
    Centralized manager for Google Cloud Platform services.
    """
    _instance = None
    
    def __init__(self):
        self.project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
        self.credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        
        self._secret_client = None
        self._storage_client = None
        self._tasks_client = None
        self._logging_client = None
        
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = GCPServices()
        return cls._instance

    @property
    def secret_client(self):
        if not self._secret_client:
            try:
                self._secret_client = secretmanager.SecretManagerServiceClient()
            except Exception as e:
                logger.error(f"Failed to initialize Secret Manager client: {e}")
        return self._secret_client

    @property
    def storage_client(self):
        if not self._storage_client:
            try:
                self._storage_client = storage.Client()
            except Exception as e:
                logger.error(f"Failed to initialize Storage client: {e}")
        return self._storage_client
        
    @property
    def tasks_client(self):
        if not self._tasks_client:
            try:
                self._tasks_client = tasks_v2.CloudTasksClient()
            except Exception as e:
                logger.error(f"Failed to initialize Tasks client: {e}")
        return self._tasks_client
        
    def setup_logging(self):
        """
        Attaches Cloud Logging handler if available.
        Integrates with the standard Python logging module.
        """
        try:
            client = cloud_logging.Client()
            client.setup_logging()
            logger.info("GCP Cloud Logging configured successfully.")
        except Exception as e:
            logger.warning(f"Could not setup GCP Logging: {e}")

    def get_secret(self, secret_id: str, version_id: str = "latest") -> str | None:
        """
        Retrieves a secret from Secret Manager.
        """
        if not self.secret_client or not self.project_id:
            logger.warning("Secret Manager client not initialized or Project ID missing.")
            return None
            
        try:
            name = f"projects/{self.project_id}/secrets/{secret_id}/versions/{version_id}"
            response = self.secret_client.access_secret_version(request={"name": name})
            return response.payload.data.decode("UTF-8")
        except Exception as e:
            logger.error(f"Error retrieving secret {secret_id}: {e}")
            return None

    def upload_file(self, file_obj, destination_blob_name: str, bucket_name: str | None = None) -> str | None:
        """
        Uploads a file-like object to the bucket.
        Returns the gs:// URI.
        """
        bucket_name = bucket_name or os.getenv("GCS_BUCKET_NAME")
        if not self.storage_client or not bucket_name:
            logger.warning("Storage client not initialized or Bucket Name missing.")
            return None
            
        try:
            bucket = self.storage_client.bucket(bucket_name)
            blob = bucket.blob(destination_blob_name)
            
            # Reset file pointer if possible
            if hasattr(file_obj, 'seek'):
                file_obj.seek(0)
                
            blob.upload_from_file(file_obj)
            logger.info(f"File uploaded to {destination_blob_name}.")
            return f"gs://{bucket_name}/{destination_blob_name}"
        except Exception as e:
            logger.error(f"Error uploading file {destination_blob_name}: {e}")
            return None

    def download_file(self, blob_name: str, destination_file_obj, bucket_name: str | None = None) -> bool:
        """
        Downloads a blob to a file-like object.
        """
        bucket_name = bucket_name or os.getenv("GCS_BUCKET_NAME")
        if not self.storage_client or not bucket_name:
             logger.warning("Storage client not initialized or Bucket Name missing.")
             return False

        try:
            bucket = self.storage_client.bucket(bucket_name)
            blob = bucket.blob(blob_name)
            if not blob.exists():
                return False
            blob.download_to_file(destination_file_obj)
            return True
        except Exception as e:
            logger.error(f"Error downloading blob {blob_name}: {e}")
            return False

    def download_to_filename(self, blob_name: str, destination_filename: str, bucket_name: str | None = None) -> bool:
        """
        Downloads a blob to a local filename.
        """
        bucket_name = bucket_name or os.getenv("GCS_BUCKET_NAME")
        if not self.storage_client or not bucket_name:
             logger.warning("Storage client not initialized or Bucket Name missing.")
             return False

        try:
            bucket = self.storage_client.bucket(bucket_name)
            blob = bucket.blob(blob_name)
            if not blob.exists():
                return False
            blob.download_to_filename(destination_filename)
            return True
        except Exception as e:
            logger.error(f"Error downloading blob {blob_name} to file: {e}")
            return False

    def open_file_stream(self, blob_name: str, bucket_name: str | None = None):
        """
        Opens a stream for reading.
        """
        bucket_name = bucket_name or os.getenv("GCS_BUCKET_NAME")
        if not self.storage_client or not bucket_name:
             logger.warning("Storage client not initialized or Bucket Name missing.")
             return None

        try:
            bucket = self.storage_client.bucket(bucket_name)
            blob = bucket.blob(blob_name)
            if not blob.exists():
                return None
            return blob.open("rb")
        except Exception as e:
            logger.error(f"Error opening stream for {blob_name}: {e}")
            return None

    def create_http_task(self, queue_path: str, url: str, payload: dict, http_method: str = "POST") -> str | None:
        """
        Creates an HTTP Task in Cloud Tasks.
        """
        if not self.tasks_client:
            logger.warning("Tasks client not initialized.")
            return None
            
        try:
             # Construct the request body.
            task = {
                "http_request": {  # Specify the type of request.
                    "http_method": tasks_v2.HttpMethod.POST,
                    "url": url,  # The full URL path that the task will call.
                    "headers": {"Content-Type": "application/json"},
                }
            }
            
            # The API expects a payload of type bytes.
            import json
            converted_payload = json.dumps(payload).encode()

            # Add the payload to the request.
            task["http_request"]["body"] = converted_payload
            
            # OIDC Token for authentication (if needed, assuming service account has permissions)
            # service_account_email = "..." 
            # task["http_request"]["oidc_token"] = {"service_account_email": service_account_email}

            # Use the client to build the task credentials
            response = self.tasks_client.create_task(
                request={"parent": queue_path, "task": task}
            )
            logger.info(f"Created task {response.name}")
            return response.name
        except Exception as e:
            logger.error(f"Error creating task: {e}")
            return None

    def generate_signed_url(self, blob_name: str, expiration=3600, bucket_name: str | None = None) -> str | None:
        """
        Generates a V4 signed URL for downloading a blob.
        """
        bucket_name = bucket_name or os.getenv("GCS_BUCKET_NAME")
        if not self.storage_client or not bucket_name:
            logger.warning("Storage client not initialized or Bucket Name missing.")
            return None
            
        try:
            bucket = self.storage_client.bucket(bucket_name)
            blob = bucket.blob(blob_name)
            
            url = blob.generate_signed_url(
                version="v4",
                expiration=expiration,
                method="GET"
            )
            return url
        except Exception as e:
            logger.error(f"Error generating signed URL for {blob_name}: {e}")
            return None

gcp_services = GCPServices.get_instance()
