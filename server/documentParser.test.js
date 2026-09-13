import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { parseDocumentFile } from './documentParser.js';

test('parses text and markdown files without external services', async () => {
  const dir = join(tmpdir(), `kikijob-document-parser-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  const txtPath = join(dir, 'resume.txt');
  const mdPath = join(dir, 'resume.md');
  writeFileSync(txtPath, '姓名：郑涵亓');
  writeFileSync(mdPath, '# 简历\n\n香港城市大学');

  const txt = await parseDocumentFile(txtPath);
  const md = await parseDocumentFile(mdPath);

  assert.equal(txt.parser, 'plain-text');
  assert.equal(txt.text, '姓名：郑涵亓');
  assert.equal(md.parser, 'plain-text');
  assert.match(md.text, /香港城市大学/);
});

test('extracts text from regular PDFs through the Node parser first', async () => {
  const previousParser = process.env.DOCUMENT_PARSER;
  const previousServerUrl = process.env.DOCLING_SERVER_URL;
  delete process.env.DOCUMENT_PARSER;
  delete process.env.DOCLING_SERVER_URL;

  try {
    const dir = join(tmpdir(), `kikijob-document-parser-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const pdfPath = join(dir, 'resume.pdf');
    writeFileSync(pdfPath, createMinimalPdf('KikiJob Resume'), 'binary');

    const result = await parseDocumentFile(pdfPath);

    assert.equal(result.parser, 'pdf-parse');
    assert.match(result.text, /KikiJob Resume/);
  } finally {
    if (previousParser === undefined) delete process.env.DOCUMENT_PARSER;
    else process.env.DOCUMENT_PARSER = previousParser;
    if (previousServerUrl === undefined) delete process.env.DOCLING_SERVER_URL;
    else process.env.DOCLING_SERVER_URL = previousServerUrl;
  }
});

test('returns a clear DOCX warning when Docling is not configured', async () => {
  const previousParser = process.env.DOCUMENT_PARSER;
  const previousServerUrl = process.env.DOCLING_SERVER_URL;
  delete process.env.DOCUMENT_PARSER;
  delete process.env.DOCLING_SERVER_URL;

  try {
    const dir = join(tmpdir(), `kikijob-document-parser-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const docxPath = join(dir, 'resume.docx');
    writeFileSync(docxPath, 'not a real docx');

    const result = await parseDocumentFile(docxPath);

    assert.equal(result.text, '');
    assert.equal(result.parser, 'docling-disabled');
    assert.equal(result.warning, 'DOCLING_NOT_CONFIGURED');
    assert.match(result.message, /DOCX 解析需要配置 Docling/);
  } finally {
    if (previousParser === undefined) delete process.env.DOCUMENT_PARSER;
    else process.env.DOCUMENT_PARSER = previousParser;
    if (previousServerUrl === undefined) delete process.env.DOCLING_SERVER_URL;
    else process.env.DOCLING_SERVER_URL = previousServerUrl;
  }
});

function createMinimalPdf(text) {
  return [
    '%PDF-1.4',
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${text.length + 34} >> stream`,
    `BT /F1 24 Tf 72 720 Td (${text}) Tj ET`,
    'endstream endobj',
    'xref',
    '0 6',
    '0000000000 65535 f ',
    '0000000009 00000 n ',
    '0000000058 00000 n ',
    '0000000115 00000 n ',
    '0000000241 00000 n ',
    '0000000311 00000 n ',
    'trailer << /Root 1 0 R /Size 6 >>',
    'startxref',
    '405',
    '%%EOF',
  ].join('\n');
}
