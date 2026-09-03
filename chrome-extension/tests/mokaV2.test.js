import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const extensionRoot = path.resolve('chrome-extension');

function loadScript(context, relativePath) {
  const source = fs.readFileSync(path.join(extensionRoot, relativePath), 'utf8');
  vm.runInContext(source, context, { filename: relativePath });
}

class FakeElement {
  constructor(tagName, options = {}) {
    this.tagName = tagName.toUpperCase();
    this.className = options.className || '';
    this.innerText = options.text || '';
    this.textContent = options.text || '';
    this.value = options.value || '';
    this.id = options.id || '';
    this.name = options.name || '';
    this.type = options.type || '';
    this.placeholder = options.placeholder || '';
    this.dataset = {};
    this.children = [];
    this.parentElement = null;
    this.onClick = options.onClick || null;
  }

  append(...children) {
    for (const child of children) {
      child.parentElement = this;
      this.children.push(child);
    }
    this.refreshText();
  }

  refreshText() {
    const childText = this.children.map((child) => child.innerText || child.textContent || '').filter(Boolean).join(' ');
    if (childText) {
      this.innerText = `${this._ownText || this.innerText || ''} ${childText}`.trim();
      this.textContent = this.innerText;
    }
    this.parentElement?.refreshText?.();
  }

