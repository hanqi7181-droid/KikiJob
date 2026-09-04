import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { persistResumeFile } from './storage.js';

const execFileAsync = promisify(execFile);
const projectRoot = join(import.meta.dirname, '..');
const uploadDir = join(projectRoot, 'uploads');
const pythonPath = process.env.PYTHON_PATH || process.env.PYTHON || 'python3';
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
    rawText = await extractPdfText(filePath).catch((error) => {
      console.warn(`[resume-parser] PDF text extraction failed: ${error.message}`);
      return '';
    });
  } else if (['.txt', '.md'].includes(extension)) {
    rawText = readFileSync(filePath, 'utf8');
  } else {
    throw new Error('Current parser supports PDF, TXT, and Markdown files');
  }

  const parsedProfile = rawText
    ? extractProfile(rawText)
    : {
        name: '',
        fullText: '',
        education: [],
        educationDetails: [],
        workExperienceDetails: [],
        projectExperienceDetails: [],
        practiceDetails: [],
        skills: [],
        skillDetails: [],
        experiences: [],
        languages: [],
        textLength: 0,
        summary: '简历文件已保存，但当前运行环境未能提取 PDF 文本。请在下一步手动补充或确认资料。',
        parseWarning: 'PDF_TEXT_EXTRACTION_FAILED',
      };
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
  if (looksLikeFilePath(pythonPath) && !existsSync(pythonPath)) {
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

function looksLikeFilePath(value) {
  return /[\\/]/.test(value) || /^[A-Za-z]:/.test(value);
}

function extractProfile(rawText) {
  const normalized = rawText.replace(/\s+/g, ' ').trim();
  const lines = rawText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const educationDetails = extractEducationDetails(lines, rawText, normalized);
  const skillDetails = extractSkillDetails(lines, normalized);

  return {
    name: extractName(lines, rawText),
    email: extractEmail(rawText),
    phone: extractPhone(rawText),
    fullText: normalized,
    education: pickLines(lines, ['大学', 'University', '硕士', '本科', '学士', 'Master', 'Bachelor', '商业人工智能']),
    educationDetails,
    workExperienceDetails: extractExperienceDetails(lines, '工作经历', '项目经历'),
    projectExperienceDetails: extractProjectDetails(lines),
    practiceDetails: extractPracticeDetails(lines),
    skills: extractSkills(normalized),
    skillDetails,
    experiences: pickLines(lines, ['实习', '项目', '算法', '产品', '分析', '竞赛', 'Intern', 'Project', 'AI', '数据']),
    languages: extractLanguages(normalized),
    jobIntention: extractJobIntention(rawText),
    textLength: rawText.length,
    summary: normalized.slice(0, 1600),
  };
}

function extractName(lines, rawText = lines.join('\n')) {
  const joinedHead = lines.slice(0, 8).join(' ');
  const labeled = pick(/(?:姓名|Name)[:：\s]+([\u4e00-\u9fa5]{2,8}|[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})/i, rawText);
  if (labeled) return labeled;
  const chineseName = lines.slice(0, 10).find((line) => /^[\u4e00-\u9fa5]{2,4}$/.test(line));
  if (chineseName) return chineseName;
  const inlineChinese = pick(/(^|[\s｜|])([\u4e00-\u9fa5]{2,4})(?=\s|$|[｜|])/u, joinedHead, 2);
  if (inlineChinese && !/(大学|学院|硕士|本科|电话|邮箱|求职|教育)/.test(inlineChinese)) return inlineChinese;
  return '';
}

function extractEmail(text) {
  return pick(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, text);
}

function extractPhone(text) {
  return pick(/(?:\+?86[-\s]?)?1[3-9]\d[-\s]?\d{4}[-\s]?\d{4}/, text).replace(/\s|-/g, '');
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

function extractEducationDetails(lines, rawText = lines.join('\n'), normalized = lines.join(' ')) {
  const sectionEntries = splitDatedEntries(extractSection(lines, '教育背景', ['工作经历', '项目经历', '实践与荣誉', '专业技能'])).map((entry) => {
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
  if (sectionEntries.length) return sectionEntries;

  const school = extractSchool(normalized);
  const degree = extractDegree(normalized);
  const major = extractMajor(rawText || normalized);
  return school || degree || major
    ? [
        {
          school,
          degree,
          major,
          startDate: '',
          endDate: '',
          ranking: '',
          courses: '',
          description: [school, degree, major].filter(Boolean).join(' '),
        },
      ]
    : [];
}

function extractSchool(text) {
  return pick(/([\u4e00-\u9fa5A-Za-z\s]+?(?:大学|学院|University|College|Institute))/i, text)
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDegree(text) {
  return pick(/(博士|硕士|研究生|本科|学士|Master|MSc|MA|Bachelor|BSc|BA|PhD)/i, text);
}

function extractMajor(text) {
  const labeled = pick(/(?:专业|Major)[:：\s]+([^\n。；;]{2,30})/i, text);
  if (labeled) return cleanupMajor(labeled);
  return cleanupMajor(pick(/(商业人工智能|人工智能|计算机科学与技术|软件工程|数据科学|金融科技|工商管理|市场营销|统计学|数学与应用数学)/, text));
}

function cleanupMajor(value = '') {
  return String(value)
    .replace(/(目标岗位|求职意向|意向岗位|技能|邮箱|电话|教育背景).*$/i, '')
    .replace(/(硕士|本科|学士|博士|Master|Bachelor|PhD).*$/i, '')
    .trim();
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

function extractSkillDetails(lines, normalized = lines.join(' ')) {
  const skillLines = extractSection(lines, '专业技能', []);
  const findLine = (keyword) => skillLines.find((line) => line.includes(keyword)) || '';
  return {
    programming: findLine('编程开发').replace(/^.*?[:：]/, '').trim() || extractSkillBucket(normalized, ['Python', 'JavaScript', 'TypeScript', 'SQL', 'React', 'Node.js']),
    data: findLine('数据技术').replace(/^.*?[:：]/, '').trim() || extractSkillBucket(normalized, ['Pandas', 'Numpy', 'Tableau', 'Power BI', '机器学习', '深度学习', '数据分析']),
    product: extractSkillBucket(normalized, ['Axure', 'Figma', 'Photoshop', 'Office', '产品原型', '需求分析', '用户体验']),
    languages: findLine('语言能力').replace(/^.*?[:：]/, '').trim() || extractLanguages(normalized).join('、'),
  };
}

function extractSkillBucket(text, terms) {
  return terms.filter((term) => text.toLowerCase().includes(term.toLowerCase())).join('、');
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
    'React',
    'Node.js',
    'Figma',
    'Axure',
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

function extractJobIntention(text) {
  const labeled = pick(/(?:求职意向|目标岗位|意向岗位|岗位意向)[:：\s]+([^。；;\n]{2,80})/i, text);
  if (labeled) return labeled.trim();
  return extractSkills(text)
    .filter((skill) => /产品经理|数据分析|商业分析|算法工程师|机器学习|计算机视觉|AI/.test(skill))
    .slice(0, 4)
    .join('、');
}

function pick(pattern, text = '', groupIndex = 1) {
  const match = String(text).match(pattern);
  return match ? match[groupIndex] || match[1] || match[0] : '';
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
