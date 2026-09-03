import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { persistResumeFile } from './storage.js';

const execFileAsync = promisify(execFile);
const projectRoot = join(import.meta.dirname, '..');
const uploadDir = join(projectRoot, 'uploads');
const pythonPath = 'C:\\Users\\HUAWEI\\AppData\\Local\\Programs\\Python\\Python311\\python.exe';
const pdfExtractScript = join(import.meta.dirname, 'scripts', 'extract_pdf_text.py');
const maxUploadBytes = Number(process.env.MAX_RESUME_UPLOAD_BYTES || 8 * 1024 * 1024);

mkdirSync(uploadDir, { recursive: true });

export function getUploadDir() {
  return uploadDir;
}

export function sanitizeFileName(fileName) {
  return basename(fileName || 'resume.pdf').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
}

export async function parseResumeFile(filePath) {
  const extension = extname(filePath).toLowerCase();
  let rawText = '';

  if (extension === '.pdf') {
    rawText = await extractPdfText(filePath);
  } else if (['.txt', '.md'].includes(extension)) {
    rawText = readFileSync(filePath, 'utf8');
  } else {
    throw new Error('Current parser supports PDF, TXT, and Markdown files');
  }

  const parsedProfile = extractProfile(rawText);
  return { rawText, parsedProfile };
}

export async function parseProjectResume(fileName, userId = 1) {
  const safeName = sanitizeFileName(fileName);
  const sourcePath = join(projectRoot, safeName);
  if (!existsSync(sourcePath)) {
    throw new Error(`Resume file not found in project root: ${safeName}`);
  }

  const targetPath = join(uploadDir, safeName);
  copyFileSync(sourcePath, targetPath);
  const parsed = await parseResumeFile(targetPath);
  const fileBuffer = readFileSync(targetPath);
  const storage = await persistResumeFile({
    fileBuffer,
    safeName,
    localPath: targetPath,
    uploadDir,
    userId,
  });

  return {
    fileName: safeName,
    ...storage,
    ...parsed,
  };
}

export async function saveUploadedResumeFromMultipart(request, userId = 1) {
  const contentType = request.headers['content-type'] || '';
  const boundaryMatch = contentType.match(/boundary=(.+)$/);

  if (!boundaryMatch) {
    throw new Error('Multipart boundary is required');
  }

  const body = await readRequestBuffer(request);
  const { fileName, fileBuffer } = parseMultipartFile(body, boundaryMatch[1]);
  const safeName = sanitizeFileName(fileName);
  validateResumeUpload(safeName, fileBuffer);
  const targetPath = join(uploadDir, `${Date.now()}-${safeName}`);
  const storage = await persistResumeFile({
    fileBuffer,
    safeName,
    localPath: targetPath,
    uploadDir,
    userId,
  });
  const parsed = await parseResumeFile(targetPath);

  return {
    fileName: safeName,
    ...storage,
    ...parsed,
  };
}

function validateResumeUpload(fileName, fileBuffer) {
  const extension = extname(fileName).toLowerCase();
  if (!['.pdf', '.txt', '.md'].includes(extension)) {
    throw new Error('当前仅支持上传 PDF、TXT 和 Markdown 简历');
  }
  if (fileBuffer.length > maxUploadBytes) {
    throw new Error(`简历文件过大，请上传 ${Math.floor(maxUploadBytes / 1024 / 1024)}MB 以内的文件`);
  }
}

async function extractPdfText(filePath) {
  if (!existsSync(pythonPath)) {
    throw new Error('Python executable was not found');
  }

  const { stdout } = await execFileAsync(pythonPath, [pdfExtractScript, filePath], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 30000,
    maxBuffer: 10 * 1024 * 1024,
  });

  return stdout.replace(/\r\n/g, '\n').trim();
}

