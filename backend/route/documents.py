import io
import os
from pathlib import Path
from urllib.parse import quote
from uuid import uuid4
import boto3
import fitz
from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

try:
    from ..ai.catalogue_chunks import build_index_chunks
    from ..ai.embeddings import get_embedding
    from ..general import database, models
    from ..general.auth import require_admin, get_current_user
except ImportError:
    from ai.catalogue_chunks import build_index_chunks
    from ai.embeddings import get_embedding
    from general import database, models
    from general.auth import require_admin, get_current_user

router = APIRouter(prefix="/api", tags=["documents"])
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


# Document Ingestion (stores an administrator's PDF or text file and indexes its extracted passages)
@router.post("/admin/upload")
async def upload_document(
    title: str = Form(...), category: str = Form(...), file: UploadFile = File(...),
    db: Session = Depends(database.get_db), admin: models.User = Depends(require_admin),
):
    extension = file.filename.split(".")[-1].lower()
    if extension not in {"pdf", "txt"}:
        raise HTTPException(status_code=400, detail="Only PDF and TXT are supported for AI indexing.")
    # Storage Identity (uses a generated object key independently of the document's display title)
    unique_filename = f"{uuid4()}.{extension}"
    file_bytes = await file.read()
    try:
        s3_client.put_object(Bucket=R2_BUCKET, Key=unique_filename, Body=file_bytes, ContentType=file.content_type)
    except Exception as exc:
        print("R2 Upload Error:", str(exc))
        raise HTTPException(status_code=500, detail="Internal server error saving file to Cloud Storage.")

    try:
        # Text Extraction (reads PDF page text or decodes a text upload before chunking)
        if extension == "pdf":
            document = fitz.open(stream=file_bytes, filetype="pdf")
            extracted_text = "".join(page.get_text() + "\n" for page in document)
        else:
            extracted_text = file_bytes.decode("utf-8")
    except Exception as exc:
        print("Text Extraction Error:", str(exc))
        raise HTTPException(status_code=500, detail="Could not read the text from the file.")

    try:
        new_doc = models.KnowledgeBase(
            title=title, category=category, file_path=unique_filename,
            file_type=extension, file_size=len(file_bytes), uploaded_by=admin.id,
        )
        db.add(new_doc)
        db.commit()
        db.refresh(new_doc)
        # Vector Indexing (keeps catalogue source labels and embeds passages with enough searchable text)
        chunks = build_index_chunks(extracted_text)
        for chunk in chunks:
            if len(chunk.strip()) > 20:
                vector = get_embedding(chunk)
                db.execute(text('''
                    INSERT INTO "AI chatbot"."document_chunks" (doc_id, content, embedding)
                    VALUES (:d, :c, :e)
                '''), {"d": new_doc.id, "c": chunk, "e": str(vector)})
        db.commit()
        return {"message": "Document uploaded and AI trained successfully"}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(exc))


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
