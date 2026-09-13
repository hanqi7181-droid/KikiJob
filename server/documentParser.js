import { existsSync, readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { PDFParse } from 'pdf-parse';

const execFileAsync = promisify(execFile);
const pythonPath = process.env.PYTHON_PATH || process.env.PYTHON || 'python3';
const pythonFallbacks = process.env.PYTHON_PATH || process.env.PYTHON ? [] : ['python', 'py'];
const pdfExtractScript = fileURLToPath(new URL('./scripts/extract_pdf_text.py', import.meta.url));
const doclingExtractScript = fileURLToPath(new URL('./scripts/extract_docling_text.py', import.meta.url));

export async function parseDocumentFile(filePath) {
  const extension = extname(filePath).toLowerCase();

  if (['.txt', '.md'].includes(extension)) {
    return { text: readFileSync(filePath, 'utf8'), parser: 'plain-text', format: extension.slice(1) };
  }

  if (extension === '.pdf') {
    return parsePdfDocument(filePath);
  }

  if (extension === '.docx') {
    return parseDocxDocument(filePath);
  }

  return {
    text: '',
    parser: 'unsupported',
    warning: 'UNSUPPORTED_FILE_FORMAT',
    message: '当前仅支持 PDF、DOCX、TXT 和 Markdown 简历',
  };
}

async function parsePdfDocument(filePath) {
  const docling = await parseWithConfiguredDocling(filePath, 'pdf');
  if (docling.text) return docling;

  const nodeParser = await parsePdfWithNode(filePath);
  if (nodeParser.text) {
    return docling.warning ? { ...nodeParser, fallbackFrom: docling.parser, fallbackWarning: docling.warning } : nodeParser;
  }

  const fallback = await parsePdfWithPdfplumber(filePath);
  if (fallback.text) {
    return {
      ...fallback,
      fallbackFrom: nodeParser.parser,
      fallbackWarning: nodeParser.warning || docling.warning,
    };
  }

  const warning = fallback.warning || nodeParser.warning || docling.warning || 'unsupported_scan_pdf';
  return {
    text: '',
    parser: fallback.parser || nodeParser.parser,
    warning,
    message:
      warning === 'unsupported_scan_pdf'
        ? '未能从 PDF 中提取可用文本。扫描版 PDF 暂不支持 OCR，请手动填写资料。'
        : 'PDF 文本提取工具运行失败，请检查后端部署环境；你仍然可以继续手动填写资料。',
  };
}

async function parsePdfWithNode(filePath) {
  let parser;
  try {
    parser = new PDFParse({ data: readFileSync(filePath) });
    const result = await parser.getText();
    const text = String(result?.text || '').replace(/\r\n/g, '\n').trim();
    return {
      text,
      parser: 'pdf-parse',
      format: 'text',
      warning: text ? '' : 'unsupported_scan_pdf',
    };
  } catch (error) {
    return { text: '', parser: 'pdf-parse', warning: `PDF_PARSE_FAILED: ${error.message}` };
  } finally {
    await parser?.destroy?.();
  }
}

async function parseDocxDocument(filePath) {
  const docling = await parseWithConfiguredDocling(filePath, 'docx');
  if (docling.text) return docling;

  return {
    text: '',
    parser: docling.parser || 'docling-unconfigured',
    warning: docling.warning || 'DOCX_PARSER_NOT_CONFIGURED',
    message: 'DOCX 解析需要配置 Docling。你仍然可以继续手动填写资料。',
  };
}

async function parseWithConfiguredDocling(filePath, format) {
  if (process.env.DOCLING_SERVER_URL) return parseWithDoclingServer(filePath, format);
  if (process.env.DOCUMENT_PARSER === 'docling-python') return parseWithDoclingPython(filePath, format);
  return { text: '', parser: 'docling-disabled', warning: 'DOCLING_NOT_CONFIGURED' };
}

async function parseWithDoclingServer(filePath, format) {
  const baseUrl = process.env.DOCLING_SERVER_URL.replace(/\/+$/, '');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.DOCLING_TIMEOUT_MS || 45_000));

  try {
    const formData = new FormData();
    const bytes = readFileSync(filePath);
    formData.append('files', new Blob([bytes]), `resume.${format}`);
    formData.append('to_formats', 'md');

    const response = await fetch(`${baseUrl}/v1/convert/file`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return { text: '', parser: 'docling-server', warning: `DOCLING_SERVER_${response.status}` };
    }

    return {
      text: extractDoclingServerText(payload),
      parser: 'docling-server',
      format: 'markdown',
      metadata: { sourceFormat: format },
    };
  } catch (error) {
    return { text: '', parser: 'docling-server', warning: error.name === 'AbortError' ? 'DOCLING_TIMEOUT' : 'DOCLING_SERVER_FAILED' };
  } finally {
    clearTimeout(timeout);
  }
}

async function parseWithDoclingPython(filePath, format) {
  const errors = [];
  for (const command of [pythonPath, ...pythonFallbacks]) {
    try {
      const args = command === 'py' ? ['-3', doclingExtractScript, filePath] : [doclingExtractScript, filePath];
      const { stdout } = await runPython(command, args);
      return {
        text: stdout.replace(/\r\n/g, '\n').trim(),
        parser: 'docling-python',
        format: 'markdown',
        metadata: { sourceFormat: format },
      };
    } catch (error) {
      errors.push(`${command}: ${error.message}`);
    }
  }

  return { text: '', parser: 'docling-python', warning: errors.join(' | ') || 'DOCLING_PYTHON_FAILED' };
}

async function parsePdfWithPdfplumber(filePath) {
  const errors = [];
  for (const command of [pythonPath, ...pythonFallbacks]) {
    try {
      const args = command === 'py' ? ['-3', pdfExtractScript, filePath] : [pdfExtractScript, filePath];
      const { stdout } = await runPython(command, args);
      const text = stdout.replace(/\r\n/g, '\n').trim();
      return {
        text,
        parser: 'pdfplumber',
        format: 'text',
        warning: text ? '' : 'unsupported_scan_pdf',
      };
    } catch (error) {
      errors.push(`${command}: ${error.message}`);
    }
  }

  return { text: '', parser: 'pdfplumber', warning: errors.join(' | ') || 'PDF_TEXT_EXTRACTION_FAILED' };
}

async function runPython(command, args) {
  if (looksLikeFilePath(command) && !existsSync(command)) {
    throw new Error('Python executable was not found');
  }

  return execFileAsync(command, args, {
    encoding: 'utf8',
    windowsHide: true,
    timeout: Number(process.env.DOCUMENT_PARSE_TIMEOUT_MS || 45_000),
    maxBuffer: 10 * 1024 * 1024,
  });
}

function extractDoclingServerText(payload) {
  if (!payload || typeof payload !== 'object') return '';
  const document = payload.document || payload;
  const candidates = [
    document.md_content,
    document.markdown,
    document.text,
    document.content,
    payload.md_content,
    payload.markdown,
    payload.text,
  ];
  return candidates.map((value) => String(value || '').trim()).find(Boolean) || '';
}

function looksLikeFilePath(value) {
  return /[\\/]/.test(value) || /^[A-Za-z]:/.test(value);
}
