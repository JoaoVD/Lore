from llama_index.core import Settings as LlamaSettings
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding
from app.core.config import settings

# Configure LlamaIndex globals at import time
LlamaSettings.llm = OpenAI(model=settings.OPENAI_MODEL, api_key=settings.OPENAI_API_KEY)
LlamaSettings.embed_model = OpenAIEmbedding(
    model=settings.OPENAI_EMBEDDING_MODEL,
    api_key=settings.OPENAI_API_KEY,
)

# TODO: implement index building and query engine
