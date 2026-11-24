"""
OpenRouter LLM Service
Handles communication with OpenRouter API for AI responses
"""

import json
import os
from typing import AsyncGenerator, Optional
import httpx
from pydantic import BaseModel


class ChatMessage(BaseModel):
    """Chat message model"""
    role: str
    content: str


class OpenRouterService:
    """Service for interacting with OpenRouter API"""
    
    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
        self.model = os.getenv("OPENROUTER_MODEL", "openai/gpt-3.5-turbo")
        self.api_url = os.getenv("OPENROUTER_API_URL", "https://openrouter.ai/api/v1/chat/completions")
        self.timeout = 60.0
        self.is_configured = (
            bool(self.api_key)
            and self.api_key not in ("your_openrouter_api_key_here", "your_api_key_here")
            and not self.api_key.startswith("your_")
        )
    
    async def chat_completion(
        self,
        messages: list[ChatMessage],
        stream: bool = False
    ) -> AsyncGenerator[str, None]:
        """
        Send chat completion request to OpenRouter API
        
        Args:
            messages: List of chat messages
            stream: Whether to stream the response
            
        Yields:
            Response chunks if streaming
            
        Returns:
            Full response if not streaming
        """
        if not self.is_configured:
            raise RuntimeError("OPENROUTER_API_KEY is not configured. Set it in backend/.env to enable live AI responses.")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "EduMind AI"
        }
        
        # Configure model routing:
        # Prioritize lowest-latency free models on OpenRouter (1.0s TTFT) with seamless fallbacks
        if self.model == "openrouter/free" or "openrouter/free" in self.model:
            preferred_models = [
                "nvidia/nemotron-3.5-lightning:free",
                "liquid/lfm-3-1.7b:free",
                "openrouter/free"
            ]
        elif "," in self.model:
            preferred_models = [m.strip() for m in self.model.split(",") if m.strip()]
        else:
            preferred_models = [self.model]

        payload = {
            "messages": [{"role": msg.role, "content": msg.content} for msg in messages],
            "stream": stream
        }
        if len(preferred_models) > 1:
            payload["models"] = preferred_models
        else:
            payload["model"] = preferred_models[0]
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                if stream:
                    async with client.stream("POST", self.api_url, headers=headers, json=payload) as response:
                        if response.status_code >= 400:
                            await response.aread()
                            response.raise_for_status()

                        async for line in response.aiter_lines():
                            line = line.strip()
                            if not line or not line.startswith("data: "):
                                continue
                            data = line[6:].strip()
                            if data == "[DONE]":
                                break
                            try:
                                chunk_json = json.loads(data)
                                if "choices" in chunk_json and len(chunk_json["choices"]) > 0:
                                    delta = chunk_json["choices"][0].get("delta", {})
                                    content = delta.get("content", "")
                                    if content:
                                        yield content
                            except json.JSONDecodeError:
                                continue
                else:
                    response = await client.post(self.api_url, headers=headers, json=payload)
                    response.raise_for_status()
                    data = response.json()
                    if "choices" in data and len(data["choices"]) > 0:
                        yield data["choices"][0]["message"]["content"]
                        
        except httpx.TimeoutException:
            raise Exception("Request to OpenRouter API timed out")
        except httpx.HTTPStatusError as e:
            try:
                error_body = e.response.text
            except Exception:
                error_body = str(e)
            raise Exception(f"OpenRouter API returned error: {e.response.status_code} - {error_body}")
        except httpx.RequestError as e:
            raise Exception(f"Failed to connect to OpenRouter API: {str(e)}")
        except Exception as e:
            raise Exception(f"Unexpected error during OpenRouter API call: {str(e)}")


# Singleton instance
_openrouter_service: Optional[OpenRouterService] = None


def get_openrouter_service() -> OpenRouterService:
    """Get or create OpenRouter service singleton"""
    global _openrouter_service
    if _openrouter_service is None:
        _openrouter_service = OpenRouterService()
    return _openrouter_service
