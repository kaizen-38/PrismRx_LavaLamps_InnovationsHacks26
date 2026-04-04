"""
PDF Parser — ingests raw policy PDFs and returns clean text + page metadata.
Supports both text-based and scanned PDFs (via fitz/pymupdf).
"""
import fitz  # PyMuPDF
from pathlib import Path


def parse_pdf(file_path: str | Path) -> dict:
    """
    Extract text content from a PDF file.

    Returns:
        {
            "file": str,
            "pages": [{"page": int, "text": str}, ...],
            "full_text": str
        }
    """
    path = Path(file_path)
    doc = fitz.open(str(path))
    pages = []
    for i, page in enumerate(doc):
        text = page.get_text()
        pages.append({"page": i + 1, "text": text})
    full_text = "\n\n".join(p["text"] for p in pages)
    return {"file": path.name, "pages": pages, "full_text": full_text}
