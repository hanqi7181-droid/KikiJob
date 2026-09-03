export const defaultFormFields = [
  { id: 'fullName', label: '姓名', aliases: 'Full Name / Name / 姓名', sourceLabel: '姓名' },
  { id: 'email', label: '邮箱', aliases: 'Email / E-mail / 邮箱', sourceLabel: '邮箱' },
  { id: 'phone', label: '电话', aliases: 'Phone / Mobile / 电话', sourceLabel: '电话' },
  { id: 'city', label: '当前城市', aliases: 'Location / City / 当前城市', sourceLabel: '当前城市' },
  { id: 'hometown', label: '籍贯', aliases: 'Hometown / Native Place / 籍贯', sourceLabel: '籍贯' },
  { id: 'birthDate', label: '出生年月', aliases: 'Date of Birth / Birthday / 出生年月', sourceLabel: '出生年月' },
  { id: 'politicalStatus', label: '政治面貌', aliases: 'Political Status / 政治面貌', sourceLabel: '政治面貌' },
  { id: 'school', label: '学校', aliases: 'School / University / 学校', sourceLabel: '学校' },
  { id: 'major', label: '专业', aliases: 'Major / Discipline / 专业', sourceLabel: '专业' },
  { id: 'degree', label: '学历', aliases: 'Degree / Education / 学历', sourceLabel: '学历' },
  { id: 'targetRole', label: '目标岗位', aliases: 'Position / Job Applied / 目标岗位', sourceLabel: '岗位方向' },
  { id: 'skills', label: '技能关键词', aliases: 'Skills / Keywords / 技能', sourceLabel: '技能关键词' },
  { id: 'language', label: '语言能力', aliases: 'Language / English / 语言能力', sourceLabel: '语言能力' },
  { id: 'resumeFile', label: '简历附件', aliases: 'Resume / CV / 简历附件', sourceLabel: '简历文件' },
];

export function flattenPacket(applicationPacket) {
  return applicationPacket.flatMap((section) =>
    section.fields.map((field) => ({
      group: section.group,
      label: field.label,
      value: field.value || '',
    }))
  );
}

export function buildFormMappings(applicationPacket) {
  const flat = flattenPacket(applicationPacket);
  return defaultFormFields.map((field) => {
    const source = flat.find((item) => item.label === field.sourceLabel) || { label: field.sourceLabel, value: '' };
    return {
      ...field,
      sourceLabel: source.label,
      value: source.value,
    };
  });
}
