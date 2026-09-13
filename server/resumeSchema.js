import { z } from 'zod';

const nullableText = z.string().trim().nullable().catch(null);
const resumeObject = z.record(z.string(), z.unknown()).catch({});

const datedResumeEntrySchema = z.object({
  startDate: nullableText,
  endDate: nullableText,
  description: nullableText,
});

export const ResumeSchema = z.object({
  basicInfo: z.object({
    name: nullableText,
    phone: nullableText,
    email: nullableText,
    location: nullableText,
  }),
  education: z.array(
    datedResumeEntrySchema.extend({
      school: nullableText,
      degree: nullableText,
      major: nullableText,
    }),
  ),
  workExperience: z.array(
    datedResumeEntrySchema.extend({
      company: nullableText,
      position: nullableText,
    }),
  ),
  projects: z.array(
    datedResumeEntrySchema.extend({
      projectName: nullableText,
      role: nullableText,
    }),
  ),
  skills: z.array(z.string().trim()).catch([]),
});

export function createEmptyStructuredResume() {
  return {
    basicInfo: {
      name: null,
      phone: null,
      email: null,
      location: null,
    },
    education: [],
    workExperience: [],
    projects: [],
    skills: [],
  };
}

export function normalizeStructuredResumeCandidate(candidate = {}) {
  const source = resumeObject.parse(candidate);
  const root = firstObject(source, ['resume', 'data', 'result', 'structuredResume', 'structured_resume']) || source;
  const basicInfo = firstObject(root, ['basicInfo', 'basic_info', 'personalInfo', 'personal_info', 'personal', 'contact', '基础信息', '个人信息']) || {};

  return {
    basicInfo: {
      name: firstText(basicInfo, ['name', 'fullName', 'full_name', '姓名', '姓名/名称']),
      phone: firstText(basicInfo, ['phone', 'mobile', 'mobilePhone', 'mobile_phone', 'telephone', '手机号', '手机', '电话', '联系方式']),
      email: firstText(basicInfo, ['email', 'mail', 'e_mail', '邮箱', '电子邮箱']),
      location: firstText(basicInfo, ['location', 'city', 'currentCity', 'current_city', '所在地', '城市', '现居地']),
    },
    education: arrayFrom(root, ['education', 'educations', 'educationExperience', 'education_experience', '教育经历', '教育背景']).map((item) => ({
      school: firstText(item, ['school', 'university', 'college', 'institution', '学校', '院校', '毕业院校']),
      degree: firstText(item, ['degree', 'educationLevel', 'education_level', '学历', '学位']),
      major: firstText(item, ['major', 'field', 'fieldOfStudy', 'field_of_study', '专业', '主修']),
      startDate: firstText(item, ['startDate', 'start_date', 'from', 'beginDate', 'begin_date', '开始时间', '入学时间']),
      endDate: firstText(item, ['endDate', 'end_date', 'to', '毕业时间', '结束时间']),
      description: firstText(item, ['description', 'details', 'rawText', 'raw_text', '原文', '描述']),
    })),
    workExperience: arrayFrom(root, ['workExperience', 'work_experience', 'workExperiences', 'internshipExperience', 'internship_experience', 'experiences', '工作经历', '实习经历']).map((item) => ({
      company: firstText(item, ['company', 'organization', 'employer', '公司', '单位', '组织']),
      position: firstText(item, ['position', 'title', 'role', 'jobTitle', 'job_title', '职位', '岗位', '角色']),
      startDate: firstText(item, ['startDate', 'start_date', 'from', 'beginDate', 'begin_date', '开始时间']),
      endDate: firstText(item, ['endDate', 'end_date', 'to', '结束时间']),
      description: firstText(item, ['description', 'responsibilities', 'details', 'rawText', 'raw_text', '职责', '描述', '原文']),
    })),
    projects: arrayFrom(root, ['projects', 'projectExperience', 'project_experience', 'projectExperiences', '项目经历', '项目经验']).map((item) => ({
      projectName: firstText(item, ['projectName', 'project_name', 'name', 'title', '项目名称', '项目']),
      role: firstText(item, ['role', 'position', 'title', '职责', '角色']),
      startDate: firstText(item, ['startDate', 'start_date', 'from', 'beginDate', 'begin_date', '开始时间']),
      endDate: firstText(item, ['endDate', 'end_date', 'to', '结束时间']),
      description: firstText(item, ['description', 'responsibilities', 'details', 'rawText', 'raw_text', '项目描述', '描述', '原文']),
    })),
    skills: normalizeSkills(firstValue(root, ['skills', 'skillList', 'skill_list', '技能', '专业技能'])),
  };
}

function firstObject(source = {}, keys = []) {
  const value = firstValue(source, keys);
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function firstValue(source = {}, keys = []) {
  for (const key of keys) {
    if (source && Object.hasOwn(source, key) && source[key] !== undefined && source[key] !== null) return source[key];
  }
  return null;
}

function firstText(source = {}, keys = []) {
  const value = firstValue(source, keys);
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map((item) => String(item ?? '').trim()).filter(Boolean).join('\n') || null;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value).trim() || null;
}

function arrayFrom(source = {}, keys = []) {
  const value = firstValue(source, keys);
  if (Array.isArray(value)) return value.filter((item) => item && typeof item === 'object');
  return [];
}

function normalizeSkills(value) {
  if (Array.isArray(value)) return value.map((item) => String(item ?? '').trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(/[、,;；\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}
