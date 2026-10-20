import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

# Load environment variables from .env file
load_dotenv()

class GeminiConfig:
    """Configuration class for Gemini API settings."""
    # Ensure you add GOOGLE_API_KEY="your-api-key" in your .env file
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    # Recommended model for high reasoning tasks, you can also use gemini-1.5-flash for speed
    MODEL_NAME = "gemini-3.5-flash" 
    TEMPERATURE = 0.7

def get_gemini_llm():
    """
    Initializes and returns a configured Gemini LLM instance.
    This instance supports streaming and conversational features.
    """
    if not GeminiConfig.GOOGLE_API_KEY:
        raise ValueError("GOOGLE_API_KEY is not set. Please check your .env file.")

    llm = ChatGoogleGenerativeAI(
        model=GeminiConfig.MODEL_NAME,
        temperature=GeminiConfig.TEMPERATURE,
        google_api_key=GeminiConfig.GOOGLE_API_KEY,
        streaming=True # Enables word-by-word streaming responses
    )
    return llm
