import re
from typing import List, Dict, Tuple, Optional
from app.core.vector_db import get_chroma_client
from langchain_community.embeddings import HuggingFaceEmbeddings

# You can use a local embedding model to avoid API costs, or switch to Gemini
# Let's use HuggingFace MiniLM for fast local embeddings by default
try:
    from chromadb.utils import embedding_functions
    sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
except Exception:
    sentence_transformer_ef = None

def compute_keyword_overlap(query: str, text: str) -> float:
    """Computes percentage of significant query keywords present in chunk text."""
    stop_words = {
        "what", "when", "where", "which", "who", "whom", "whose", "why", "how", 
        "this", "that", "these", "those", "is", "are", "was", "were", "be", "been", 
        "being", "have", "has", "had", "do", "does", "did", "the", "a", "an", "and", 
        "or", "but", "in", "on", "at", "to", "for", "with", "about", "against", "between", 
        "into", "through", "during", "before", "after", "above", "below", "from", "up", 
        "down", "out", "off", "over", "under", "tell", "explain", "describe", "give", "please"
    }
    query_words = [w.lower() for w in re.findall(r'\b[A-Za-z0-9_]{3,}\b', query) if w.lower() not in stop_words]
    if not query_words:
        return 0.0
    text_lower = text.lower()
    matches = sum(1 for w in query_words if w in text_lower)
    return round(matches / len(query_words), 2)

def distance_to_similarity(dist: float) -> float:
    """Converts ChromaDB distance to a normalized 0.0-1.0 similarity score."""
    if dist <= 2.0:
        sim = 1.0 - (dist / 2.0)
    else:
        sim = 1.0 / (1.0 + dist)
    return max(0.0, min(1.0, round(sim, 4)))

