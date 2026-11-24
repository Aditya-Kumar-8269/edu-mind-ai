"""
AI Tutor Service
Handles AI Tutor system prompt and conversation management
"""

from typing import List
from app.services.openrouter_service import ChatMessage, get_openrouter_service


class TutorService:
    """Service for AI Tutor functionality"""
    
    SYSTEM_PROMPT = """You are EduMind AI, a world-class academic tutor and educational companion for students.
Your mission is to help students understand, master, and excel in any academic subject through clear, professional, well-structured explanations.

Follow these pedagogical and formatting requirements for all educational answers:

1. High-Level Structure:
   - Main Title: Begin with a clear main heading (# Topic Name).
   - Introduction: Provide a concise, friendly overview paragraph explaining what the concept is and why it matters (## Introduction or ## Overview).
   - Core Concepts with Subheadings: Break complex ideas down into logical sections using subheadings (## Subheading, ### Subheading).
   - Bullet Points & Numbered Lists: Use clean markdown bullet points (`- `) or numbered steps (`1. `) for components, characteristics, stages, or steps.
   - Bold Important Terms: Always bold key terminology (`**Term:**`) at the start of explanations or bullet points.
   - Examples & Analogies: Include real-world examples or analogies wherever they clarify abstract ideas.
   - Summary / Key Takeaways: Conclude with a crisp, memorable wrap-up (## Summary or ## Key Takeaways).

2. Technical & Programming Questions:
   - When asked for code (e.g., Python, C++, Java), always place code inside properly tagged markdown code blocks (e.g. ```python ... ```).
   - Explain the logic step-by-step and mention time and space complexity where relevant.

3. Comparisons & Differences:
   - When comparing topics (e.g., AI vs Machine Learning), include a structured Markdown comparison table:
     | Feature | Concept A | Concept B |
     | :--- | :--- | :--- |

4. Mathematical Formulas:
   - For inline math, use single dollar signs: $E = mc^2$.
   - For display equations, put them on their own line with double dollar signs:
     $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

5. Spacing & Cleanliness:
   - Always put a blank line before and after headings, bullet lists, code blocks, and tables.
   - Adapt the depth and style naturally to the student's question—from concise summaries to detailed walkthroughs."""

    def __init__(self):
        self.openrouter = get_openrouter_service()
        self.conversation_history: List[ChatMessage] = [
            ChatMessage(role="system", content=self.SYSTEM_PROMPT)
        ]
    
    async def chat(self, user_message: str) -> str:
        """
        Send a chat message and get AI response
        
        Args:
            user_message: The user's message
            
        Returns:
            AI response
        """
        # Add user message to conversation
        self.conversation_history.append(
            ChatMessage(role="user", content=user_message)
        )

        if not self.openrouter.is_configured:
            fallback = "The AI Tutor is currently unavailable because OPENROUTER_API_KEY is not configured. Please set the backend environment variable to enable live responses."
            self.conversation_history.append(ChatMessage(role="assistant", content=fallback))
            return fallback
        
        # Get response from OpenRouter
        response_text = ""
        async for chunk in self.openrouter.chat_completion(
            messages=self.conversation_history,
            stream=False
        ):
            response_text += chunk
        
        # Add assistant response to conversation
        self.conversation_history.append(
            ChatMessage(role="assistant", content=response_text)
        )
        
        return response_text
    
    async def chat_stream(self, user_message: str):
        """
        Send a chat message and stream AI response
        
        Args:
            user_message: The user's message
            
        Yields:
            Response chunks as they arrive
        """
        # Add user message to conversation
        self.conversation_history.append(
            ChatMessage(role="user", content=user_message)
        )

        # Keep system prompt + last 6 messages to avoid token bloat and keep response latency fast
        if len(self.conversation_history) > 7:
            self.conversation_history = [self.conversation_history[0]] + self.conversation_history[-6:]

        if not self.openrouter.is_configured:
            fallback = "The AI Tutor is currently unavailable because OPENROUTER_API_KEY is not configured. Please set the backend environment variable to enable live responses."
            self.conversation_history.append(ChatMessage(role="assistant", content=fallback))
            for char in fallback:
                yield char
            return
        
        # Stream response from OpenRouter
        response_text = ""
        async for chunk in self.openrouter.chat_completion(
            messages=self.conversation_history,
            stream=True
        ):
            response_text += chunk
            yield chunk
        
        # Add assistant response to conversation
        self.conversation_history.append(
            ChatMessage(role="assistant", content=response_text)
        )
    
    def clear_conversation(self):
        """Clear conversation history, keeping system prompt"""
        self.conversation_history = [
            ChatMessage(role="system", content=self.SYSTEM_PROMPT)
        ]


# Singleton instance
_tutor_service: TutorService = None


def get_tutor_service() -> TutorService:
    """Get or create Tutor service singleton"""
    global _tutor_service
    if _tutor_service is None:
        _tutor_service = TutorService()
    return _tutor_service
