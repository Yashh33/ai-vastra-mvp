import os
from datetime import datetime
from dotenv import load_dotenv
import boto3

load_dotenv()

account_id = os.environ["R2_ACCOUNT_ID"]
access_key = os.environ["R2_ACCESS_KEY_ID"]
secret_key = os.environ["R2_SECRET_ACCESS_KEY"]
bucket = os.environ["R2_BUCKET_NAME"]

endpoint_url = f"https://{account_id}.r2.cloudflarestorage.com"

s3 = boto3.client(
    "s3",
    endpoint_url=endpoint_url,
    aws_access_key_id=access_key,
    aws_secret_access_key=secret_key,
    region_name="auto",
)

key = f"test/hello_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.txt"
body = b"hello from ai-vastra"

print("Uploading to bucket:", bucket)
print("Endpoint:", endpoint_url)
print("Key:", key)

s3.put_object(Bucket=bucket, Key=key, Body=body, ContentType="text/plain")

print("✅ Uploaded successfully")
