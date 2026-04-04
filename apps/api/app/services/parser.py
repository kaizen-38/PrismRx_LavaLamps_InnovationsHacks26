"""PDF parsing service for policy documents."""

import logging
import hashlib
from typing import Optional, Dict, List, Tuple
from pathlib import Path
from dataclasses import dataclass
import re

import fitz  # PyMuPDF
from pdfplumber import PDF as PDFPlumberPDF

logger = logging.getLogger(__name__)


@dataclass
class TextChunk:
    """A chunk of extracted text with source information."""
    text: str
    page_number: int
    section: str
    source_url: Optional[str] = None
    hash: Optional[str] = None
    confidence: float = 1.0


@dataclass
class ParsedPolicyDocument:
    """Result of parsing a policy document."""
    file_path: str
    payer_name: str
    document_hash: str
    page_count: int
    raw_text: str
    chunks: List[TextChunk]
    extraction_errors: List[str] = None
    
    def __post_init__(self):
        if self.extraction_errors is None:
            self.extraction_errors = []


class PDFParser:
    """Parse PDF policy documents with source traceability."""

    def __init__(self, min_char_length: int = 10):
        """Initialize parser."""
        self.min_char_length = min_char_length

    def parse_pdf(
        self,
        file_path: str,
        payer_name: str,
        source_url: Optional[str] = None
    ) -> ParsedPolicyDocument:
        """
        Parse a PDF file and extract structured text with page numbers.
        
        Args:
            file_path: Path to PDF file
            payer_name: Name of the payer for context
            source_url: Optional URL for reference
            
        Returns:
            ParsedPolicyDocument with extracted chunks and metadata
        """
        logger.info(f"Parsing PDF: {file_path}")
        
        try:
            # Calculate file hash
            file_hash = self._calculate_file_hash(file_path)
            
            # Try PyMuPDF first (faster, more reliable)
            try:
                return self._parse_with_pymupdf(
                    file_path, payer_name, file_hash, source_url
                )
            except Exception as e:
                logger.warning(f"PyMuPDF parsing failed: {e}, falling back to pdfplumber")
                return self._parse_with_pdfplumber(
                    file_path, payer_name, file_hash, source_url
                )
                
        except Exception as e:
            logger.error(f"Failed to parse PDF {file_path}: {e}")
            # Return a stub with empty chunks but the file hash
            return ParsedPolicyDocument(
                file_path=file_path,
                payer_name=payer_name,
                document_hash="",
                page_count=0,
                raw_text="",
                chunks=[],
                extraction_errors=[f"Parse error: {str(e)}"]
            )

    def _parse_with_pymupdf(
        self,
        file_path: str,
        payer_name: str,
        file_hash: str,
        source_url: Optional[str]
    ) -> ParsedPolicyDocument:
        """Parse using PyMuPDF (fitz)."""
        doc = fitz.open(file_path)
        chunks: List[TextChunk] = []
        raw_text = ""
        extraction_errors = []
        
        try:
            for page_num in range(len(doc)):
                try:
                    page = doc[page_num]
                    text = page.get_text(preserve_images=False)
                    
                    if not text or len(text.strip()) < self.min_char_length:
                        continue
                    
                    raw_text += f"\n--- Page {page_num + 1} ---\n{text}"
                    
                    # Split into paragraphs/sections
                    sections = self._split_into_sections(text)
                    
                    for section_name, section_text in sections:
                        if len(section_text.strip()) >= self.min_char_length:
                            chunk = TextChunk(
                                text=section_text,
                                page_number=page_num + 1,
                                section=section_name,
                                source_url=source_url,
                                confidence=0.95  # High confidence for direct extraction
                            )
                            chunk.hash = self._calculate_chunk_hash(chunk)
                            chunks.append(chunk)
                            
                except Exception as e:
                    logger.warning(f"Error extracting page {page_num + 1}: {e}")
                    extraction_errors.append(f"Page {page_num + 1}: {str(e)}")
                    
        finally:
            doc.close()
        
        return ParsedPolicyDocument(
            file_path=file_path,
            payer_name=payer_name,
            document_hash=file_hash,
            page_count=len(doc),
            raw_text=raw_text,
            chunks=chunks,
            extraction_errors=extraction_errors
        )

    def _parse_with_pdfplumber(
        self,
        file_path: str,
        payer_name: str,
        file_hash: str,
        source_url: Optional[str]
    ) -> ParsedPolicyDocument:
        """Parse using pdfplumber as fallback."""
        chunks: List[TextChunk] = []
        raw_text = ""
        extraction_errors = []
        page_count = 0
        
        try:
            with PDFPlumberPDF.open(file_path) as pdf:
                page_count = len(pdf.pages)
                
                for page_num, page in enumerate(pdf.pages):
                    try:
                        text = page.extract_text()
                        
                        if not text or len(text.strip()) < self.min_char_length:
                            continue
                        
                        raw_text += f"\n--- Page {page_num + 1} ---\n{text}"
                        
                        # Split into paragraphs
                        sections = self._split_into_sections(text)
                        
                        for section_name, section_text in sections:
                            if len(section_text.strip()) >= self.min_char_length:
                                chunk = TextChunk(
                                    text=section_text,
                                    page_number=page_num + 1,
                                    section=section_name,
                                    source_url=source_url,
                                    confidence=0.90
                                )
                                chunk.hash = self._calculate_chunk_hash(chunk)
                                chunks.append(chunk)
                                
                    except Exception as e:
                        logger.warning(f"Error extracting page {page_num + 1}: {e}")
                        extraction_errors.append(f"Page {page_num + 1}: {str(e)}")
                        
        except Exception as e:
            logger.error(f"pdfplumber parsing failed: {e}")
            extraction_errors.append(f"Parser error: {str(e)}")
        
        return ParsedPolicyDocument(
            file_path=file_path,
            payer_name=payer_name,
            document_hash=file_hash,
            page_count=page_count,
            raw_text=raw_text,
            chunks=chunks,
            extraction_errors=extraction_errors
        )

    def _split_into_sections(self, text: str) -> List[Tuple[str, str]]:
        """Split text into logical sections."""
        sections = []
        
        # Common section headers in policy documents
        section_headers = [
            r"(?i)^(coverage|covered|indication|indication\(s\))",
            r"(?i)^(prior\s+(?:auth|authorization)|prior approval)",
            r"(?i)^(step\s+therapy|fail\s+first)",
            r"(?i)^(clinical\s+criteria|requirements|medical\s+necessity)",
            r"(?i)^(dosing|dose|dosage|quantity\s+limits?)",
            r"(?i)^(exclusion|not\s+covered)",
            r"(?i)^(site\s+of\s+care|setting|location)",
            r"(?i)^(reauthorization|re-auth|renewal)",
        ]
        
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
        
        if not paragraphs:
            return [("body", text)]
        
        current_section = "body"
        for para in paragraphs:
            # Check if paragraph starts a new section
            for header_pattern in section_headers:
                if re.match(header_pattern, para.split('\n')[0]):
                    current_section = para.split('\n')[0][:50]  # Use first line as section name
                    break
            
            sections.append((current_section, para))
        
        # Group sections by name
        grouped = {}
        for section_name, content in sections:
            if section_name not in grouped:
                grouped[section_name] = []
            grouped[section_name].append(content)
        
        return [(name, '\n\n'.join(contents)) for name, contents in grouped.items()]

    @staticmethod
    def _calculate_file_hash(file_path: str) -> str:
        """Calculate SHA256 hash of file."""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    @staticmethod
    def _calculate_chunk_hash(chunk: TextChunk) -> str:
        """Calculate hash of a text chunk."""
        content = f"{chunk.page_number}:{chunk.section}:{chunk.text}"
        return hashlib.sha256(content.encode()).hexdigest()


class PolicyDNAExtractor:
    """Extract structured Policy DNA from parsed text."""

    @staticmethod
    def extract_coverage_status(text: str) -> str:
        """Infer coverage status from text."""
        text_lower = text.lower()
        
        if re.search(r'covere?d?', text_lower) and not re.search(r'not\s+covere?d?', text_lower):
            if re.search(r'restrict|condition|criteria|prior', text_lower):
                return "covered_with_restrictions"
            return "covered"
        elif re.search(r'not\s+covere?d?|exclude?d?', text_lower):
            return "not_covered"
        
        return "not_listed"

    @staticmethod
    def extract_pa_requirement(text: str) -> bool:
        """Check if prior authorization is required."""
        return bool(re.search(
            r'prior\s+(auth|authorization|approval)|pa\s+required',
            text,
            re.IGNORECASE
        ))

    @staticmethod
    def extract_step_therapy(text: str) -> bool:
        """Check if step therapy is required."""
        return bool(re.search(
            r'step\s+therapy|fail\s+first|try\s+first|prior\s+failure',
            text,
            re.IGNORECASE
        ))


# Create global parser instance
pdf_parser = PDFParser()
