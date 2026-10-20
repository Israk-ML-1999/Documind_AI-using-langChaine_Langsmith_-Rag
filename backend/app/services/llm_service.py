import json
import asyncio
from typing import AsyncGenerator, Optional, List
from app.confige import get_gemini_llm
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from app.services.vector_service import vector_service

try:
    from langsmith import traceable
except ImportError:
    def traceable(*args, **kwargs):
        def decorator(f):
            return f
        return decorator

@traceable(name="RAG Retrieval & Evaluation", run_type="retriever")
def retrieve_and_evaluate_context(search_query: str, user_id: str, document_id: str) -> dict:
    """Performs ChromaDB retrieval and runs RAG similarity evaluation tracked in LangSmith."""
    context, eval_data = vector_service.query_context_with_evaluation(search_query, user_id, document_id)
    return {
        "context": context,
        "evaluation": eval_data
    }

def parse_stored_images(val: Optional[str]) -> List[str]:
    """Helper to parse single URL or JSON array of image URLs/base64 strings."""
    if not val or not val.strip():
        return []
    try:
        parsed = json.loads(val)
        if isinstance(parsed, list):
            return [img for img in parsed if isinstance(img, str) and img.strip()]
    except Exception:
        pass
    return [val.strip()]

async def generate_chat_response(
    query: str, 
    user_id: str, 
    document_id: str,
    chat_history: list = None,
    image_data: Optional[str] = None,
    images: Optional[List[str]] = None
) -> AsyncGenerator[str, None]:
    
    # 1. Retrieve context & perform real-time RAG evaluation
    search_query = query if query and query.strip() else "document summary and key points"
    try:
        retrieval_res = retrieve_and_evaluate_context(search_query, user_id, document_id)
        context = retrieval_res.get("context", "")
        eval_data = retrieval_res.get("evaluation", {})
    except Exception as e:
        print(f"Notice: vector_service retrieval error: {e}", flush=True)
        context = ""
        eval_data = {
            "top_similarity_score": "0.0%",
            "avg_similarity_score": "0.0%",
            "retrieval_quality": "ERROR",
            "quality_tag": "rag-error",
            "chunks_count": 0
        }
    
    # 2. Build system prompt with conversational memory instructions
    system_prompt = f"""You are DocuMind AI, a world-class intelligent assistant equipped with document retrieval and multimodal computer vision capabilities.

DOCUMENT CONTEXT:
{context}

CORE INSTRUCTIONS:
1. Conversational Memory: Maintain strict short-term and long-term context from the conversation history. Remember the user's name, previous questions, discussed topics, and references seamlessly.
2. Vision & Multimodal Analysis: Users can attach up to 3 images at once (diagrams, charts, screenshots, UI, handwritten notes, tables). Inspect ALL attached images thoroughly and correlate their visual details with the document context and user questions.
3. Accuracy: Answer questions based on the provided context, attached images, and conversation history. If something is unknown, say so honestly.
4. Professional Markdown & Code Presentation (STRICT):
   - Always structure your responses with clean, readable Markdown.
   - When providing code, scripts, or syntax, ALWAYS wrap them inside standard triple-backtick fenced code blocks with the language identifier (e.g., ```python\n# your code\n```, ```javascript\n...```, ```sql\n...```, ```bash\n...```).
   - NEVER output bare code without code block backticks.
   - Separate paragraphs, list items, and sections with clear double newlines so they render cleanly.
"""
    
    messages = [SystemMessage(content=system_prompt)]
    
    # 3. Add conversation history for robust context retention
    if chat_history:
        # Keep up to the last 20 messages for rich conversation memory
        recent_history = chat_history[-20:]
        for msg in recent_history:
            if msg.role == "user":
                raw_img = getattr(msg, "image_url", None)
                msg_imgs = parse_stored_images(raw_img)
                if msg_imgs:
                    history_content = [
                        {"type": "text", "text": msg.content or "User sent images for multimodal analysis."}
                    ]
                    for img in msg_imgs[:3]:
                        history_content.append({"type": "image_url", "image_url": {"url": img}})
                    messages.append(HumanMessage(content=history_content))
                else:
                    messages.append(HumanMessage(content=msg.content or ""))
            elif msg.role == "assistant":
                messages.append(AIMessage(content=msg.content or ""))
            
    # 4. Consolidate current user images (up to 3)
    current_images: List[str] = []
    if images:
        current_images.extend([img for img in images if isinstance(img, str) and img.strip()])
    if image_data and image_data.strip() and image_data not in current_images:
        current_images.append(image_data.strip())
    
    # Strict clamp to maximum 3 images
    current_images = current_images[:3]

    if current_images:
        default_prompt = f"Analyze the attached {len(current_images)} image(s) in detail and explain them with respect to our document context."
        current_content = [
            {"type": "text", "text": query.strip() if query and query.strip() else default_prompt}
        ]
        for img in current_images:
            current_content.append({"type": "image_url", "image_url": {"url": img}})
        messages.append(HumanMessage(content=current_content))
    else:
        messages.append(HumanMessage(content=query or ""))
    
    # 5. Stream response with LangSmith tracing config & RAG evaluation metadata
    try:
        llm = get_gemini_llm()
        run_config = {
            "run_name": "DocuMind Chat Response",
            "tags": [
                "documind", 
                "rag", 
                "gemini-flash", 
                eval_data.get("quality_tag", "rag-retrieval")
            ],
            "metadata": {
                "user_id": str(user_id),
                "document_id": str(document_id),
                "image_count": len(current_images),
                "rag_top_similarity": eval_data.get("top_similarity_score", "0.0%"),
                "rag_avg_similarity": eval_data.get("avg_similarity_score", "0.0%"),
                "rag_match_quality": eval_data.get("retrieval_quality", "N/A"),
                "rag_chunks_retrieved": eval_data.get("chunks_count", 0),
            }
        }
        async for chunk in llm.astream(messages, config=run_config):
            if chunk.content:
                text = chunk.content
                if isinstance(text, list):
                    text = "".join([part.get("text", "") if isinstance(part, dict) else str(part) for part in text])
                elif not isinstance(text, str):
                    text = str(text)
                yield text
                
    except Exception as e:
        yield f"\n\nError generating response: {str(e)}"
