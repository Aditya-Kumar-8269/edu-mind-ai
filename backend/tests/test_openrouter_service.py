import unittest
from app.services.openrouter_service import OpenRouterService


class OpenRouterServiceTests(unittest.TestCase):
    def test_placeholder_api_key_is_not_configured(self):
        service = OpenRouterService()
        # Default placeholder in .env is 'your_openrouter_api_key_here'
        self.assertFalse(service.is_configured)


if __name__ == "__main__":
    unittest.main()
