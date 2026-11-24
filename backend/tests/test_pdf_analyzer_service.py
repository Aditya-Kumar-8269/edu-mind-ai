import unittest
import fitz

from app.services.pdf_analyzer_service import extract_text_from_pdf, strip_markdown_code_fences


class PDFAnalyzerServiceTests(unittest.TestCase):
    def test_extract_text_from_pdf_returns_text(self):
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((72, 72), "AI study notes")
        pdf_bytes = doc.write()
        doc.close()

        extracted = extract_text_from_pdf(pdf_bytes)

        self.assertIn("AI study notes", extracted)

    def test_strip_markdown_code_fences_removes_fences(self):
        result = strip_markdown_code_fences("```json\n{\"question\": \"What is AI?\"}\n```")

        self.assertEqual(result, '{"question": "What is AI?"}')


if __name__ == "__main__":
    unittest.main()