  querySelectorAll(selector) {
    const parts = selector.split(',').map((item) => item.trim()).filter(Boolean);
    const descendants = [];
    const visit = (node) => {
      for (const child of node.children) {
        descendants.push(child);
        visit(child);
      }
    };
    visit(this);
    return descendants.filter((element) => parts.some((part) => matches(element, part)));
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  closest(selector) {
    let current = this;
    while (current) {
      if (selector.split(',').some((part) => matches(current, part.trim()))) return current;
      current = current.parentElement;
    }
    return null;
  }

  contains(element) {
    if (element === this) return true;
    return this.children.some((child) => child.contains(element));
  }

  matches(selector) {
    return matches(this, selector);
  }

  getAttribute(name) {
    if (name === 'type') return this.type;
    if (name === 'name') return this.name;
    if (name === 'placeholder') return this.placeholder;
    return '';
  }

  getBoundingClientRect() {
    return { width: 100, height: 24 };
  }

  getClientRects() {
    return [this.getBoundingClientRect()];
  }

  click() {
    this.onClick?.();
  }

  compareDocumentPosition(other) {
    return orderOf(this) < orderOf(other) ? 4 : 2;
  }
}

function matches(element, selector) {
  if (!selector) return false;
  if (selector.includes('[')) selector = selector.replace(/\[.*?\]/g, '');
  if (selector.startsWith('.')) return String(element.className).split(/\s+/).includes(selector.slice(1));
  if (selector.includes('[class*="title"]') || selector.includes('[class*="Title"]')) return /title|Title/.test(element.className);
  const tag = selector.toUpperCase();
  return element.tagName === tag;
}

function orderOf(target) {
  const root = target.getRoot();
  const nodes = [];
  const visit = (node) => {
    nodes.push(node);
    node.children.forEach(visit);
  };
  visit(root);
  return nodes.indexOf(target);
}

FakeElement.prototype.getRoot = function getRoot() {
  let current = this;
  while (current.parentElement) current = current.parentElement;
  return current;
};

function field(label, tag = 'input', value = '') {
  const wrapper = new FakeElement('div', { className: 'apply-field-Q2iJ7AtQGX' });
  wrapper.append(new FakeElement('div', { className: 'label-sL4kEWLIRC', text: label }), new FakeElement(tag, { value, placeholder: label }));
  return wrapper;
}

function item(fields) {
  const element = new FakeElement('div', { className: 'repeat-item' });
  element.append(...fields, new FakeElement('button', { text: '删除本条' }));
  return element;
}

function section(title, itemFactory, count) {
  const element = new FakeElement('section');
  const heading = new FakeElement('h3', { text: title, className: 'title' });
  element.append(heading);
  for (let index = 0; index < count; index += 1) element.append(itemFactory());
  element.append(new FakeElement('button', { text: '添加', onClick: () => element.append(itemFactory()) }));
  return element;
}

function educationItem() {
  return item([field('学历'), field('学习形式'), field('就读时间'), field('学校名称'), field('学院'), field('专业名称'), field('专业排名'), field('绩点/绩点总分')]);
}

function internshipItem() {
  return item([field('起止时间'), field('公司名称'), field('职位名称'), field('工作职责', 'textarea')]);
}

function projectItem() {
  return item([field('起止时间'), field('项目名称'), field('职责'), field('项目描述', 'textarea'), field('项目中职责', 'textarea')]);
}

function awardItem() {
  return item([field('获奖时间'), field('奖项名称')]);
}

function createContext() {
  const body = new FakeElement('body');
  body.append(
    section('个人信息', () => item([field('姓名'), field('邮箱'), field('手机号')]), 1),
    section('教育背景', educationItem, 1),
    section('实习经历', internshipItem, 1),
    section('项目经验', projectItem, 1),
    section('获奖经历', awardItem, 1)
  );
  const root = {
    utils: {
      norm(value = '') {
        return String(value).toLowerCase().replace(/[\s/_\-:：*（）()[\]{}]+/g, '');
      },
    },
    adapters: {},
    filler: {
      fillControl(target, value) {
        target.value = String(value);
        return true;
      },
      setValue(target, value) {
        target.value = String(value);
      },
    },
  };
  const context = {
    window: { JobPilotAutofill: root },
    location: { href: 'https://app.mokahr.com/campus-recruitment/shopee/apply', hostname: 'app.mokahr.com' },
    document: {
      body,
      querySelector(selector) {
        return body.querySelector(selector);
      },
      querySelectorAll(selector) {
        return body.querySelectorAll(selector);
      },
    },
    getComputedStyle() {
      return { display: 'block', visibility: 'visible' };
    },
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    Node: { DOCUMENT_POSITION_FOLLOWING: 4 },
    Element: FakeElement,
    CSS: { escape: (value) => String(value) },
    setInterval,
    clearInterval,
    setTimeout,
  };
  context.window.window = context.window;
  context.window.document = context.document;
  vm.createContext(context);
  loadScript(context, 'src/content/core/profileNormalizer.js');
  loadScript(context, 'src/content/adapters/mokaDrivers.js');
  loadScript(context, 'src/content/adapters/mokaV2.js');
  context.window.JobPilotAutofill.adapters.mokaV2.testWaitMs = 20;
  return context;
}

test('Moka V2 normalizes flat profile into arrays', () => {
  const context = createContext();
  const normalizer = context.window.JobPilotAutofill.profileNormalizer;
  const { profile } = normalizer.normalizeFillSteps([
    { id: 'education1School', value: '香港城市大学' },
    { id: 'education2School', value: '大连交通大学' },
    { id: 'internship1Company', value: '招商局金融科技有限公司' },
    { id: 'project1Name', value: '电商预测项目' },
    { id: 'award1Name', value: '优秀学生' },
  ]);

  assert.equal(profile.education[0].school, '香港城市大学');
  assert.equal(profile.education[1].school, '大连交通大学');
  assert.equal(profile.experiences[0].company, '招商局金融科技有限公司');
  assert.equal(profile.projects[0].name, '电商预测项目');
  assert.equal(profile.awards[0].name, '优秀学生');
});

test('Moka V2 adds repeatable items and binds values by item index', async () => {
  const context = createContext();
  const adapter = context.window.JobPilotAutofill.adapters.mokaV2;
  const steps = [
    { id: 'education1School', value: '香港城市大学' },
    { id: 'education1Major', value: '商业人工智能' },
    { id: 'education2School', value: '大连交通大学' },
    { id: 'education2Major', value: '英语/软件工程' },
    { id: 'internship1Company', value: '公司A' },
    { id: 'internship2Company', value: '公司B' },
    { id: 'internship3Company', value: '公司C' },
    { id: 'project1Name', value: '项目A' },
    { id: 'project2Name', value: '项目B' },
    { id: 'award1Name', value: '奖项A' },
    { id: 'award2Name', value: '奖项B' },
  ];

  const results = await adapter.fillSteps(steps);
  const schema = adapter.scanCurrentSchema();
  const education = schema.find((sectionItem) => sectionItem.sectionType === 'education');
  const internships = schema.find((sectionItem) => sectionItem.sectionType === 'internship');
  const projects = schema.find((sectionItem) => sectionItem.sectionType === 'projectExperience');
  const awards = schema.find((sectionItem) => sectionItem.sectionType === 'award');

  assert.equal(education.items.length, 2);
  assert.equal(internships.items.length, 3);
  assert.equal(projects.items.length, 2);
  assert.equal(awards.items.length, 2);
  assert.equal(valueIn(education.items[0], '学校名称'), '香港城市大学');
  assert.equal(valueIn(education.items[1], '学校名称'), '大连交通大学');
  assert.equal(valueIn(internships.items[2], '公司名称'), '公司C');
  assert.equal(valueIn(projects.items[1], '项目名称'), '项目B');
  assert.equal(valueIn(awards.items[1], '奖项名称'), '奖项B');
  const schoolResult = results.find((itemResult) => itemResult.status === 'SUCCESS' && itemResult.profilePath === 'education[0].school');
  assert.equal(schoolResult.section, '教育背景');
  assert.equal(schoolResult.itemIndex, 0);
  assert.equal(schoolResult.pageLabel, '学校名称');
  assert.equal(schoolResult.canonicalField, 'school');
  assert.equal(schoolResult.profileValuePreview, '香港城市大学');
  assert.equal(schoolResult.componentType, 'autocomplete');
  assert.equal(schoolResult.fillMethod, 'autocompleteDriver');
  assert.equal(schoolResult.readBefore, '');
  assert.equal(schoolResult.readAfter, '香港城市大学');
  assert.equal(schoolResult.failureReason, '');

  await adapter.fillSteps(steps);
  assert.equal(adapter.scanCurrentSchema().find((sectionItem) => sectionItem.sectionType === 'education').items.length, 2);
});

test('Moka V2 preserves existing user values by default', async () => {
  const context = createContext();
  const adapter = context.window.JobPilotAutofill.adapters.mokaV2;
  const education = adapter.scanCurrentSchema().find((sectionItem) => sectionItem.sectionType === 'education');
  fieldElement(education.items[0], '学校名称').value = '用户手工学校';

  const results = await adapter.fillSteps([{ id: 'education1School', value: '香港城市大学' }]);

  assert.equal(valueIn(adapter.scanCurrentSchema().find((sectionItem) => sectionItem.sectionType === 'education').items[0], '学校名称'), '用户手工学校');
  assert.ok(results.some((itemResult) => itemResult.status === 'SKIPPED' && itemResult.label === '学校名称'));
});

function fieldElement(itemElement, label) {
  const element = itemElement.fields.find((fieldItem) => fieldItem.label === label)?.element;
  if (!element) return null;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)) return element;
  return element.querySelector('input,textarea,select') || null;
}

function valueIn(itemElement, label) {
  return fieldElement(itemElement, label)?.value || '';
}
