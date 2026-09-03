function findFirst(pattern, text = '') {
  const match = text.match(pattern);
  return match ? match[1] || match[0] : '';
}

export function buildApplicationPacket(profile, parsedResume) {
  const summary = parsedResume?.summary || '';
  const educationText = (parsedResume?.education || []).join(' ');
  const allText = `${summary} ${educationText} ${(parsedResume?.experiences || []).join(' ')}`;

  return [
    {
      group: '个人信息',
      fields: [
        { label: '姓名', value: parsedResume?.name || '' },
        { label: '邮箱', value: findFirst(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, allText) },
        { label: '电话', value: findFirst(/(?:\+?86[-\s]?)?1[3-9]\d[-\s]?\d{4}[-\s]?\d{4}/, allText) },
        { label: '当前城市', value: findFirst(/(?:辽宁|北京|上海|深圳|广州|杭州|香港|成都|南京|苏州)[\u4e00-\u9fa5]*/, allText) },
      ],
    },
    {
      group: '教育信息',
      fields: [
        { label: '学校', value: findFirst(/([\u4e00-\u9fa5A-Za-z\s]+大学|[A-Za-z\s]+University)/, educationText) },
        { label: '专业', value: findFirst(/(商业人工智能|人工智能|计算机|数据科学|金融科技|Business\s+AI)/i, educationText) },
        { label: '学历', value: findFirst(/(硕士|本科|学士|Master|Bachelor)/i, educationText) },
        { label: '毕业/在读信息', value: educationText.slice(0, 90) },
      ],
    },
    {
      group: '求职偏好',
      fields: [
        { label: '身份', value: profile.identity },
        { label: '求职目标', value: (profile.goals || []).join('、') },
        { label: '目标城市', value: (profile.cities || []).join('、') },
        { label: '岗位方向', value: profile.roles },
        { label: '实习薪资', value: profile.salaryIntern },
        { label: '校招薪资', value: profile.salaryGraduate },
      ],
    },
    {
      group: '能力摘要',
      fields: [
        { label: '技能关键词', value: (parsedResume?.skills || []).join('、') },
        { label: '语言能力', value: (parsedResume?.languages || []).join('、') },
        { label: '行业偏好', value: (profile.industries || []).join('、') },
        { label: '简历文件', value: profile.resumeName },
      ],
    },
  ];
}
