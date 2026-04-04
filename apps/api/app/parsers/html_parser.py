"""
HTML Parser — extracts clean text + sections from payer policy web pages.
Used for payers that publish policies as HTML rather than PDF
(e.g. BCBS NC drug search results, Florida Blue MCG portal).
"""
import hashlib
import re
from dataclasses import dataclass
from typing import Optional

from bs4 import BeautifulSoup

from .pdf_parser import ParsedDocument, ParsedPage, ParsedSection


def parse_html(html: str, source_uri: str = "", file_name: str = "page.html") -> ParsedDocument:
    """
    Parse raw HTML into a ParsedDocument.
    Treats the HTML as a single "page" for citation purposes,
    but detects sections from heading tags (h1-h4).
    """
    soup = BeautifulSoup(html, "html.parser")

    # Remove noise
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()

    full_text = soup.get_text(separator="\n", strip=True)
    file_hash = hashlib.sha256(full_text.encode()).hexdigest()

    pages = [ParsedPage(page_num=1, text=full_text, char_offset=0)]
    sections = _detect_html_sections(soup)

    return ParsedDocument(
        file_name=file_name or source_uri,
        file_hash=file_hash,
        page_count=1,
        full_text=full_text,
        pages=pages,
        sections=sections,
    )


def _detect_html_sections(soup: BeautifulSoup) -> list[ParsedSection]:
    sections: list[ParsedSection] = []
    current_title: Optional[str] = None
    buffer: list[str] = []

    for element in soup.find_all(["h1", "h2", "h3", "h4", "p", "li", "td"]):
        tag = element.name
        text = element.get_text(strip=True)
        if not text:
            continue

        if tag in ("h1", "h2", "h3", "h4"):
            if current_title is not None:
                sections.append(ParsedSection(
                    title=current_title,
                    page_num=1,
                    text="\n".join(buffer).strip(),
                ))
            current_title = text
            buffer = []
        else:
            buffer.append(text)

    if current_title is not None:
        sections.append(ParsedSection(
            title=current_title,
            page_num=1,
            text="\n".join(buffer).strip(),
        ))

    return sections