function extractProfile(rawText) {
  const normalized = rawText.replace(/\s+/g, ' ').trim();
  const lines = rawText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    name: extractName(lines),
    fullText: normalized,
    education: pickLines(lines, ['大学', 'University', '硕士', '本科', '学士', 'Master', 'Bachelor', '商业人工智能']),
    educationDetails: extractEducationDetails(lines),
    workExperienceDetails: extractExperienceDetails(lines, '工作经历', '项目经历'),
    projectExperienceDetails: extractProjectDetails(lines),
    practiceDetails: extractPracticeDetails(lines),
    skills: extractSkills(normalized),
    skillDetails: extractSkillDetails(lines),
    experiences: pickLines(lines, ['实习', '项目', '算法', '产品', '分析', '竞赛', 'Intern', 'Project', 'AI', '数据']),
    languages: extractLanguages(normalized),
    textLength: rawText.length,
    summary: normalized.slice(0, 1600),
  };
}

function extractName(lines) {
  const candidate = lines.find((line) => /^[\u4e00-\u9fa5]{2,4}$/.test(line));
  return candidate || lines[0] || '';
}

function pickLines(lines, keywords) {
  const result = [];
  for (const line of lines) {
    if (keywords.some((keyword) => line.toLowerCase().includes(keyword.toLowerCase()))) {
      result.push(line);
    }
    if (result.length >= 8) break;
  }
  return result;
}

function extractSection(lines, startHeading, endHeadings = []) {
  const startIndex = lines.findIndex((line) => line.includes(startHeading));
  if (startIndex === -1) return [];

  const endIndex = lines.findIndex(
    (line, index) => index > startIndex && endHeadings.some((heading) => line.includes(heading))
  );
  return lines.slice(startIndex + 1, endIndex === -1 ? undefined : endIndex);
}

function splitDatedEntries(lines) {
  const entries = [];
  let current = null;
  const datePattern = /20\d{2}[./-]\d{1,2}\s*[-–—至]\s*(?:20\d{2}[./-]\d{1,2}|至今)/;

  for (const line of lines) {
    if (datePattern.test(line)) {
      if (current) entries.push(current);
      current = { header: line, details: [] };
    } else if (current) {
      current.details.push(line);
    }
  }

  if (current) entries.push(current);
  return entries;
}

function parseDateRange(header) {
  const match = header.match(/(20\d{2}[./-]\d{1,2})\s*[-–—至]\s*((?:20\d{2}[./-]\d{1,2})|至今)/);
  return {
    startDate: normalizeDate(match?.[1] || ''),
    endDate: normalizeDate(match?.[2] || ''),
  };
}

function normalizeDate(value) {
  return value ? value.replace(/[/-]/g, '.') : '';
}

