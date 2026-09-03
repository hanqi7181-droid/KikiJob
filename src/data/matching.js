function splitTerms(value = '') {
  return value
    .replace(/[：；、，。()（）/\\|,.;]/g, ' ')
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function includesAny(text, values = []) {
  return values.filter((value) => value && text.toLowerCase().includes(String(value).toLowerCase()));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function evaluateJobMatch(job, profile, parsedResume) {
  const roleTerms = splitTerms(profile.roles);
  const resumeSkills = parsedResume?.skills || [];
  const resumeEvidence = [...(parsedResume?.education || []), ...(parsedResume?.experiences || [])].join(' ');
  const jobText = `${job.title} ${job.company} ${job.description || ''} ${(job.tags || []).join(' ')}`;
  const reasons = [];
  const risks = [];
  let score = 38;

  if (profile.cities?.includes(job.city)) {
    score += 14;
    reasons.push(`城市匹配：${job.city}`);
  } else if (job.city && job.city !== '未标注') {
    risks.push(`城市不在偏好列表：${job.city}`);
  }

  if (profile.industries?.includes(job.companyType)) {
    score += 12;
    reasons.push(`行业/公司类型匹配：${job.companyType}`);
  } else if (job.companyType && job.companyType !== '未标注') {
    risks.push(`公司类型未命中偏好：${job.companyType}`);
  }

  if (profile.goals?.includes(job.goal)) {
    score += 10;
    reasons.push(`求职目标匹配：${job.goal}`);
  } else if (job.goal) {
    risks.push(`岗位目标可能不一致：${job.goal}`);
  }

  const tagHits = unique((job.tags || []).filter((tag) => roleTerms.some((term) => tag.includes(term) || term.includes(tag))));
  if (tagHits.length) {
    score += Math.min(16, tagHits.length * 4);
    reasons.push(`岗位方向命中：${tagHits.slice(0, 4).join('、')}`);
  }

  const resumeSkillHits = includesAny(jobText, resumeSkills);
  if (resumeSkillHits.length) {
    score += Math.min(16, resumeSkillHits.length * 4);
    reasons.push(`简历技能命中：${resumeSkillHits.slice(0, 4).join('、')}`);
  } else if (parsedResume) {
    risks.push('简历技能与 JD 的直接重合较少');
  }

  const evidenceHits = roleTerms.filter((term) => resumeEvidence.includes(term) && jobText.includes(term));
  if (evidenceHits.length) {
    score += Math.min(8, evidenceHits.length * 2);
    reasons.push(`经历证据支持：${unique(evidenceHits).slice(0, 3).join('、')}`);
  }

  if (/社招|3年|5年|经验|senior/i.test(jobText) && profile.identity === '应届毕业生') {
    score -= 10;
    risks.push('JD 可能偏社招或要求经验，应届身份需确认');
  }

  if (/英语|English|CET|IELTS|TOEFL/i.test(jobText) && !parsedResume?.languages?.length) {
    risks.push('JD 可能有语言要求，简历语言信息未明显识别');
  }

  if (!job.description && !job.isDemo) {
    risks.push('岗位 JD 信息较少，评分可信度偏低');
  }

  return {
    ...job,
    score: Math.max(1, Math.min(99, score)),
    reasons: reasons.slice(0, 4),
    risks: risks.slice(0, 3),
    skillHits: resumeSkillHits,
  };
}
