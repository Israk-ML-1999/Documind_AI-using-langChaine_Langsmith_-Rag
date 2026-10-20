import chromadb
from chromadb.config import Settings
import os

storage_path = os.getenv(
    "CHROMA_STORAGE_PATH",
    os.path.join(os.path.dirname(__file__), "../../../chroma_storage")
)
os.makedirs(storage_path, exist_ok=True)

_chroma_client = None

def get_chroma_client(refresh: bool = False):
    global _chroma_client
    if _chroma_client is None or refresh:
        _chroma_client = chromadb.PersistentClient(path=storage_path)
    return _chroma_client
