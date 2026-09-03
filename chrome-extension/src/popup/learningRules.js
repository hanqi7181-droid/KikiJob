function fieldSignature(field) {
  return normalize([field.label, field.name, field.id, field.placeholder, field.inputType, field.selector].filter(Boolean).join('|'));
}

function findLearnedMapping(field, mappings = [], context = {}) {
  const signature = fieldSignature(field);
  const priority = ['page', 'domain', 'ats', 'global'];
  return mappings
    .filter((item) => item.fieldSignature === signature)
    .filter((item) => {
      if (item.scope === 'page') return item.pageUrl === context.pageUrl;
      if (item.scope === 'domain') return item.domain === context.domain;
      if (item.scope === 'ats') return item.adapter === context.adapter;
      return item.scope === 'global';
    })
    .sort((a, b) => priority.indexOf(a.scope) - priority.indexOf(b.scope))[0];
}

function isSensitiveField(field) {
  const text = [field.label, field.name, field.id, field.placeholder, field.nearbyText].filter(Boolean).join(' ');
  return /性别|gender|sex|民族|ethnicity|race|残障|残疾|disability|政治面貌|政治身份|党员|political|婚姻|marital|宗教|religion/i.test(text);
}

function normalize(value = '') {
  return String(value).toLowerCase().replace(/[\s/_\-:：*（）()[\]{}"'‘’“”，,.;；。]+/g, '');
}

if (typeof module !== 'undefined') {
  module.exports = { fieldSignature, findLearnedMapping, isSensitiveField, normalize };
}
