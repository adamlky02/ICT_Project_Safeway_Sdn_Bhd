import io
import os
from uuid import uuid4
import boto3
import fitz
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

try:
    from ..ai.embeddings import get_embedding
    from ..general import database, models
    from ..general.auth import require_admin
except ImportError:
    from ai.embeddings import get_embedding
    from general import database, models
    from general.auth import require_admin

router = APIRouter(prefix="/api", tags=["documents"])
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
s3_client = boto3.client(
    "s3", endpoint_url=os.getenv("R2_ENDPOINT_URL"),
    aws_access_key_id=os.getenv("R2_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY"),
)
R2_BUCKET = os.getenv("R2_BUCKET_NAME")


@router.get("/admin/documents")
def get_docs(db: Session = Depends(database.get_db), _admin: models.User = Depends(require_admin)):
    return db.query(models.KnowledgeBase).all()


@router.post("/admin/upload")
async def upload_document(
    title: str = Form(...), category: str = Form(...), file: UploadFile = File(...),
    db: Session = Depends(database.get_db), admin: models.User = Depends(require_admin),
):
    extension = file.filename.split(".")[-1].lower()
    if extension not in {"pdf", "txt"}:
        raise HTTPException(status_code=400, detail="Only PDF and TXT are supported for AI indexing.")
    unique_filename = f"{uuid4()}.{extension}"
    file_bytes = await file.read()
    try:
        s3_client.put_object(Bucket=R2_BUCKET, Key=unique_filename, Body=file_bytes, ContentType=file.content_type)
    except Exception as exc:
        print("R2 Upload Error:", str(exc))
        raise HTTPException(status_code=500, detail="Internal server error saving file to Cloud Storage.")

    try:
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
        chunks = [extracted_text[i:i + 1000] for i in range(0, len(extracted_text), 1000)]
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


@router.get("/files/{filename}")
async def get_file(filename: str):
    try:
        obj = s3_client.get_object(Bucket=R2_BUCKET, Key=filename)
        return StreamingResponse(io.BytesIO(obj["Body"].read()), media_type="application/pdf")
    except Exception:
        file_path = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(file_path):
            return FileResponse(file_path)
        raise HTTPException(status_code=404, detail="PDF File not found")
