import assert from 'node:assert/strict';
import test from 'node:test';
import { createPostgresRepository } from './postgresRepository.js';

function createRuntime(handler) {
  const calls = [];
  return {
    calls,
    info: { provider: 'postgres', client: 'pg' },
    async query(sql, params = []) {
      calls.push({ sql, params });
      return handler(sql, params);
    },
  };
}

test('PostgreSQL repository exposes the server persistence contract', () => {
  const repo = createPostgresRepository({ runtime: createRuntime(() => ({ rows: [] })) });
  const expectedMethods = [
    'addImportedJob',
    'addResume',
    'clearApplicationHistory',
    'clearProfileData',
    'createEmailSession',
    'createPasswordSession',
    'createSmsSession',
    'deleteFormMappings',
    'deleteImportedJob',
    'deleteResume',
    'ensureDefaultUser',
    'getApplicationMap',
    'getApplicationStatusMap',
    'getAuthProviders',
    'getDatabaseInfo',
    'getLatestResume',
    'getProfile',
    'getUserFromToken',
    'initDatabase',
    'listJobs',
    'listResumes',
    'requestEmailCode',
    'requestSmsCode',
    'revokeSession',
    'saveApplicationStatus',
    'saveFormMappings',
    'saveProfile',
    'setDefaultResume',
    'syncStandardFormMappings',
  ];

  for (const method of expectedMethods) {
    assert.equal(typeof repo[method], 'function', `${method} should be exposed`);
  }
});

test('PostgreSQL repository reads profile_json and falls back to an empty user profile', async () => {
  const profile = { name: 'Kiki', targetRoles: ['AI 产品经理'] };
  const runtime = createRuntime((sql, params) => {
    assert.match(sql, /FROM user_profiles/);
    assert.deepEqual(params, [42]);
    return { rows: [{ profile_json: profile }] };
  });
  const repo = createPostgresRepository({ runtime });

  assert.deepEqual(await repo.getProfile(42), profile);

  const emptyRepo = createPostgresRepository({
    runtime: createRuntime(() => ({ rows: [] })),
  });
  const fallback = await emptyRepo.getProfile(42);
  assert.equal(fallback.identity, '应届毕业生');
  assert.equal(fallback.resumeName, '');
  assert.equal(fallback.roles, '');
  assert.deepEqual(fallback.cities, []);
  assert.deepEqual(fallback.goals, []);
});

test('PostgreSQL repository maps jobs to the existing frontend job shape', async () => {
  const runtime = createRuntime((sql) => {
    assert.match(sql, /FROM jobs/);
    assert.match(sql, /WHERE is_demo = FALSE/);
    return {
      rows: [
        {
          id: '12',
          source: 'company_site',
          source_url: 'https://example.test/apply',
          title: 'AI Product Intern',
          company_name: 'Example Tech',
          location: '深圳',
          salary: '200-300/天',
          jd_text: 'Build AI product workflows.',
          tags: ['AI', 'Product'],
          company_type: '外企',
          recruitment_type: 'internship',
          channel: 'official',
          is_demo: false,
          published_at: new Date('2026-08-01T00:00:00.000Z'),
          deadline: '2026-09-30',
          source_updated_at: null,
          fetched_at: '2026-08-20T12:00:00.000Z',
        },
      ],
    };
  });
  const repo = createPostgresRepository({ runtime });

  assert.deepEqual(await repo.listJobs(), [
    {
      id: 12,
      source: 'company_site',
      sourceUrl: 'https://example.test/apply',
      title: 'AI Product Intern',
      company: 'Example Tech',
      city: '深圳',
      salary: '200-300/天',
      description: 'Build AI product workflows.',
      tags: ['AI', 'Product'],
      companyType: '外企',
      goal: 'internship',
      channel: 'official',
      isDemo: false,
      publishedAt: '2026-08-01T00:00:00.000Z',
      deadline: '2026-09-30',
      sourceUpdatedAt: '',
      fetchedAt: '2026-08-20T12:00:00.000Z',
    },
  ]);
});

