import os
import json
import uuid
from datetime import datetime, timedelta
from typing import Optional

import boto3
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException, Header, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from PIL import Image, ImageDraw, ImageFont

load_dotenv()

app = FastAPI()

# CORS for dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------
# R2 / S3 client
# ---------------------------
def get_s3():
    account_id = os.environ["R2_ACCOUNT_ID"]
    access_key = os.environ["R2_ACCESS_KEY_ID"]
    secret_key = os.environ["R2_SECRET_ACCESS_KEY"]
    endpoint_url = f"https://{account_id}.r2.cloudflarestorage.com"

    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name="auto",
    )

R2_BUCKET = os.environ["R2_BUCKET_NAME"]
s3 = get_s3()

# ---------------------------
# Simple Shop Auth (MVP)
# Header: X-Shop-Token
# ---------------------------
SHOP_SECRET = os.environ.get("SHOP_SECRET", "dev-secret")  # for token signing
SHOPS_FILE = os.path.join(os.path.dirname(__file__), "shops.json")

def load_shops():
    with open(SHOPS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def make_token(shop_id: str) -> str:
    # very simple token (MVP only). We'll improve later.
    return f"{shop_id}:{SHOP_SECRET}"

def verify_token(token: str) -> Optional[str]:
    try:
        shop_id, secret = token.split(":", 1)
        if secret == SHOP_SECRET:
            return shop_id
    except Exception:
        return None
    return None

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/auth/shop")
def auth_shop(payload: dict = Body(...)):
    shop_code = payload.get("shop_code")
    pin = payload.get("pin")

    if not shop_code or not pin:
        raise HTTPException(status_code=400, detail="shop_code and pin required")

    shops = load_shops()
    # normalize
    shop_code_norm = str(shop_code).strip().lower()

    for s in shops:
        if str(s.get("shop_code", "")).strip().lower() == shop_code_norm and str(s.get("pin")) == str(pin).strip():
            token = make_token(s["shop_id"])
            return {"shop_id": s["shop_id"], "shop_name": s["shop_name"], "token": token}

    raise HTTPException(status_code=401, detail="Invalid shop code or PIN")

@app.get("/me")
def me(x_shop_token: Optional[str] = Header(default=None, alias="X-Shop-Token")):
    if not x_shop_token:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    shop_id = verify_token(x_shop_token)
    if not shop_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    return {"ok": True, "shop_id": shop_id, "issued_at": datetime.utcnow().isoformat()}

def require_shop(x_shop_token: Optional[str]) -> str:
    if not x_shop_token:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    shop_id = verify_token(x_shop_token)
    if not shop_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    return shop_id

# ---------------------------
# Helpers
# ---------------------------
def r2_put_bytes(key: str, data: bytes, content_type: str):
    s3.put_object(Bucket=R2_BUCKET, Key=key, Body=data, ContentType=content_type)

def r2_put_fileobj(key: str, fileobj, content_type: str):
    s3.upload_fileobj(fileobj, R2_BUCKET, key, ExtraArgs={"ContentType": content_type})

def r2_presign_get_url(key: str, expires_seconds: int = 3600) -> str:
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": R2_BUCKET, "Key": key},
        ExpiresIn=expires_seconds,
    )

# ---------------------------
# Upload (fabric/hero)
# ---------------------------
@app.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    kind: str = "misc",  # fabric|hero|output|misc
    x_shop_token: Optional[str] = Header(default=None, alias="X-Shop-Token"),
):
    shop_id = require_shop(x_shop_token)

    ext = (file.filename or "file").split(".")[-1].lower()
    if ext not in ["jpg", "jpeg", "png", "webp"]:
        raise HTTPException(status_code=400, detail="Only jpg/jpeg/png/webp allowed")

    content_type = file.content_type or "application/octet-stream"
    uid = uuid.uuid4().hex
    key = f"shops/{shop_id}/{kind}/{datetime.utcnow().strftime('%Y%m%d')}/{uid}.{ext}"

    await file.seek(0)
    r2_put_fileobj(key, file.file, content_type)

    url = r2_presign_get_url(key)
    return {"key": key, "url": url}

# ---------------------------
# Serve file via redirect to signed URL
# ---------------------------
@app.get("/file")
def get_file(
    key: str,
    x_shop_token: Optional[str] = Header(default=None, alias="X-Shop-Token"),
):
    shop_id = require_shop(x_shop_token)
    # basic safety: enforce shop prefix
    if not key.startswith(f"shops/{shop_id}/"):
        raise HTTPException(status_code=403, detail="Forbidden")

    signed = r2_presign_get_url(key)
    return RedirectResponse(signed)

# ---------------------------
# Dummy generate endpoint
# ---------------------------
@app.post("/generate-dummy")
def generate_dummy(
    payload: dict = Body(...),
    x_shop_token: Optional[str] = Header(default=None, alias="X-Shop-Token"),
):
    shop_id = require_shop(x_shop_token)

    fabric_key = payload.get("fabric_key")
    hero_key = payload.get("hero_key")

    if not fabric_key or not hero_key:
        raise HTTPException(status_code=400, detail="fabric_key and hero_key required")

    # Create a dummy image
    img = Image.new("RGB", (1024, 1024), color=(245, 245, 245))
    draw = ImageDraw.Draw(img)
    text = "DUMMY OUTPUT\n(AI Vastra)"
    draw.text((60, 80), text, fill=(20, 20, 20))

    draw.text((60, 220), f"shop: {shop_id}", fill=(20, 20, 20))
    draw.text((60, 260), f"fabric_key:\n{fabric_key[:90]}...", fill=(20, 20, 20))
    draw.text((60, 340), f"hero_key:\n{hero_key[:90]}...", fill=(20, 20, 20))

    # to bytes
    import io
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    data = buf.getvalue()

    job_id = uuid.uuid4().hex
    out_key = f"shops/{shop_id}/output/{datetime.utcnow().strftime('%Y%m%d')}/{job_id}.png"
    r2_put_bytes(out_key, data, "image/png")

    # write history json
    record = {
        "job_id": job_id,
        "shop_id": shop_id,
        "created_at": datetime.utcnow().isoformat(),
        "fabric_key": fabric_key,
        "hero_key": hero_key,
        "output_key": out_key,
    }
    hist_key = f"shops/{shop_id}/history/{datetime.utcnow().strftime('%Y%m%d')}/{job_id}.json"
    r2_put_bytes(hist_key, json.dumps(record).encode("utf-8"), "application/json")

    return {
        "job_id": job_id,
        "output_key": out_key,
        "output_url": r2_presign_get_url(out_key),
        "history_key": hist_key,
    }

# ---------------------------
# History list
# ---------------------------
@app.get("/history")
def history(
    limit: int = 20,
    x_shop_token: Optional[str] = Header(default=None, alias="X-Shop-Token"),
):
    shop_id = require_shop(x_shop_token)
    prefix = f"shops/{shop_id}/history/"

    resp = s3.list_objects_v2(Bucket=R2_BUCKET, Prefix=prefix)
    items = resp.get("Contents", [])

    # sort newest first by LastModified
    items.sort(key=lambda x: x["LastModified"], reverse=True)
    items = items[: max(1, min(limit, 50))]

    # fetch json records
    records = []
    for it in items:
        key = it["Key"]
        obj = s3.get_object(Bucket=R2_BUCKET, Key=key)
        data = obj["Body"].read()
        try:
            records.append(json.loads(data))
        except Exception:
            continue

    return {"count": len(records), "records": records}
