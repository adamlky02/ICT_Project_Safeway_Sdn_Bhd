import io
import logging
import os
from pathlib import Path
from urllib.parse import quote
from uuid import uuid4
import boto3
from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

try:
    from ..ai.indexing import MAX_DOCUMENT_BYTES, prepare_document_index, replace_document_index
    from ..ai.embeddings import EmbeddingError
    from ..general import database, models
    from ..login.auth import require_admin, get_current_user
except ImportError:
    from ai.indexing import MAX_DOCUMENT_BYTES, prepare_document_index, replace_document_index
    from ai.embeddings import EmbeddingError
    from general import database, models
    from login.auth import require_admin, get_current_user

router = APIRouter(prefix="/api", tags=["documents"])
logger = logging.getLogger(__name__)
# Document Storage (configures cloud objects and the local fallback used by authenticated previews)
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
s3_client = boto3.client(
    "s3", endpoint_url=os.getenv("R2_ENDPOINT_URL"),
    aws_access_key_id=os.getenv("R2_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY"),
)
R2_BUCKET = os.getenv("R2_BUCKET_NAME")


# Document Directory (lists registered knowledge-base documents for administrators)
@router.get("/admin/documents")
def get_docs(db: Session = Depends(database.get_db), _admin: models.User = Depends(require_admin)):
    return db.query(models.KnowledgeBase).all()


# Document Ingestion (extracts and embeds before committing the document and its complete index)
@router.post("/admin/upload")
def upload_document(
    title: str = Form(...), category: str = Form(...), file: UploadFile = File(...),
    db: Session = Depends(database.get_db), admin: models.User = Depends(require_admin),
):
    extension = (file.filename or "").rsplit(".", 1)[-1].lower()
    if extension not in {"pdf", "txt"}:
        raise HTTPException(status_code=400, detail="Only PDF and TXT are supported for AI indexing.")
    file_bytes = file.file.read(MAX_DOCUMENT_BYTES + 1)
    if len(file_bytes) > MAX_DOCUMENT_BYTES:
        raise HTTPException(status_code=413, detail="Documents must be at most 25 MB.")
    if not title.strip() or len(title) > 255 or len(category) > 50:
        raise HTTPException(status_code=422, detail="A document title and valid category are required.")
    try:
        prepared = prepare_document_index(file_bytes, extension, title)
    except EmbeddingError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from None
    except Exception:
        raise HTTPException(status_code=422, detail="Could not extract searchable text. Use a UTF-8 TXT or a text-based PDF; scanned PDFs need OCR.") from None

    unique_filename = f"{uuid4()}.{extension}"
    try:
        s3_client.put_object(Bucket=R2_BUCKET, Key=unique_filename, Body=file_bytes, ContentType=file.content_type)
    except Exception:
        raise HTTPException(status_code=502, detail="Could not save the document to cloud storage.") from None
    try:
        new_doc = models.KnowledgeBase(
            title=title.strip(), category=category, file_path=unique_filename,
            file_type=extension, file_size=len(file_bytes), uploaded_by=admin.id,
        )
        db.add(new_doc)
        db.flush()
        replace_document_index(db, new_doc.id, prepared)
        db.commit()
        return {"message": "Document uploaded and indexed successfully", "indexed_chunks": len(prepared)}
    except Exception:
        db.rollback()
        try:
            s3_client.delete_object(Bucket=R2_BUCKET, Key=unique_filename)
        except Exception:
            logger.warning("Failed to remove a new document object after index transaction failure")
        raise HTTPException(status_code=500, detail="Could not commit the document index. Verify the retrieval migration is installed.") from None

# Document Removal (attempts cloud-object deletion before removing the registered document)
@router.delete("/admin/documents/{did}")
def delete_doc(did: int, db: Session = Depends(database.get_db), _admin: models.User = Depends(require_admin)):
    doc = db.query(models.KnowledgeBase).filter(models.KnowledgeBase.id == did).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.file_path:
        try:
            s3_client.delete_object(Bucket=R2_BUCKET, Key=doc.file_path)
        except Exception as exc:
            print("R2 Delete Error:", str(exc))
    db.delete(doc)
    db.commit()
    return {"message": "Document and physical file deleted"}


# Administrator Download (streams a registered cloud object with attachment and private-cache headers)
@router.get("/admin/documents/{did}/download")
def download_doc(did: int, db: Session = Depends(database.get_db), _admin: models.User = Depends(require_admin)):
    doc = db.query(models.KnowledgeBase).filter(models.KnowledgeBase.id == did).first()
    if not doc or not doc.file_path:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        obj = s3_client.get_object(Bucket=R2_BUCKET, Key=doc.file_path)
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") in {"NoSuchKey", "404", "NotFound"}:
            raise HTTPException(status_code=404, detail="Document file not found") from exc
        raise HTTPException(status_code=502, detail="Could not download document from cloud storage") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Could not download document from cloud storage") from exc

    # Download Filename (removes path separators and encodes a readable attachment name)
    extension = "pdf" if doc.file_type == "pdf" else "txt"
    base_name = "".join(char for char in doc.title if char.isprintable() and char not in '/\\').strip()[:120]
    base_name = base_name or f"document-{did}"
    filename = base_name if base_name.lower().endswith(f".{extension}") else f"{base_name}.{extension}"
    headers = {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}",
    }

    # Stream Cleanup (reads bounded chunks and closes the cloud response body when streaming ends)
    def stream_file():
        body = obj["Body"]
        try:
            while chunk := body.read(64 * 1024):
                yield chunk
        finally:
            body.close()

    media_type = "application/pdf" if extension == "pdf" else "text/plain"
    return StreamingResponse(stream_file(), media_type=media_type, headers=headers)


# Authenticated File Preview (serves only registered document keys and rejects path-like filenames)
@router.get("/files/{filename}")
async def get_file(filename: str, db: Session = Depends(database.get_db), _user: models.User = Depends(get_current_user)):
    if "/" in filename or "\\" in filename or filename in {".", ".."}:
        raise HTTPException(status_code=404, detail="Document not found")
    doc = db.query(models.KnowledgeBase).filter(models.KnowledgeBase.file_path == filename).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    headers = {"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"}
    media_type = "application/pdf" if doc.file_type == "pdf" else "text/plain"
    try:
        obj = s3_client.get_object(Bucket=R2_BUCKET, Key=filename)
        return StreamingResponse(io.BytesIO(obj["Body"].read()), media_type=media_type, headers=headers)
    except Exception:
        # Local Preview Fallback (resolves the file and confirms it stays within the upload directory)
        upload_root = Path(UPLOAD_DIR).resolve()
        file_path = (upload_root / filename).resolve()
        if file_path.is_relative_to(upload_root) and file_path.is_file():
            return FileResponse(file_path, media_type=media_type, headers=headers)
        raise HTTPException(status_code=404, detail="Document not found")
