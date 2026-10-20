import os
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from typing import List, Dict

def extract_text_from_pdf(file_path: str) -> str:
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    return text

def get_text_chunks(text: str, user_id: str, document_id: str) -> List[Dict]:
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len
    )
    chunks = text_splitter.split_text(text)
    
    formatted_chunks = []
    for i, chunk in enumerate(chunks):
        formatted_chunks.append({
            "id": f"{document_id}_chunk_{i}",
            "text": chunk,
            "metadata": {
                "user_id": user_id,
                "document_id": document_id
            }
        })
    return formatted_chunks