function splitHeaderParts(header) {
  return header
    .split(/[|｜]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function stripDateRange(value) {
  return value.replace(/20\d{2}[./-]\d{1,2}\s*[-–—至]\s*(?:20\d{2}[./-]\d{1,2}|至今)/, '').trim();
}

function extractEducationDetails(lines) {
  return splitDatedEntries(extractSection(lines, '教育背景', ['工作经历', '项目经历', '实践与荣誉', '专业技能'])).map((entry) => {
    const parts = splitHeaderParts(entry.header);
    const { startDate, endDate } = parseDateRange(entry.header);
    const school = stripDateRange(parts[1] || parts[0] || '').replace(/[（(].*?[)）]/g, '').trim();
    const majorDegree = parts.slice(2).join(' ');
    const degree = pick(/(硕士|本科|学士|博士|双学位|Master|Bachelor|PhD)/i, majorDegree);
    const major = majorDegree.replace(degree, '').replace(/[()（）].*?[)）]/g, '').trim();
    const courses = entry.details.find((line) => line.includes('课程')) || '';
    const ranking = entry.details.find((line) => /成绩|排名|GPA|奖学金/.test(line)) || '';

    return {
      school,
      degree,
      major,
      startDate,
      endDate,
      ranking,
      courses: courses.replace(/^.*?[:：]/, ''),
      description: entry.details.join(' '),
    };
  });
}

function extractExperienceDetails(lines, startHeading, endHeading) {
  return splitDatedEntries(extractSection(lines, startHeading, [endHeading, '实践与荣誉', '专业技能'])).map((entry) => {
    const parts = splitHeaderParts(entry.header);
    const { startDate, endDate } = parseDateRange(entry.header);
    return {
      company: stripDateRange(parts[1] || parts[0] || ''),
      department: normalizeDepartment(parts[2] || ''),
      role: parts.slice(3).join(' | ') || extractRole(parts[2] || ''),
      startDate,
      endDate,
      description: entry.details.join(' '),
    };
  });
}

function normalizeDepartment(value) {
  if (/实习|工程师|产品经理|分析师|开发/.test(value) && !/[部中心组]$/.test(value)) {
    return value.replace(/(?:AI算法|AI应用开发|实习产品经理|产品经理|算法工程师|数据分析师|开发工程师|实习生).*$/, '');
  }
  return value;
}

function extractRole(value) {
  const match = value.match(/(AI算法实习生|AI应用开发实习生|实习产品经理|产品经理|算法工程师|数据分析师|开发工程师|实习生)$/);
  return match?.[1] || value;
}

function extractProjectDetails(lines) {
  return splitDatedEntries(extractSection(lines, '项目经历', ['实践与荣誉', '专业技能'])).map((entry) => {
    const { startDate, endDate } = parseDateRange(entry.header);
    const nameWithRole = stripDateRange(entry.header).replace(/^[|｜]\s*/, '');
    const role = pick(/[（(](.*?)[)）]/, nameWithRole);
    return {
      name: nameWithRole.replace(/[（(].*?[)）]/g, '').trim(),
      role,
      startDate,
      endDate,
      description: entry.details.join(' '),
      technologies: extractSkills(`${entry.header} ${entry.details.join(' ')}`).join('、'),
    };
  });
}

function extractPracticeDetails(lines) {
  return extractSection(lines, '实践与荣誉', ['专业技能'])
    .filter((line) => /：/.test(line))
    .map((line) => {
      const [title, ...rest] = line.split('：');
      return { title: title.trim(), description: rest.join('：').trim() };
    });
}

function extractSkillDetails(lines) {
  const skillLines = extractSection(lines, '专业技能', []);
  const findLine = (keyword) => skillLines.find((line) => line.includes(keyword)) || '';
  return {
    programming: findLine('编程开发').replace(/^.*?[:：]/, '').trim(),
    data: findLine('数据技术').replace(/^.*?[:：]/, '').trim(),
    product: 'Axure、Photoshop、Office办公套件、产品原型设计、需求评审、用户体验地图',
    languages: findLine('语言能力').replace(/^.*?[:：]/, '').trim(),
  };
}

function extractSkills(text) {
  const skillTerms = [
    'Python',
    'SQL',
    'PyTorch',
    'TensorFlow',
    '机器学习',
    '深度学习',
    '计算机视觉',
    '数据挖掘',
    '数据分析',
    '商业分析',
    '图神经网络',
    '产品经理',
    'A/B',
    'Tableau',
    'Excel',
    'Pandas',
    'Numpy',
  ];

  return skillTerms.filter((term) => text.toLowerCase().includes(term.toLowerCase()));
}

function extractLanguages(text) {
  const languages = [];
  if (/英语|English|IELTS|TOEFL|CET/i.test(text)) languages.push('英语');
  if (/普通话|Mandarin/i.test(text)) languages.push('普通话');
  if (/粤语|Cantonese/i.test(text)) languages.push('粤语');
  return languages;
}

function pick(pattern, text = '') {
  const match = text.match(pattern);
  return match ? match[1] || match[0] : '';
}

function readRequestBuffer(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

function parseMultipartFile(body, boundary) {
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const firstBoundary = body.indexOf(boundaryBuffer);
  const secondBoundary = body.indexOf(boundaryBuffer, firstBoundary + boundaryBuffer.length);

  if (firstBoundary === -1 || secondBoundary === -1) {
    throw new Error('Multipart file payload is invalid');
  }

  const part = body.subarray(firstBoundary + boundaryBuffer.length + 2, secondBoundary - 2);
  const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));

  if (headerEnd === -1) {
    throw new Error('Multipart file headers are invalid');
  }

  const headers = part.subarray(0, headerEnd).toString('utf8');
  const fileNameMatch = headers.match(/filename="([^"]+)"/);
  const fileBuffer = part.subarray(headerEnd + 4);

  if (!fileNameMatch || fileBuffer.length === 0) {
    throw new Error('Uploaded file is missing');
  }

  return {
    fileName: fileNameMatch[1],
    fileBuffer,
  };
}
