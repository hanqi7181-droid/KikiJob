import sys

from docling.document_converter import DocumentConverter


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: extract_docling_text.py <document-path>")

    converter = DocumentConverter()
    result = converter.convert(sys.argv[1])
    sys.stdout.reconfigure(encoding="utf-8")
    print(result.document.export_to_markdown())


if __name__ == "__main__":
    main()
