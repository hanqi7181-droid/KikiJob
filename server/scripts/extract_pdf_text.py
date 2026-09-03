import sys

import pdfplumber


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: extract_pdf_text.py <pdf-path>")

    chunks = []
    with pdfplumber.open(sys.argv[1]) as pdf:
        for page in pdf.pages:
            chunks.append(page.extract_text() or "")

    sys.stdout.reconfigure(encoding="utf-8")
    print("\n".join(chunks))


if __name__ == "__main__":
    main()
