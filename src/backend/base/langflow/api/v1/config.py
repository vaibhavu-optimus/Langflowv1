import openai
from anthropic import Anthropic

# Hardcode your API keys directly (NOT RECOMMENDED for production/public repos!)
OPENAI_API_KEY = "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"
ANTHROPIC_API_KEY = "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"
GOOGLE_API_KEY = "AIzaSyBtFFEJ1zR_mrn17JwYDxgjJ6TPNuj0JTo"

# Initialize API clients
openai_client = openai.OpenAI(
    api_key=OPENAI_API_KEY
)

anthropic_client = Anthropic(
    api_key=ANTHROPIC_API_KEY
)

# Google API client will be added when implementing Google's API

# Default configurations for models
default_model_configs = {
    "openai": {
        "model": "gpt-4o",  # Latest model as of May 13, 2024
        "temperature": 0.7,
        "max_tokens": 2048,
        "top_p": 1,
    },
    "anthropic": {
        "model": "claude-3-5-sonnet-20241022",  # Latest model as of October 22, 2024
        "temperature": 0.7,
        "max_tokens": 2048,
        "top_p": 1,
    },
    "google": {
        "model": "gemini-pro",
        "temperature": 0.7,
        "max_tokens": 2048,
        "top_p": 1,
    },
}

# Expose API keys for client-side validation (but not the actual keys)
has_valid_api_keys = {
    "openai": bool(OPENAI_API_KEY),
    "anthropic": bool(ANTHROPIC_API_KEY),
    "google": bool(GOOGLE_API_KEY),
} 