test('PostgreSQL repository maps latest and historical resumes', async () => {
  const runtime = createRuntime((sql, params) => {
    assert.match(sql, /FROM resumes/);
    assert.deepEqual(params, [7]);
    return {
      rows: [
        {
          id: '9',
          file_name: 'resume.pdf',
          parsed_text: 'parsed text',
          parsed_profile_json: JSON.stringify({ name: 'Kiki' }),
          created_at: new Date('2026-08-02T00:00:00.000Z'),
          is_default: true,
          parse_status: 'parsed',
        },
      ],
    };
  });
  const repo = createPostgresRepository({ runtime });

  const expected = {
    id: 9,
    fileName: 'resume.pdf',
    parsedProfile: { name: 'Kiki' },
    textLength: 11,
    createdAt: '2026-08-02T00:00:00.000Z',
    isDefault: true,
    parseStatus: 'parsed',
  };

  assert.deepEqual(await repo.getLatestResume(7), expected);
  assert.deepEqual(await repo.listResumes(7), [expected]);
});

test('PostgreSQL repository saves profile and preference JSON through upserts', async () => {
  const profile = {
    name: 'Kiki',
    email: 'kiki@example.com',
    phone: '13800138000',
    identity: '应届毕业生',
    roles: 'AI 产品经理',
    cities: ['深圳', '上海'],
    companyTypes: ['外企'],
    education: [{ school: '香港城市大学' }],
    skills: { ai: ['LLM'] },
  };
  const runtime = createRuntime((sql, params) => {
    if (/SELECT profile_json/.test(sql)) return { rows: [{ profile_json: profile }] };
    if (/UPDATE users SET identity/.test(sql)) {
      assert.deepEqual(params, ['应届毕业生', 5]);
      return { rows: [] };
    }
    if (/INSERT INTO user_profiles/.test(sql)) {
      assert.equal(params[0], 5);
      assert.equal(params[1], 'Kiki');
      assert.equal(params[10], JSON.stringify([]));
      assert.equal(params[14], JSON.stringify(profile));
      return { rows: [] };
    }
    if (/INSERT INTO job_preferences/.test(sql)) {
      assert.equal(params[0], 5);
      assert.equal(params[1], 'AI 产品经理');
      assert.equal(params[3], JSON.stringify(['深圳', '上海']));
      assert.equal(params[6], JSON.stringify(['外企']));
      return { rows: [] };
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  });
  const repo = createPostgresRepository({ runtime });

  assert.deepEqual(await repo.saveProfile(5, profile), profile);
});

test('PostgreSQL repository inserts resume metadata and marks it as default', async () => {
  const existingProfile = { name: 'Kiki' };
  const runtime = createRuntime((sql, params) => {
    if (/UPDATE resumes SET is_default = FALSE/.test(sql)) {
      assert.deepEqual(params, [5]);
      return { rows: [] };
    }
    if (/INSERT INTO resumes/.test(sql)) {
      assert.deepEqual(params, [
        5,
        'resume.pdf',
        '5/resume.pdf',
        'application/pdf',
        1234,
        'raw resume',
        JSON.stringify({ name: 'Kiki' }),
        'parsed',
      ]);
      return { rows: [{ id: '22', user_id: '5', file_name: 'resume.pdf' }] };
    }
    if (/SELECT profile_json/.test(sql)) return { rows: [{ profile_json: existingProfile }] };
    if (/UPDATE users SET identity/.test(sql) || /INSERT INTO user_profiles/.test(sql) || /INSERT INTO job_preferences/.test(sql)) {
      return { rows: [] };
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  });
  const repo = createPostgresRepository({ runtime });

  assert.deepEqual(
    await repo.addResume(5, 'resume.pdf', 'raw resume', { name: 'Kiki' }, {
      storagePath: '5/resume.pdf',
      fileType: 'application/pdf',
      fileSize: 1234,
    }),
    {
      id: '22',
      user_id: '5',
      file_name: 'resume.pdf',
    }
  );
  assert(runtime.calls.some((call) => /resumeName/.test(String(call.params.at(-1)))));
});

test('PostgreSQL repository upserts application status and reads application maps', async () => {
  const applicationRow = {
    job_id: '12',
    status: '已投递',
    notes: '已提交官网',
    applied_at: '2026-08-03T00:00:00.000Z',
    follow_up_at: '2026-08-10',
    next_action: '查邮箱',
    submission_result: 'success',
    autofill_session_id: 'session-1',
    updated_source: 'extension',
    deleted_at: null,
    updated_at: '2026-08-03T01:00:00.000Z',
  };
  const runtime = createRuntime((sql, params) => {
    if (/INSERT INTO applications/.test(sql)) {
      assert.deepEqual(params, [
        5,
        12,
        '已投递',
        '已提交官网',
        '2026-08-10',
        '查邮箱',
        'success',
        'session-1',
        'extension',
        null,
      ]);
      return { rows: [applicationRow] };
    }
    if (/SELECT applications\.job_id, applications\.status\s+FROM applications/.test(sql)) {
      assert.deepEqual(params, [5]);
      return { rows: [applicationRow] };
    }
    if (/SELECT applications\.job_id, applications\.status, applications\.notes/.test(sql)) {
      assert.deepEqual(params, [5]);
      return { rows: [applicationRow] };
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  });
  const repo = createPostgresRepository({ runtime });

  assert.deepEqual(await repo.saveApplicationStatus(5, 12, '已投递', {
    notes: '已提交官网',
    followUpAt: '2026-08-10',
    nextAction: '查邮箱',
    submissionResult: 'success',
    autofillSessionId: 'session-1',
    updatedSource: 'extension',
  }), applicationRow);
  assert.deepEqual(await repo.getApplicationStatusMap(5), { 12: '已投递' });
  assert.deepEqual(await repo.getApplicationMap(5), {
    12: {
      status: '已投递',
      notes: '已提交官网',
      followUpAt: '2026-08-10',
      nextAction: '查邮箱',
      nextActionAt: '2026-08-10',
      appliedAt: '2026-08-03T00:00:00.000Z',
      submittedAt: '2026-08-03T00:00:00.000Z',
      submissionResult: 'success',
      autofillSessionId: 'session-1',
      updatedSource: 'extension',
      deletedAt: '',
      updatedAt: '2026-08-03T01:00:00.000Z',
    },
  });
});

test('PostgreSQL repository imports jobs and returns duplicates by source URL', async () => {
  const jobRow = {
    id: '31',
    source: 'company_site',
    source_url: 'https://example.test/apply',
    title: 'AI Intern',
    company_name: 'Example',
    location: '深圳',
    salary: '',
    jd_text: 'JD',
    tags: JSON.stringify(['AI']),
    company_type: '外企',
    recruitment_type: 'internship',
    channel: 'official',
    is_demo: false,
    fetched_at: '2026-08-01T00:00:00.000Z',
  };
  const runtime = createRuntime((sql) => {
    if (/SELECT \* FROM jobs WHERE source_url/.test(sql)) return { rows: [jobRow] };
    throw new Error(`Unexpected SQL: ${sql}`);
  });
  const repo = createPostgresRepository({ runtime });

  assert.deepEqual(await repo.addImportedJob({ sourceUrl: 'https://example.test/apply' }), {
    duplicate: true,
    job: {
      id: 31,
      source: 'company_site',
      sourceUrl: 'https://example.test/apply',
      title: 'AI Intern',
      company: 'Example',
      city: '深圳',
      salary: '',
      description: 'JD',
      tags: ['AI'],
      companyType: '外企',
      goal: 'internship',
      channel: 'official',
      isDemo: false,
      publishedAt: '',
      deadline: '',
      sourceUpdatedAt: '',
      fetchedAt: '2026-08-01T00:00:00.000Z',
    },
  });
});

test('PostgreSQL repository writes and deletes form mappings', async () => {
  const mappings = [{ field: 'email', canonicalField: 'email' }];
  const runtime = createRuntime((sql, params) => {
    if (/INSERT INTO form_mappings/.test(sql)) {
      assert.deepEqual(params, [5, JSON.stringify(mappings)]);
      return { rows: [] };
    }
    if (/SELECT mappings_json FROM form_mappings/.test(sql)) return { rows: [{ mappings_json: mappings }] };
    if (/DELETE FROM form_mappings/.test(sql)) {
      assert.deepEqual(params, [5]);
      return { rows: [] };
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  });
  const repo = createPostgresRepository({ runtime });

  assert.deepEqual(await repo.saveFormMappings(5, mappings), mappings);
  assert.equal(await repo.deleteFormMappings(5), null);
});

test('PostgreSQL repository creates password sessions with hashed session tokens', async () => {
  const runtime = createRuntime((sql, params) => {
    if (/SELECT \* FROM users WHERE LOWER\(email\)/.test(sql)) return { rows: [] };
    if (/INSERT INTO users/.test(sql)) {
      assert.equal(params[0], 'kiki');
      assert.equal(params[1], 'kiki@example.com');
      assert.equal(typeof params[3], 'string');
      assert.notEqual(params[3], 'secret123');
      return {
        rows: [
          {
            id: '8',
            name: 'kiki',
            email: 'kiki@example.com',
            phone: '',
            identity: '应届毕业生',
            auth_provider: 'local',
            password_hash: params[3],
            created_at: '2026-08-01T00:00:00.000Z',
          },
        ],
      };
    }
    if (/UPDATE users SET identity/.test(sql) || /INSERT INTO user_profiles/.test(sql) || /INSERT INTO job_preferences/.test(sql)) {
      return { rows: [] };
    }
    if (/SELECT profile_json/.test(sql)) return { rows: [{ profile_json: { email: 'kiki@example.com' } }] };
    if (/INSERT INTO auth_sessions/.test(sql)) {
      assert.equal(params[0].length, 64);
      assert.equal(params[1], '8');
      return { rows: [{ user_id: '8' }] };
    }
    if (/SELECT id, name, email, phone, identity, auth_provider, created_at FROM users/.test(sql)) {
      return {
        rows: [
          {
            id: '8',
            name: 'kiki',
            email: 'kiki@example.com',
            phone: '',
            identity: '应届毕业生',
            auth_provider: 'local',
            created_at: '2026-08-01T00:00:00.000Z',
          },
        ],
      };
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  });
  const repo = createPostgresRepository({ runtime });

  const payload = await repo.createPasswordSession('kiki@example.com', 'secret123');
  assert.equal(payload.token.length, 64);
  assert.deepEqual(payload.user, {
    id: 8,
    name: 'kiki',
    email: 'ki***@example.com',
    phone: '',
    identity: '应届毕业生',
    authProvider: 'local',
    createdAt: '2026-08-01T00:00:00.000Z',
  });
});

test('PostgreSQL repository requests and verifies email code sessions', async () => {
  let codeHash = '';
  let userCreated = false;
  const runtime = createRuntime((sql, params) => {
    if (/INSERT INTO email_codes/.test(sql)) {
      assert.equal(params[0], 'kiki@example.com');
      codeHash = params[1];
      return { rows: [] };
    }
    if (/SELECT \* FROM email_codes/.test(sql)) {
      assert.equal(params[0], 'kiki@example.com');
      return { rows: [{ email: 'kiki@example.com', code_hash: codeHash }] };
    }
    if (/DELETE FROM email_codes/.test(sql)) return { rows: [] };
    if (/SELECT \* FROM users WHERE LOWER\(email\)/.test(sql)) {
      return userCreated
        ? {
            rows: [
              {
                id: '9',
                name: 'kiki',
                email: 'kiki@example.com',
                identity: '应届毕业生',
                auth_provider: 'local',
              },
            ],
          }
        : { rows: [] };
    }
    if (/INSERT INTO users/.test(sql)) {
      userCreated = true;
      return {
        rows: [
          {
            id: '9',
            name: 'kiki',
            email: 'kiki@example.com',
            identity: '应届毕业生',
            auth_provider: 'local',
          },
        ],
      };
    }
    if (/UPDATE users SET identity/.test(sql) || /INSERT INTO user_profiles/.test(sql) || /INSERT INTO job_preferences/.test(sql)) {
      return { rows: [] };
    }
    if (/SELECT profile_json/.test(sql)) return { rows: [{ profile_json: { email: 'kiki@example.com' } }] };
    if (/UPDATE users SET email_verified_at/.test(sql)) {
      return {
        rows: [
          {
            id: '9',
            name: 'kiki',
            email: 'kiki@example.com',
            identity: '应届毕业生',
            auth_provider: 'local',
            created_at: '2026-08-01T00:00:00.000Z',
          },
        ],
      };
    }
    if (/INSERT INTO auth_sessions/.test(sql)) return { rows: [{ user_id: '9' }] };
    if (/SELECT id, name, email, phone, identity, auth_provider, created_at FROM users/.test(sql)) {
      return {
        rows: [
          {
            id: '9',
            name: 'kiki',
            email: 'kiki@example.com',
            phone: '',
            identity: '应届毕业生',
            auth_provider: 'local',
            created_at: '2026-08-01T00:00:00.000Z',
          },
        ],
      };
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  });
  const repo = createPostgresRepository({ runtime });

  assert.deepEqual(await repo.requestEmailCode('KIKI@example.com'), {
    email: 'ki***@example.com',
    expiresInSeconds: 600,
    devCode: '123456',
  });
  const payload = await repo.createEmailSession('kiki@example.com', '123456');
  assert.equal(payload.token.length, 64);
  assert.equal(payload.user.email, 'ki***@example.com');
});

test('PostgreSQL repository reads users from bearer tokens without storing raw tokens', async () => {
  const runtime = createRuntime((sql, params) => {
    assert.match(sql, /FROM auth_sessions/);
    assert.equal(params[0].length, 64);
    assert.notEqual(params[0], 'raw-token');
    return {
      rows: [
        {
          id: '12',
          name: 'Kiki',
          email: 'kiki@example.com',
          phone: '',
          identity: '应届毕业生',
          auth_provider: 'local',
          created_at: '2026-08-01T00:00:00.000Z',
        },
      ],
    };
  });
  const repo = createPostgresRepository({ runtime });

  assert.deepEqual(await repo.getUserFromToken('raw-token'), {
    id: 12,
    name: 'Kiki',
    email: 'ki***@example.com',
    phone: '',
    identity: '应届毕业生',
    authProvider: 'local',
    createdAt: '2026-08-01T00:00:00.000Z',
  });
});

test('PostgreSQL repository revokes sessions by hashed bearer token', async () => {
  const runtime = createRuntime((sql, params) => {
    assert.match(sql, /UPDATE auth_sessions/);
    assert.equal(params[0].length, 64);
    assert.notEqual(params[0], 'raw-token');
    return { rows: [], rowCount: 1 };
  });
  const repo = createPostgresRepository({ runtime });

  assert.deepEqual(await repo.revokeSession('raw-token'), { revoked: true });
});

test('PostgreSQL repository keeps phone auth disabled until the phone provider is productionized', async () => {
  const repo = createPostgresRepository({ runtime: createRuntime(() => ({ rows: [] })) });

  await assert.rejects(
    () => repo.requestSmsCode('13800138000'),
    /PostgreSQL repository write method is not implemented yet: requestSmsCode/
  );
});
