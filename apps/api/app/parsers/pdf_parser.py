"""
PDF Parser — extracts text + page-level structure from policy PDFs.

Returns a ParsedDocument with:
- full_text: entire document as a string
- pages: [{page_num, text, char_offset}]  — enables precise citations
- sections: [{title, page_num, text}]      — heuristic heading detection
"""
import hashlib
import re
from dataclasses import dataclass, field
from pathlib import Path

import fitz  # PyMuPDF


@dataclass
class ParsedPage:
    page_num: int       # 1-indexed
    text: str
    char_offset: int    # offset of this page's text in full_text


@dataclass
class ParsedSection:
    title: str
    page_num: int
    text: str


@dataclass
class ParsedDocument:
    file_name: str
    file_hash: str
    page_count: int
    full_text: str
    pages: list[ParsedPage]
    sections: list[ParsedSection]


# Heuristic: lines that look like section headings
_HEADING_RE = re.compile(
    r"^(?:"
    r"(?:coverage criteria|indications?|prior auth(?:orization)?|step therapy"
    r"|site of care|exclusions?|reauthorization|diagnosis|prescriber|dosage"
    r"|limitations?|background|description|policy|criteria)"
    r"|(?:[A-Z][A-Z\s]{4,})"          # ALL CAPS line ≥ 5 chars
    r")",
    re.IGNORECASE,
)


def parse_pdf(file_path: str | Path) -> ParsedDocument:
    path = Path(file_path)
    raw_bytes = path.read_bytes()
    file_hash = hashlib.sha256(raw_bytes).hexdigest()

    doc = fitz.open(str(path))
    pages: list[ParsedPage] = []
    offset = 0

    for i, page in enumerate(doc):
        text = page.get_text("text")
        pages.append(ParsedPage(page_num=i + 1, text=text, char_offset=offset))
        offset += len(text) + 2  # +2 for the \n\n separator

    full_text = "\n\n".join(p.text for p in pages)
    sections = _detect_sections(pages)

    return ParsedDocument(
        file_name=path.name,
        file_hash=file_hash,
        page_count=len(pages),
        full_text=full_text,
        pages=pages,
        sections=sections,
    )


def parse_pdf_bytes(data: bytes, file_name: str = "upload.pdf") -> ParsedDocument:
    """Parse from raw bytes (for API file uploads)."""
    import tempfile, os
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(data)
        tmp_path = tmp.name
    try:
        return parse_pdf(tmp_path)
    finally:
        os.unlink(tmp_path)


def _detect_sections(pages: list[ParsedPage]) -> list[ParsedSection]:
    """
    Heuristic section detection: scan each page for heading-like lines.
    Collects all text until the next heading as the section body.
    """
    sections: list[ParsedSection] = []
    current_title: str | None = None
    current_page: int = 1
    buffer: list[str] = []

    for page in pages:
        for line in page.text.splitlines():
            stripped = line.strip()
            if not stripped:
                continue
            if _HEADING_RE.match(stripped) and len(stripped) < 120:
                if current_title is not None:
                    sections.append(ParsedSection(
                        title=current_title,
                        page_num=current_page,
                        text="\n".join(buffer).strip(),
                    ))
                current_title = stripped
                current_page = page.page_num
                buffer = []
            else:
                buffer.append(stripped)

    if current_title is not None:
        sections.append(ParsedSection(
            title=current_title,
            page_num=current_page,
            text="\n".join(buffer).strip(),
        ))

    return sections
