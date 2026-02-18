"""
Zvec Vector Database REST API
A FastAPI wrapper for the Zvec in-process vector database
"""

import os
import uuid
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import zvec

# Configuration
DATA_PATH = os.getenv("ZVEC_DATA_PATH", "./zvec_data")
DEFAULT_DIMENSION = int(os.getenv("ZVEC_DIMENSION", "128"))

# Global collection reference
collection = None


class CollectionCreate(BaseModel):
    """Schema for creating a new collection"""
    name: str = Field(..., description="Collection name")
    dimension: int = Field(default=DEFAULT_DIMENSION, description="Vector dimension")
    description: Optional[str] = Field(default=None, description="Collection description")


class DocumentInsert(BaseModel):
    """Schema for inserting documents"""
    id: Optional[str] = Field(default=None, description="Document ID (auto-generated if not provided)")
    vector: list[float] = Field(..., description="Embedding vector")
    metadata: Optional[dict] = Field(default=None, description="Additional metadata")


class BatchInsert(BaseModel):
    """Schema for batch document insertion"""
    documents: list[DocumentInsert]


class VectorSearch(BaseModel):
    """Schema for vector similarity search"""
    vector: list[float] = Field(..., description="Query vector")
    top_k: int = Field(default=10, ge=1, le=1000, description="Number of results")
    filter: Optional[dict] = Field(default=None, description="Metadata filters")


class SearchResult(BaseModel):
    """Schema for search result"""
    id: str
    score: float
    metadata: Optional[dict] = None


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    collection: Optional[str]
    document_count: int
    dimension: Optional[int]


class CollectionInfo(BaseModel):
    """Collection information response"""
    name: str
    dimension: int
    document_count: int
    data_path: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize collection on startup"""
    global collection
    
    # Ensure data directory exists
    os.makedirs(DATA_PATH, exist_ok=True)
    
    # Create default collection if it doesn't exist
    collection_path = os.path.join(DATA_PATH, "default")
    
    try:
        schema = zvec.CollectionSchema(
            name="default",
            vectors=zvec.VectorSchema("embedding", zvec.DataType.VECTOR_FP32, DEFAULT_DIMENSION),
        )
        collection = zvec.create_and_open(path=collection_path, schema=schema)
        print(f"✅ Zvec collection initialized at {collection_path}")
    except Exception as e:
        print(f"❌ Failed to initialize collection: {e}")
        raise
    
    yield
    
    # Cleanup
    if collection:
        collection.close()
        print("🔴 Zvec collection closed")


app = FastAPI(
    title="Zvec Vector Database API",
    description="REST API for Zvec - lightweight, lightning-fast in-process vector database",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information"""
    return {
        "name": "Zvec Vector Database API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint"""
    doc_count = 0
    if collection:
        try:
            # Get document count (approximate)
            doc_count = collection.count() if hasattr(collection, 'count') else 0
        except:
            pass
    
    return HealthResponse(
        status="healthy",
        collection="default" if collection else None,
        document_count=doc_count,
        dimension=DEFAULT_DIMENSION if collection else None
    )


@app.get("/collection/info", response_model=CollectionInfo, tags=["Collection"])
async def get_collection_info():
    """Get current collection information"""
    if not collection:
        raise HTTPException(status_code=503, detail="Collection not initialized")
    
    doc_count = 0
    try:
        doc_count = collection.count() if hasattr(collection, 'count') else 0
    except:
        pass
    
    return CollectionInfo(
        name="default",
        dimension=DEFAULT_DIMENSION,
        document_count=doc_count,
        data_path=DATA_PATH
    )


@app.post("/documents", tags=["Documents"])
async def insert_document(doc: DocumentInsert):
    """Insert a single document into the collection"""
    if not collection:
        raise HTTPException(status_code=503, detail="Collection not initialized")
    
    # Validate vector dimension
    if len(doc.vector) != DEFAULT_DIMENSION:
        raise HTTPException(
            status_code=400, 
            detail=f"Vector dimension mismatch. Expected {DEFAULT_DIMENSION}, got {len(doc.vector)}"
        )
    
    # Generate ID if not provided
    doc_id = doc.id or str(uuid.uuid4())
    
    try:
        zvec_doc = zvec.Doc(
            id=doc_id,
            vectors={"embedding": doc.vector}
        )
        collection.insert([zvec_doc])
        return {"id": doc_id, "status": "inserted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/documents/batch", tags=["Documents"])
async def batch_insert_documents(batch: BatchInsert):
    """Insert multiple documents at once"""
    if not collection:
        raise HTTPException(status_code=503, detail="Collection not initialized")
    
    inserted_ids = []
    errors = []
    
    for i, doc in enumerate(batch.documents):
        # Validate vector dimension
        if len(doc.vector) != DEFAULT_DIMENSION:
            errors.append({
                "index": i,
                "error": f"Vector dimension mismatch. Expected {DEFAULT_DIMENSION}, got {len(doc.vector)}"
            })
            continue
        
        doc_id = doc.id or str(uuid.uuid4())
        
        try:
            zvec_doc = zvec.Doc(
                id=doc_id,
                vectors={"embedding": doc.vector}
            )
            collection.insert([zvec_doc])
            inserted_ids.append(doc_id)
        except Exception as e:
            errors.append({"index": i, "error": str(e)})
    
    return {
        "inserted_count": len(inserted_ids),
        "inserted_ids": inserted_ids,
        "errors": errors if errors else None
    }


@app.post("/search", response_model=list[SearchResult], tags=["Search"])
async def search_vectors(query: VectorSearch):
    """Search for similar vectors"""
    if not collection:
        raise HTTPException(status_code=503, detail="Collection not initialized")
    
    # Validate query vector dimension
    if len(query.vector) != DEFAULT_DIMENSION:
        raise HTTPException(
            status_code=400,
            detail=f"Vector dimension mismatch. Expected {DEFAULT_DIMENSION}, got {len(query.vector)}"
        )
    
    try:
        vector_query = zvec.VectorQuery("embedding", vector=query.vector)
        results = collection.query(vector_query, topk=query.top_k)
        
        return [
            SearchResult(
                id=r.get("id", ""),
                score=r.get("score", 0.0),
                metadata=r.get("metadata")
            )
            for r in results
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/documents/{doc_id}", tags=["Documents"])
async def delete_document(doc_id: str):
    """Delete a document by ID"""
    if not collection:
        raise HTTPException(status_code=503, detail="Collection not initialized")
    
    try:
        collection.delete([doc_id])
        return {"id": doc_id, "status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/collection", tags=["Collection"])
async def clear_collection():
    """Clear all documents from the collection"""
    global collection
    
    if not collection:
        raise HTTPException(status_code=503, detail="Collection not initialized")
    
    try:
        collection.close()
        
        # Re-create empty collection
        collection_path = os.path.join(DATA_PATH, "default")
        schema = zvec.CollectionSchema(
            name="default",
            vectors=zvec.VectorSchema("embedding", zvec.DataType.VECTOR_FP32, DEFAULT_DIMENSION),
        )
        collection = zvec.create_and_open(path=collection_path, schema=schema)
        
        return {"status": "cleared", "collection": "default"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