class VectorService:
    def __init__(self):
        self.collection_name = "user_document_chunks"

    def get_collection(self, refresh: bool = False):
        client = get_chroma_client(refresh=refresh)
        return client.get_or_create_collection(
            name=self.collection_name,
            embedding_function=sentence_transformer_ef
        )

    @property
    def collection(self):
        return self.get_collection(refresh=False)

    def upsert_chunks(self, chunks: List[Dict]):
        if not chunks:
            return
            
        ids = [chunk["id"] for chunk in chunks]
        documents = [chunk["text"] for chunk in chunks]
        metadatas = [chunk["metadata"] for chunk in chunks]

        col = self.get_collection(refresh=True)
        col.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )

    def query_context_with_evaluation(self, query: str, user_id: str, document_id: str, top_k: int = 5) -> Tuple[str, Dict]:
        """
        Retrieves context chunks from ChromaDB and performs real-time RAG evaluation:
        calculates similarity score, keyword overlap, quality confidence, and prints
        a detailed report to the terminal.
        """
        where_filter = {"$and": [{"user_id": user_id}, {"document_id": document_id}]}
        include_fields = ["documents", "metadatas", "distances"]
        
        try:
            col = self.get_collection(refresh=False)
            results = col.query(
                query_texts=[query],
                n_results=top_k,
                where=where_filter,
                include=include_fields
            )
        except Exception as exc:
            print(f"[*] [ChromaDB Sync] Refreshing client due to query error: {exc}", flush=True)
            col = self.get_collection(refresh=True)
            try:
                results = col.query(
                    query_texts=[query],
                    n_results=top_k,
                    where=where_filter,
                    include=include_fields
                )
            except Exception as retry_exc:
                print(f"[✗] [ChromaDB Sync] Retry failed: {retry_exc}", flush=True)
                return "", {
                    "query": query,
                    "chunks_count": 0,
                    "top_similarity_score": "0.0%",
                    "avg_similarity_score": "0.0%",
                    "retrieval_quality": "QUERY_ERROR",
                    "quality_tag": "rag-error",
                    "chunks": []
                }

        docs = results.get("documents", [[]])[0] if results.get("documents") else []
        distances = results.get("distances", [[]])[0] if results.get("distances") else []
        metadatas = results.get("metadatas", [[]])[0] if results.get("metadatas") else []
        ids = results.get("ids", [[]])[0] if results.get("ids") else []

        if not docs:
            eval_data = {
                "query": query,
                "chunks_count": 0,
                "top_similarity_score": "0.0%",
                "avg_similarity_score": "0.0%",
                "retrieval_quality": "NO_MATCH (No chunks retrieved for this document)",
                "quality_tag": "rag-no-match",
                "chunks": []
            }
            print(f"\n⚠️  [RAG EVALUATION] No matching chunks found in ChromaDB for query: \"{query}\"\n", flush=True)
            return "", eval_data

        chunk_evals = []
        for i, text in enumerate(docs):
            dist = distances[i] if i < len(distances) else 1.0
            meta = metadatas[i] if i < len(metadatas) else {}
            chunk_id = ids[i] if i < len(ids) else f"chunk_{i}"
            
            sim_score = distance_to_similarity(dist)
            kw_overlap = compute_keyword_overlap(query, text)
            snippet = text.replace("\n", " ").strip()
            if len(snippet) > 130:
                snippet = snippet[:130] + "..."

            chunk_evals.append({
                "rank": i + 1,
                "chunk_id": chunk_id,
                "similarity_num": sim_score,
                "similarity": f"{sim_score * 100:.1f}%",
                "distance": round(dist, 4),
                "page": meta.get("page", "N/A"),
                "keyword_overlap_num": kw_overlap,
                "keyword_overlap": f"{kw_overlap * 100:.0f}%",
                "snippet": snippet
            })

        top_sim = max(c["similarity_num"] for c in chunk_evals)
        avg_sim = sum(c["similarity_num"] for c in chunk_evals) / len(chunk_evals)

        if top_sim >= 0.75 or (top_sim >= 0.65 and any(c["keyword_overlap_num"] >= 0.5 for c in chunk_evals)):
            quality = "HIGH_CONFIDENCE (Exact / Highly Relevant Chunk Found)"
            quality_tag = "rag-high-confidence"
        elif top_sim >= 0.50:
            quality = "MODERATE_CONFIDENCE (Partially Relevant Context)"
            quality_tag = "rag-moderate-confidence"
        else:
            quality = "LOW_CONFIDENCE (Weak Similarity - Context may be general)"
            quality_tag = "rag-low-confidence"

        eval_data = {
            "query": query,
            "chunks_count": len(chunk_evals),
            "top_similarity_score": f"{top_sim * 100:.1f}%",
            "avg_similarity_score": f"{avg_sim * 100:.1f}%",
            "retrieval_quality": quality,
            "quality_tag": quality_tag,
            "chunks": chunk_evals
        }

        # Terminal output (Antigravity terminal & docker logs)
        print(f"\n{'='*75}", flush=True)
        print(f"📊 [RAG RETRIEVAL EVALUATION] Query: \"{query}\"", flush=True)
        print(f"🎯 Match Quality   : {quality}", flush=True)
        print(f"📈 Top Similarity  : {top_sim * 100:.1f}%  |  Avg Similarity: {avg_sim * 100:.1f}%", flush=True)
        print(f"📦 Total Chunks    : {len(chunk_evals)}", flush=True)
        print(f"{'-'*75}", flush=True)
        for c in chunk_evals:
            print(f"  • Rank {c['rank']}: [Score: {c['similarity']} | Dist: {c['distance']} | Page: {c['page']} | Overlap: {c['keyword_overlap']}]", flush=True)
            print(f"    Snippet: \"{c['snippet']}\"", flush=True)
        print(f"{'='*75}\n", flush=True)

        context_text = "\n\n".join(docs)
        return context_text, eval_data

    def query_context(self, query: str, user_id: str, document_id: str, top_k: int = 5) -> str:
        context, _ = self.query_context_with_evaluation(query, user_id, document_id, top_k=top_k)
        return context

    def delete_document_vectors(self, document_id: str):
        try:
            col = self.get_collection(refresh=True)
            col.delete(
                where={"document_id": document_id}
            )
        except Exception as e:
            print(f"Notice: ChromaDB vector deletion: {e}")

vector_service = VectorService()

