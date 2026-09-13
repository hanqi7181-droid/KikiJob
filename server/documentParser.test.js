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
