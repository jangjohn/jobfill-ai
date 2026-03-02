/**
 * JobFill AI - Sidebar Logic
 */

(function () {
  'use strict';

  const CATEGORY_ORDER = ['PERSONAL', 'EXPERIENCE', 'APPLICATION', 'AVAILABILITY', 'CUSTOM'];

  function showMessage(el, text, type = '', duration = 4000) {
    if (!el) return;
    el.textContent = text;
    el.className = type;
    el.style.opacity = '1';
    if (duration > 0) {
      clearTimeout(el._msgTimeout);
      el._msgTimeout = setTimeout(() => {
        el.style.transition = 'opacity 0.4s ease';
        el.style.opacity = '0';
        setTimeout(() => { el.textContent = ''; el.className = ''; }, 400);
      }, duration);
    }
  }

  let profile = null;
  let fields = [];
  let answers = {};
  let currentLang = 'en';
  let currentTheme = 'dark';

  const translations = {
    en: {
      tab_setup: 'Setup',
      tab_fields: 'Fields',
      tab_history: 'History',
      tab_settings: 'Settings',
      resume: 'Resume',
      job_description: 'Job Description',
      resume_placeholder: 'Paste your resume text or upload PDF...',
      jd_placeholder: 'Paste the job description...',
      upload_pdf: 'Upload PDF',
      clear: 'Clear',
      parse_resume: 'Parse Resume',
      analyze_job: 'Analyze Job',
      analyze_match: 'Analyze Match',
      matched_skills: 'Matched Skills',
      missing_skills: 'Missing Skills',
      suggestions: 'Suggestions',
      generate_answers: 'Generate Answers',
      generate_all: 'Generate All Answers',
      scan_page: 'Scan Page',
      fill_all: 'Fill All',
      fill_this: 'Fill This',
      filled_state: '✓ Filled',
      fill_manually: '⚠ Fill manually',
      export_txt: 'Export',
      export_json: 'Export JSON',
      re_generate: 'Re-generate',
      clear_history: 'Clear History',
      test_connection: 'Test Connection',
      ai_provider: 'AI Provider',
      model: 'Model',
      deepseek_api_key: 'DeepSeek API Key',
      openai_api_key: 'OpenAI API Key',
      anthropic_api_key: 'Anthropic API Key',
      language: 'Language',
      theme: 'Theme',
      no_fields: 'No fields scanned yet.',
      no_fields_detected: 'No fields detected',
      no_fields_hint: 'Navigate to a job application page and click Scan Page',
      no_history_hint: 'Your filled applications will appear here',
      fields_found: 'fields found',
      connection_successful: 'Connection successful.',
      resume_parsed_successfully: 'Resume parsed successfully.',
      add_resume_first: 'Please paste or upload your resume first.',
      add_jd_first: 'Please paste the job description first.',
      job_saved: 'Job description saved.',
      scan_first: 'Scan the page first to detect form fields.',
      add_jd_first_short: 'Add job description first.',
      parse_first: 'Parse your resume first.',
      no_history: 'No history yet.',
      history_fields: 'fields',
      no_fields_click: 'No fields. Click Scan Page first.',
      filled_count: 'Filled',
      fields_count: 'fields.',
      generated_x_answers: 'Generated',
      answers_count: 'answers.',
      name_label: 'Name',
      email_label: 'Email',
      phone_label: 'Phone',
      skills_label: 'Skills',
      required: 'Required',
      saved_answers: 'Saved Answers',
      no_saved_answers: 'No saved answers.',
      delete_saved: 'Delete',
      show_low_only: 'Show low confidence only',
      show_all: 'Show all',
      no_low_confidence: 'No low confidence fields.',
      no_fields_empty: 'No fields.',
      cat_PERSONAL: 'PERSONAL',
      cat_EXPERIENCE: 'EXPERIENCE',
      cat_APPLICATION: 'APPLICATION',
      cat_AVAILABILITY: 'AVAILABILITY',
      cat_CUSTOM: 'CUSTOM',
      type_text: 'text',
      type_email: 'email',
      type_textarea: 'textarea',
      type_select: 'select',
      type_number: 'number',
      type_tel: 'tel',
      type_date: 'date',
      type_checkbox: 'checkbox',
      type_radio: 'radio',
      type_manual: 'manual',
      type_file: 'file',
      cover_letter: 'Cover Letter',
      generate_cover_letter: 'Generate Cover Letter',
      regenerate: 'Regenerate',
      copy_clipboard: 'Copy to Clipboard',
      words: 'words',
      cover_letter_placeholder: 'Generated cover letter will appear here...',
      auto_saved: 'Auto-saved'
    },
    zh: {
      tab_setup: '设置',
      tab_fields: '字段',
      tab_history: '历史',
      tab_settings: '设置',
      resume: '简历',
      job_description: '职位描述',
      resume_placeholder: '粘贴简历文字或上传 PDF...',
      jd_placeholder: '粘贴职位描述...',
      upload_pdf: '上传PDF',
      clear: '清除',
      parse_resume: '解析简历',
      analyze_job: '分析职位',
      analyze_match: '分析匹配度',
      matched_skills: '匹配技能',
      missing_skills: '欠缺技能',
      suggestions: '改进建议',
      generate_answers: '生成答案',
      generate_all: '生成所有答案',
      scan_page: '扫描页面',
      fill_all: '全部填写',
      fill_this: '填写此项',
      filled_state: '✓ 已填写',
      fill_manually: '⚠ 需手动填写',
      export_txt: '导出',
      export_json: '导出JSON',
      re_generate: '重新生成',
      clear_history: '清除历史',
      test_connection: '测试连接',
      ai_provider: 'AI 提供商',
      model: '模型',
      deepseek_api_key: 'DeepSeek API 密钥',
      openai_api_key: 'OpenAI API 密钥',
      anthropic_api_key: 'Anthropic API 密钥',
      language: '语言',
      theme: '主题',
      no_fields: '尚未扫描字段。',
      no_fields_detected: '未检测到字段',
      no_fields_hint: '请前往求职申请页面并点击扫描页面',
      no_history_hint: '您填写过的申请将显示在这里',
      fields_found: '个字段已找到',
      connection_successful: '连接成功',
      resume_parsed_successfully: '简历解析成功',
      add_resume_first: '请先粘贴或上传简历。',
      add_jd_first: '请先粘贴职位描述。',
      job_saved: '职位描述已保存。',
      scan_first: '请先扫描页面以检测表单字段。',
      add_jd_first_short: '请先添加职位描述。',
      parse_first: '请先解析简历。',
      no_history: '暂无历史记录。',
      history_fields: '个字段',
      no_fields_click: '无字段。请先点击扫描页面。',
      filled_count: '已填写',
      fields_count: '个字段。',
      generated_x_answers: '已生成',
      answers_count: '个答案。',
      name_label: '姓名',
      email_label: '邮箱',
      phone_label: '电话',
      skills_label: '技能',
      required: '必填',
      saved_answers: '已保存答案',
      no_saved_answers: '暂无已保存的答案。',
      delete_saved: '删除',
      show_low_only: '仅显示低可信度',
      show_all: '显示全部',
      no_low_confidence: '暂无低可信度字段。',
      no_fields_empty: '无字段。',
      cat_PERSONAL: '个人信息',
      cat_EXPERIENCE: '工作经验',
      cat_APPLICATION: '申请信息',
      cat_AVAILABILITY: '入职信息',
      cat_CUSTOM: '其他',
      type_text: '文本',
      type_email: '邮箱',
      type_textarea: '长文本',
      type_select: '下拉',
      type_number: '数字',
      type_tel: '电话',
      type_date: '日期',
      type_checkbox: '复选框',
      type_radio: '单选',
      type_manual: '手动',
      type_file: '文件',
      cover_letter: '求职信',
      generate_cover_letter: '生成求职信',
      regenerate: '重新生成',
      copy_clipboard: '复制到剪贴板',
      words: '字',
      cover_letter_placeholder: '生成的求职信将显示在这里...',
      auto_saved: '已自动保存'
    }
  };

  function isCoverLetterField(label) {
    const l = (label || '').toLowerCase();
    return l.includes('cover letter') || l.includes('motivation') || l.includes('why') ||
      l.includes('additional information') || l.includes('additional info') || l.includes('message');
  }

  let lowConfidenceFilterActive = false;

  function getMemoryKey(label) {
    return (label || '').toLowerCase().trim();
  }

  function getMemorizedAnswer(label, memory) {
    if (!memory || typeof memory !== 'object') return null;
    const key = getMemoryKey(label);
    if (!key) return null;
    if (memory[key] != null) return memory[key];
    for (const [k, v] of Object.entries(memory)) {
      if (k.toLowerCase() === key) return v;
    }
    return null;
  }

  function t(key) {
    const lang = currentLang === 'zh' ? 'zh' : 'en';
    return translations[lang][key] ?? translations.en[key] ?? key;
  }

  function applyLanguage() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      if (key && el.tagName !== 'OPTION') el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
      const key = el.dataset.i18nPh;
      if (key) el.placeholder = t(key);
    });
  }

  function applyTheme(theme) {
    currentTheme = theme || 'dark';
    document.body.classList.toggle('theme-light', currentTheme === 'light');
    document.querySelectorAll('.theme-btn').forEach((btn) => {
      btn.classList.toggle('secondary', btn.dataset.theme !== currentTheme);
      btn.style.fontWeight = btn.dataset.theme === currentTheme ? '600' : '';
    });
    chrome.storage.local.set({ theme: currentTheme });
  }

  // --- Tab switching ---
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      const id = tab.dataset.tab;
      document.getElementById(id).classList.add('active');
    });
  });

  let autoSavedTimer = null;
  function showAutoSavedIndicator() {
    const el = document.getElementById('autoSavedIndicator');
    if (!el) return;
    el.textContent = t('auto_saved');
    el.classList.add('visible');
    el.setAttribute('aria-hidden', 'false');
    clearTimeout(autoSavedTimer);
    autoSavedTimer = setTimeout(() => {
      el.classList.remove('visible');
      el.setAttribute('aria-hidden', 'true');
    }, 1500);
  }

  const resumeTa = document.getElementById('resumeText');
  const jobDescTa = document.getElementById('jobDesc');
  resumeTa.addEventListener('input', () => {
    chrome.storage.local.set({ savedResume: resumeTa.value });
    showAutoSavedIndicator();
  });
  jobDescTa.addEventListener('input', () => {
    chrome.storage.local.set({ savedJobDescription: jobDescTa.value });
    showAutoSavedIndicator();
  });

  // --- PDF upload ---
  const pdfInput = document.getElementById('pdfInput');
  document.getElementById('uploadPdf').addEventListener('click', () => pdfInput.click());
  document.getElementById('clearResume').addEventListener('click', () => {
    resumeTa.value = '';
    chrome.storage.local.set({ savedResume: '' });
    showAutoSavedIndicator();
  });
  pdfInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      // PDF as text - basic extraction (actual PDF parsing requires lib; we'll do text layer)
      const arr = new Uint8Array(r.result);
      const str = new TextDecoder('utf-8').decode(arr);
      const textMatch = str.match(/stream[\s\S]*?endstream/g);
      let text = '';
      if (textMatch) {
        text = textMatch
          .map((s) => s.replace(/stream|endstream|[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').trim())
          .filter(Boolean)
          .join('\n');
      }
      if (!text) text = '[PDF - paste text manually or use a PDF-to-text tool]';
      resumeTa.value = text;
      chrome.storage.local.set({ savedResume: text });
      showAutoSavedIndicator();
    };
    r.readAsArrayBuffer(file);
    e.target.value = '';
  });

  // --- Parse Resume (Phase 1) ---
  document.getElementById('parseResume').addEventListener('click', async () => {
    const text = document.getElementById('resumeText').value.trim();
    const btn = document.getElementById('parseResume');
    const msgEl = document.getElementById('setupMessage');
    const previewEl = document.getElementById('profilePreview');
    if (!text) {
      showMessage(msgEl, t('add_resume_first'), 'error');
      return;
    }
    const origText = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span>' + (currentLang === 'zh' ? '解析中...' : 'Parsing...');
    showMessage(msgEl, currentLang === 'zh' ? '解析中...' : 'Parsing...', '');
    try {
      const content = await callDeepSeek([
        { role: 'system', content: 'You are a resume parser. Return ONLY a valid JSON object with exactly these keys: name, email, phone, location, summary, skills (array of strings), experience (array of objects with title, company, duration, bullets). No markdown, no code blocks.' },
        { role: 'user', content: `Parse this resume:\n\n${text}` }
      ]);
      const raw = parseJsonFromResponse(content);
      profile = normalizeAndEnrichProfile(raw, text);
      await chrome.storage.local.set({ profile });
      previewEl.style.display = 'block';
      previewEl.innerHTML = renderProfilePreview(profile);
      btn.innerHTML = currentLang === 'zh' ? '✓ 已解析' : '✓ Parsed';
      showMessage(msgEl, currentLang === 'zh' ? '✓ 已解析' : '✓ Parsed', 'success', 2000);
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = origText;
      }, 2000);
    } catch (e) {
      btn.disabled = false;
      btn.textContent = origText;
      showMessage(msgEl, (e?.message || '').toLowerCase().includes('api') ? '✗ Failed - check API key' : (currentLang === 'zh' ? '✗ 解析失败' : '✗ Parse failed.'), 'error');
    }
  });

  // --- Analyze Job ---
  document.getElementById('analyzeJob').addEventListener('click', async () => {
    const jd = document.getElementById('jobDesc').value.trim();
    const msgEl = document.getElementById('setupMessage');
    if (!jd) {
      showMessage(msgEl, t('add_jd_first'), 'error');
      return;
    }
    await chrome.storage.local.set({ jobDescription: jd });
    showMessage(msgEl, t('job_saved'), 'success');
  });

  // --- Analyze Match ---
  function renderMatchAnalysis(data) {
    const panel = document.getElementById('matchAnalysisPanel');
    if (!data || typeof data.matchScore !== 'number') {
      panel.style.display = 'none';
      return;
    }
    panel.style.display = 'block';
    const score = Math.min(100, Math.max(0, data.matchScore));
    document.getElementById('matchScoreRing').style.setProperty('--score', score);
    document.getElementById('matchScoreValue').textContent = score + '%';
    const matched = Array.isArray(data.matchedSkills) ? data.matchedSkills : [];
    const missing = Array.isArray(data.missingSkills) ? data.missingSkills : [];
    const sugg = Array.isArray(data.suggestions) ? data.suggestions : [];
    document.getElementById('matchedSkillsList').innerHTML = matched.map((s) => `<span class="skill-tag matched">${escapeHtml(String(s))}</span>`).join('') || `<span style="color:#666;font-size:11px">—</span>`;
    document.getElementById('missingSkillsList').innerHTML = missing.map((s) => `<span class="skill-tag missing">${escapeHtml(String(s))}</span>`).join('') || `<span style="color:#666;font-size:11px">—</span>`;
    document.getElementById('matchSuggestionsList').innerHTML = sugg.slice(0, 3).map((s) => `<li>${escapeHtml(String(s))}</li>`).join('');
  }

  document.getElementById('analyzeMatch').addEventListener('click', async () => {
    const resumeText = document.getElementById('resumeText').value.trim();
    const jd = document.getElementById('jobDesc').value.trim();
    const msgEl = document.getElementById('setupMessage');
    if (!resumeText || !jd) {
      showMessage(msgEl, t('add_resume_first') + ' ' + t('add_jd_first_short'), 'error');
      return;
    }
    showMessage(msgEl, currentLang === 'zh' ? '分析匹配度中...' : 'Analyzing match...', '');
    try {
      const content = await callDeepSeek([
        {
          role: 'system',
          content: 'You are a career advisor. Analyze resume vs job description. Return ONLY valid JSON with: matchScore (0-100 number), matchedSkills (array of skill strings the candidate has), missingSkills (array of key skills from JD the candidate lacks), suggestions (array of 2-3 short actionable strings to improve the application).'
        },
        {
          role: 'user',
          content: `Resume:\n\n${resumeText}\n\n---\n\nJob Description:\n\n${jd}\n\nReturn JSON only:`
        }
      ], { max_tokens: 512 });
      const data = parseJsonFromResponse(content);
      const result = {
        matchScore: typeof data.matchScore === 'number' ? data.matchScore : 0,
        matchedSkills: Array.isArray(data.matchedSkills) ? data.matchedSkills : [],
        missingSkills: Array.isArray(data.missingSkills) ? data.missingSkills : [],
        suggestions: Array.isArray(data.suggestions) ? data.suggestions : []
      };
      renderMatchAnalysis(result);
      await chrome.storage.local.set({ matchAnalysis: result });
      showMessage(msgEl, currentLang === 'zh' ? '匹配分析完成' : 'Match analysis complete.', 'success');
    } catch (e) {
      showMessage(msgEl, e?.message || (currentLang === 'zh' ? '分析失败' : 'Analysis failed.'), 'error');
    }
  });

  // --- Generate All Answers (Phase 2) ---
  document.getElementById('generateAll').addEventListener('click', async () => {
    const msgEl = document.getElementById('setupMessage');
    const btn = document.getElementById('generateAll');
    if (fields.length === 0) {
      showMessage(msgEl, t('scan_first'), 'error');
      return;
    }
    const jd = document.getElementById('jobDesc').value.trim();
    if (!jd) {
      showMessage(msgEl, t('add_jd_first_short'), 'error');
      return;
    }
    const { profile: p } = await chrome.storage.local.get('profile');
    profile = p || profile;
    if (!profile) {
      showMessage(msgEl, t('parse_first'), 'error');
      return;
    }
    const total = fields.filter((f) => f.type !== 'manual' && f.type !== 'file' && !f.manual).length;
    const origText = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span>' + (currentLang === 'zh' ? '生成中... (0/' + total + ')' : 'Generating... (0/' + total + ')');
    const updateProgress = (current, progTotal) => {
      const c = Math.min(current, progTotal ?? total);
      const t = progTotal ?? total;
      btn.innerHTML = '<span class="btn-spinner"></span>' + (currentLang === 'zh' ? '生成中... (' + c + '/' + t + ')' : 'Generating... (' + c + '/' + t + ')');
      showMessage(msgEl, currentLang === 'zh' ? '生成中... (' + c + '/' + t + ')' : 'Generating... (' + c + '/' + t + ')', '');
    };
    try {
      const { answerMemory = {}, coverLetter: storedCoverLetter } = await chrome.storage.local.get(['answerMemory', 'coverLetter']);
      const { fillMap, confidence } = await generateAllAnswers(profile, jd, fields, answerMemory, storedCoverLetter || document.getElementById('coverLetterText').value.trim(), updateProgress);
      answers = fillMap;
      await chrome.storage.local.set({ fillMap, answerConfidence: confidence });
      const count = Object.keys(fillMap).length;
      btn.innerHTML = currentLang === 'zh' ? '✓ 已生成 ' + count + ' 个答案' : '✓ Generated ' + count + ' answers';
      showMessage(msgEl, currentLang === 'zh' ? '✓ 已生成 ' + count + ' 个答案' : '✓ Generated ' + count + ' answers', 'success', 2000);
      renderFields();
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = origText;
      }, 2000);
    } catch (e) {
      btn.disabled = false;
      btn.textContent = origText;
      showMessage(msgEl, e?.message || (currentLang === 'zh' ? '生成失败' : 'Generation failed.'), 'error');
    }
  });

  const PERSONAL_DEFAULTS = [
    { keys: ['first name', 'firstname'], get: (p) => ((p?.name || '').split(/\s+/)[0] || p?.name) || null },
    { keys: ['last name', 'last name', 'lastname'], get: (p) => (p?.name || '').split(/\s+/).slice(1).join(' ').trim() || null },
    { keys: ['full name', 'full name', 'fullname'], get: (p) => p?.name ?? null },
    { keys: ['name'], get: (p) => p?.name ?? null },
    { keys: ['email', 'e-mail', 'email address'], get: (p) => p?.email ?? null },
    { keys: ['phone', 'phone number', 'telephone', 'tel', 'mobile'], get: (p) => p?.phone ?? null },
    { keys: ['location', 'city', 'address', 'country'], get: (p) => p?.location ?? null },
    { keys: ['linkedin', 'linkedin url'], get: (p) => p?.linkedin ?? null },
    { keys: ['website', 'url', 'portfolio'], get: (p) => p?.website ?? null },
    { keys: ['github'], get: (p) => p?.github ?? null }
  ];

  function getPersonalValueFromDefaults(prof, label) {
    const l = (label || '').toLowerCase().trim();
    if (!l) return null;
    for (const { keys, get } of PERSONAL_DEFAULTS) {
      if (keys.some((k) => l.includes(k))) {
        const val = get(prof);
        if (val != null && String(val).trim()) return val;
      }
    }
    return null;
  }

  function isPersonalLabel(label, name) {
    const l = (label || name || '').toLowerCase();
    return l.includes('name') || l.includes('email') || l.includes('phone') || l.includes('tel') || l.includes('linkedin') || l.includes('website') || l.includes('portfolio') || l.includes('url');
  }

  function sanitizeCheckboxValue(val) {
    if (val == null) return 'false';
    const v = String(val).trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(v)) return 'true';
    return 'false';
  }

  async function generateAllAnswers(prof, jd, fieldList, answerMemory = {}, coverLetter = '', onProgress = () => {}) {
    console.log('[JobFill] Starting generation, profile:', JSON.stringify(prof));
    console.log('[JobFill] Fields to fill:', fieldList.filter((f) => f.type !== 'manual').map((f) => f.label));

    const fillMap = {};
    const confidence = {};
    const totalCount = fieldList.filter((f) => f.type !== 'manual').length;
    const tick = (() => {
      let done = 0;
      return () => { done = Math.min(done + 1, totalCount); onProgress(done, totalCount); };
    })();

    const personalMapOrdered = [
      ['first name', 'firstname', prof?.name ? prof.name.split(/\s+/)[0] : null],
      ['last name', 'lastname', prof?.name ? prof.name.split(/\s+/).slice(1).join(' ').trim() : null],
      ['full name', 'fullname', prof?.name],
      ['name', prof?.name],
      ['email', 'e-mail', 'email address', prof?.email],
      ['phone', 'phone number', 'telephone', 'tel', 'mobile', prof?.phone],
      ['location', 'city', 'address', 'country', prof?.location],
      ['linkedin', 'linkedin url', prof?.linkedin],
      ['github', prof?.github],
      ['website', 'url', prof?.website],
      ['portfolio', prof?.website]
    ];

    const fieldsToFill = fieldList
      .filter((f) => f.type !== 'manual')
      .map((f) => ({ id: f.id, label: f.label || '', type: f.type, raw: f }));

    const filledIds = new Set();

    function setFill(id, val, conf = 'HIGH') {
      if (val != null && String(val).trim() !== '') {
        fillMap[id] = String(val).trim();
        confidence[id] = conf;
        filledIds.add(id);
      }
    }

    for (const field of fieldsToFill) {
      const mem = getMemorizedAnswer(field.label, answerMemory);
      if (mem != null) {
        setFill(field.id, field.type === 'checkbox' ? sanitizeCheckboxValue(mem) : mem, 'HIGH');
        tick();
        continue;
      }

      const lbl = field.label.toLowerCase();

      const personalEntry = personalMapOrdered.find((arr) => {
        const keys = arr.slice(0, -1);
        const val = arr[arr.length - 1];
        return keys.some((k) => lbl.includes(k)) && val != null && String(val).trim();
      });
      if (personalEntry) {
        setFill(field.id, personalEntry[personalEntry.length - 1], 'HIGH');
        tick();
        continue;
      }

      if (lbl.includes('github')) {
        setFill(field.id, prof?.github, 'HIGH');
        filledIds.add(field.id);
        tick();
        continue;
      }
      if (lbl.includes('linkedin')) {
        setFill(field.id, prof?.linkedin, 'HIGH');
        filledIds.add(field.id);
        tick();
        continue;
      }
      if (lbl.includes('portfolio') || lbl.includes('website') || lbl.includes('url')) {
        setFill(field.id, prof?.website, 'HIGH');
        filledIds.add(field.id);
        tick();
        continue;
      }
      if (lbl.includes('blog') || lbl.includes('notion')) {
        filledIds.add(field.id);
        tick();
        continue;
      }

      if (isCoverLetterField(field.label) && coverLetter) {
        setFill(field.id, coverLetter, 'HIGH');
        tick();
        continue;
      }
    }

    fieldsToFill.forEach((f) => {
      console.log(`[JobFill] Field "${f.label}" -> aiValue: "${fillMap[f.id] || ''}" (filled: ${filledIds.has(f.id)})`);
    });

    const remainingForAi = fieldsToFill.filter((f) => !filledIds.has(f.id));
    const shortRemaining = remainingForAi.filter((f) => f.type !== 'textarea' && f.type !== 'checkbox');
    const checkboxRemaining = remainingForAi.filter((f) => f.type === 'checkbox');
    const longRemaining = remainingForAi.filter((f) => f.type === 'textarea');

    if (shortRemaining.length > 0) {
      const fieldsDesc = shortRemaining
        .map((f) => `"${f.label.replace(/"/g, '\\"')}": "your answer here"`)
        .join('\n');
      const prompt = `You are filling out a job application form. For each field below, provide an appropriate answer.
Return ONLY a valid JSON object where each key is the EXACT field label and value is the answer string.
Do not include any explanation or markdown. Copy the field labels character-for-character as keys.

IMPORTANT RULES:
- If you don't know the answer, return empty string: ""
- NEVER return: 'Not specified', 'N/A', 'Unknown', 'Not applicable', 'Not provided', or any similar phrase
- For 'Org' or referral organization fields with no information → return ""
- For Blog/Notion/personal URLs not in resume → return ""

BAD example: { "Org": "Not specified in job description" }
GOOD example: { "Org": "" }

Candidate profile: ${JSON.stringify(prof)}
Job description: ${jd}

Fields to fill (return answer for each using EXACT label as key):
${fieldsDesc}`;
      try {
        const content = await callDeepSeek([
          { role: 'system', content: prompt },
          { role: 'user', content: 'Return the JSON object now:' }
        ]);
        console.log('[JobFill] Raw AI response (short):', content);
        let aiAnswers = parseJsonFromResponse(content);
        const badPhrases = ['not specified', 'n/a', 'unknown', 'not applicable', 'not provided', 'no information'];
        if (aiAnswers && typeof aiAnswers === 'object')
          for (const key in aiAnswers)
            if (typeof aiAnswers[key] === 'string' && badPhrases.some((p) => aiAnswers[key].toLowerCase().includes(p)))
              aiAnswers[key] = '';
        console.log('[JobFill] Parsed AI answers (short):', JSON.stringify(aiAnswers));
        if (aiAnswers && typeof aiAnswers === 'object' && !Array.isArray(aiAnswers)) {
          for (const field of shortRemaining) {
            const getByLabel = (label) => {
              if (!label) return null;
              const v = aiAnswers[label];
              if (v != null && typeof v === 'string') return v;
              const key = Object.keys(aiAnswers).find((k) => k.trim().toLowerCase() === label.trim().toLowerCase());
              return key ? aiAnswers[key] : null;
            };
            const val = getByLabel(field.label);
            if (val != null && typeof val === 'string' && val.trim()) {
              setFill(field.id, val, 'LOW');
            }
            tick();
          }
        }
      } catch (e) {
        shortRemaining.forEach(() => tick());
      }
    }

    if (checkboxRemaining.length > 0) {
      const fieldsDesc = checkboxRemaining
        .map((f) => `"${f.label.replace(/"/g, '\\"')}": "true" or "false"`)
        .join('\n');
      const prompt = `You are filling out a job application form. For CHECKBOX fields only, respond with "true" or "false".
- Use "true" for consent/agreement/contact permission (e.g. "I agree to terms", "Yes, contact me").
- Use "false" when candidate would not check (e.g. no referral, no sponsorship needed).
Some labels may be in Korean/Japanese - understand the meaning. "주변인 추천" = referral from acquaintance → "false" if no referral.
Return ONLY a valid JSON object. Keys MUST be the EXACT field labels. Values MUST be "true" or "false" only.

IMPORTANT RULES:
- If you don't know the answer, return empty string: ""
- NEVER return: 'Not specified', 'N/A', 'Unknown', 'Not applicable', 'Not provided', or any similar phrase
- For 'Org' or referral organization fields with no information → return ""
- For Blog/Notion/personal URLs not in resume → return ""

BAD example: { "Org": "Not specified in job description" }
GOOD example: { "Org": "" }

Candidate profile: ${JSON.stringify(prof)}
Job description: ${jd}

Checkbox fields (EXACT label as key):
${fieldsDesc}`;
      try {
        const content = await callDeepSeek([
          { role: 'system', content: prompt },
          { role: 'user', content: 'Return the JSON object now:' }
        ]);
        console.log('[JobFill] Raw AI response (checkbox):', content);
        let aiAnswers = parseJsonFromResponse(content);
        const badPhrases = ['not specified', 'n/a', 'unknown', 'not applicable', 'not provided', 'no information'];
        if (aiAnswers && typeof aiAnswers === 'object')
          for (const key in aiAnswers)
            if (typeof aiAnswers[key] === 'string' && badPhrases.some((p) => aiAnswers[key].toLowerCase().includes(p)))
              aiAnswers[key] = '';
        console.log('[JobFill] Parsed AI answers (checkbox):', JSON.stringify(aiAnswers));
        if (aiAnswers && typeof aiAnswers === 'object' && !Array.isArray(aiAnswers)) {
          for (const field of checkboxRemaining) {
            const getByLabel = (label) => {
              if (!label) return null;
              const v = aiAnswers[label];
              if (v != null) return v;
              const key = Object.keys(aiAnswers).find((k) => k.trim().toLowerCase() === label.trim().toLowerCase());
              return key != null ? aiAnswers[key] : null;
            };
            const val = getByLabel(field.label);
            setFill(field.id, sanitizeCheckboxValue(val ?? 'false'), 'LOW');
            tick();
          }
        }
      } catch (e) {
        checkboxRemaining.forEach(() => tick());
      }
    }

    for (const field of longRemaining) {
      const mem = getMemorizedAnswer(field.label, answerMemory);
      if (mem != null) {
        setFill(field.id, mem, 'HIGH');
        tick();
        continue;
      }
      try {
        const content = await callDeepSeek([
          { role: 'system', content: 'Write a concise, professional answer (200-400 words). Return ONLY the text, no JSON.' },
          { role: 'user', content: `Profile: ${JSON.stringify(prof)}\n\nJob: ${jd}\n\nField: ${field.label}` }
        ], { max_tokens: 1024 });
        const text = (content || '').trim().replace(/^["']|["']$/g, '');
        setFill(field.id, text, 'LOW');
      } catch (_) {}
      tick();
    }

    fieldsToFill.forEach((f) => {
      console.log(`[JobFill] FINAL "${f.label}" -> "${fillMap[f.id] || ''}"`);
    });

    return { fillMap, confidence };
  }

  function getPersonalValue(prof, label, name) {
    const l = (label || name || '').toLowerCase();
    if (l.includes('name') && !l.includes('last') && !l.includes('first')) return prof?.name ?? null;
    if (l.includes('first') && l.includes('name')) return ((prof?.name || '').split(/\s+/)[0] || prof?.name) || null;
    if (l.includes('last') && l.includes('name')) return (prof?.name || '').split(/\s+/).slice(1).join(' ').trim() || null;
    if (l.includes('email')) return prof?.email ?? null;
    if (l.includes('phone') || l.includes('tel')) return prof?.phone ?? null;
    if (l.includes('linkedin')) return prof?.linkedin ?? null;
    if (l.includes('website') || l.includes('portfolio') || l.includes('url')) return prof?.website ?? null;
    if (l.includes('location') || l.includes('city') || l.includes('address')) return prof?.location ?? null;
    return null;
  }

  function parseJsonFromResponse(str) {
    const responseText = typeof str === 'string' ? str : String(str ?? '');
    const cleaned = responseText.replace(/```json\s*|\s*```/g, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (_) {}
      }
      console.error('[JobFill] JSON parse failed. Raw response:', responseText);
      throw new Error('Could not parse JSON from response');
    }
  }

  function normalizeAndEnrichProfile(raw, resumeText) {
    const profile = {
      name: raw.name ?? raw.fullName ?? raw.full_name ?? null,
      email: raw.email ?? raw.emailAddress ?? raw.e_mail ?? null,
      phone: raw.phone ?? raw.phoneNumber ?? raw.telephone ?? raw.tel ?? null,
      location: raw.location ?? raw.address ?? raw.city ?? null,
      linkedin: raw.linkedin ?? raw.linkedIn ?? null,
      website: raw.website ?? raw.portfolio ?? raw.url ?? raw.personalWebsite ?? null,
      github: raw.github ?? raw.githubUrl ?? raw.github_url ?? null,
      summary: raw.summary ?? raw.objective ?? null,
      skills: Array.isArray(raw.skills) ? raw.skills : (raw.skills ? [].concat(raw.skills) : []),
      experience: Array.isArray(raw.experience) ? raw.experience : (raw.experience ? [].concat(raw.experience) : []),
      education: Array.isArray(raw.education) ? raw.education : (raw.education ? [].concat(raw.education) : [])
    };
    if (!profile.name && resumeText) {
      const sectionHeaders = /^(resume|curriculum vitae|cv|profile|summary|experience|education|skills|objective|references)$/i;
      const firstLine = resumeText.split('\n').find((l) => l.trim().length > 0);
      if (firstLine) {
        const t = firstLine.trim();
        if (t.length <= 60 && !t.includes('@') && !/^\d[\d\s\-\(\)]+$/.test(t) && !sectionHeaders.test(t)) {
          profile.name = t;
        }
      }
    }
    if (!profile.email && resumeText) {
      const emailMatch = resumeText.match(/[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}/);
      if (emailMatch) profile.email = emailMatch[0];
    }
    if (!profile.phone && resumeText) {
      const phoneMatch = resumeText.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
      if (phoneMatch) profile.phone = phoneMatch[0].trim();
    }
    if (!profile.website && resumeText) {
      const urlMatch = resumeText.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/i);
      if (urlMatch) profile.website = urlMatch[0].trim();
    }
    if (!profile.github && resumeText) {
      const ghMatch = resumeText.match(/github\.com\/[a-zA-Z0-9_-]+/i);
      if (ghMatch) profile.github = 'https://' + ghMatch[0];
    }
    return profile;
  }

  function renderProfilePreview(prof) {
    const name = prof?.name || '-';
    const email = prof?.email || '-';
    const phone = prof?.phone || '-';
    const skillsArr = prof?.skills || [];
    const skillsDisplay = skillsArr.length > 0
      ? skillsArr.map((s) => escapeHtml(String(s))).join(', ')
      : '-';
    return `
      <p><strong>${t('name_label')}:</strong> ${escapeHtml(name)}</p>
      <p><strong>${t('email_label')}:</strong> ${escapeHtml(email)}</p>
      <p><strong>${t('phone_label')}:</strong> ${escapeHtml(phone)}</p>
      <p><strong>${t('skills_label')}:</strong> ${skillsDisplay}</p>
    `;
  }

  async function callDeepSeek(messages, options = {}) {
    const res = await chrome.runtime.sendMessage({
      type: 'CALL_DEEPSEEK',
      payload: { messages, options }
    });
    if (!res?.success) throw new Error(res?.error || 'API call failed');
    return res.content;
  }

  // --- Cover Letter ---
  const coverLetterTa = document.getElementById('coverLetterText');
  function autoResizeCoverLetter() {
    coverLetterTa.style.height = 'auto';
    coverLetterTa.style.height = Math.min(coverLetterTa.scrollHeight, 400) + 'px';
  }
  coverLetterTa.addEventListener('input', () => {
    updateCoverLetterWordCount();
    autoResizeCoverLetter();
    const text = coverLetterTa.value.trim();
    chrome.storage.local.set({ coverLetter: text || null });
  });

  function updateCoverLetterWordCount() {
    const text = document.getElementById('coverLetterText').value || '';
    const count = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
    document.getElementById('coverLetterWordCount').textContent = `${count} ${t('words')}`;
  }

  async function generateCoverLetter() {
    const resumeText = document.getElementById('resumeText').value.trim();
    const jd = document.getElementById('jobDesc').value.trim();
    const msgEl = document.getElementById('setupMessage');
    if (!resumeText || !jd) {
      showMessage(msgEl, t('add_resume_first') + ' ' + t('add_jd_first_short'), 'error');
      return;
    }
    showMessage(msgEl, currentLang === 'zh' ? '生成求职信中...' : 'Generating cover letter...', '');
    try {
      const content = await callDeepSeek([
        { role: 'system', content: 'You are a professional cover letter writer. Write a compelling, personalized cover letter (250-350 words) that connects the candidate\'s experience to the job requirements. Return ONLY the cover letter text, no greeting/signature instructions, no JSON.' },
        { role: 'user', content: `Resume:\n\n${resumeText}\n\n---\n\nJob Description:\n\n${jd}\n\nWrite a professional cover letter:` }
      ], { max_tokens: 1024 });
      const text = content.trim().replace(/^["']|["']$/g, '');
      document.getElementById('coverLetterText').value = text;
      updateCoverLetterWordCount();
      await chrome.storage.local.set({ coverLetter: text });
      showMessage(msgEl, currentLang === 'zh' ? '求职信生成成功' : 'Cover letter generated.', 'success');
    } catch (e) {
      showMessage(msgEl, e?.message || (currentLang === 'zh' ? '生成失败' : 'Generation failed.'), 'error');
    }
  }

  document.getElementById('generateCoverLetter').addEventListener('click', generateCoverLetter);
  document.getElementById('regenerateCoverLetter').addEventListener('click', generateCoverLetter);
  document.getElementById('copyCoverLetter').addEventListener('click', async () => {
    const text = document.getElementById('coverLetterText').value;
    try {
      await navigator.clipboard.writeText(text);
      showMessage(document.getElementById('setupMessage'), currentLang === 'zh' ? '已复制到剪贴板' : 'Copied to clipboard.', 'success', 2000);
    } catch (_) {}
  });

  async function doScanFields() {
    const countEl = document.getElementById('fieldCount');
    const emptyBtn = document.getElementById('scanFieldsEmpty');
    if (countEl) countEl.textContent = currentLang === 'zh' ? '扫描中...' : 'Scanning...';
    if (emptyBtn) { emptyBtn.disabled = true; emptyBtn.textContent = currentLang === 'zh' ? '扫描中...' : 'Scanning...'; }
    await chrome.storage.local.set({ filledFieldIds: [] });
    try {
      const res = await chrome.runtime.sendMessage({ type: 'SCAN_FIELDS' });
      if (res?.success && Array.isArray(res.fields)) {
        fields = res.fields;
        if (countEl) countEl.textContent = `${fields.length} ${t('fields_found')}.`;
        renderFields();
      } else {
        if (countEl) countEl.textContent = res?.error || (currentLang === 'zh' ? '未找到字段' : 'No fields found.');
      }
    } catch (e) {
      if (countEl) countEl.textContent = currentLang === 'zh' ? '扫描失败，请刷新页面重试。' : 'Scan failed. Reload the page and try again.';
    }
    if (emptyBtn) { emptyBtn.disabled = false; emptyBtn.textContent = t('scan_page'); }
  }

  document.getElementById('scanFields').addEventListener('click', doScanFields);
  document.getElementById('scanFieldsEmpty').addEventListener('click', doScanFields);

  document.getElementById('filterLowConfidence').addEventListener('click', () => {
    lowConfidenceFilterActive = !lowConfidenceFilterActive;
    const btn = document.getElementById('filterLowConfidence');
    btn.textContent = lowConfidenceFilterActive ? t('show_all') : t('show_low_only');
    btn.classList.toggle('secondary', !lowConfidenceFilterActive);
    renderFields();
  });

  async function renderFields() {
    const emptyState = document.getElementById('fieldsEmptyState');
    const hasData = document.getElementById('fieldsHasData');
    const list = document.getElementById('fieldList');
    if (fields.length === 0) {
      if (emptyState) emptyState.style.display = '';
      if (hasData) hasData.style.display = 'none';
      return;
    }
    if (emptyState) emptyState.style.display = 'none';
    if (hasData) hasData.style.display = '';
    const { answerMemory = {}, answerConfidence = {}, filledFieldIds = [] } = await chrome.storage.local.get(['answerMemory', 'answerConfidence', 'filledFieldIds']);
    const filledSet = new Set(filledFieldIds);
    const grouped = {};
    for (const cat of CATEGORY_ORDER) grouped[cat] = [];
    for (const f of fields) {
      const c = f.category || 'CUSTOM';
      if (!grouped[c]) grouped[c] = [];
      grouped[c].push(f);
    }
    let html = '';
    for (const cat of CATEGORY_ORDER) {
      const arr = (grouped[cat] || []).filter((f) => {
        let conf = answerConfidence[f.id] || null;
        if (!conf && getMemorizedAnswer(f.label, answerMemory) != null) conf = 'HIGH';
        return !lowConfidenceFilterActive || conf === 'LOW';
      });
      if (arr.length === 0) continue;
      html += `<h4 style="margin:12px 0 8px;color:#999">${t('cat_' + cat)}</h4>`;
      for (const f of arr) {
        let conf = answerConfidence[f.id] || null;
        if (!conf && getMemorizedAnswer(f.label, answerMemory) != null) conf = 'HIGH';
        const memVal = getMemorizedAnswer(f.label, answerMemory);
        const aiVal = answers[f.id] ?? memVal ?? f.aiValue ?? '';
        if (answers[f.id] == null && memVal != null) answers[f.id] = memVal;
        const hasMemory = memVal != null;
        const savedBadge = hasMemory ? ' <span class="saved-badge" title="Memorized">💾</span>' : '';
        const confDot = conf ? `<span class="confidence-dot ${conf}" title="${conf} confidence"></span>` : '';
        const hasValue = (answers[f.id] ?? memVal ?? f.aiValue ?? '').trim() !== '';
        const isFilled = filledSet.has(f.id) && hasValue;
        const isManual = f.type === 'manual' || f.type === 'file' || f.manual;
        const fillBtnText = isFilled ? t('filled_state') : t('fill_this');
        const fillBtnClass = isFilled ? 'secondary fill-one filled-state' : 'secondary fill-one';
        const manualBadge = isManual ? ` <span class="manual-badge">${t('fill_manually')}</span>` : '';
        const rawCheck = (v) => String(v || '').trim().toLowerCase();
        const isCheckboxChecked = (v) => ['true', '1', 'yes', 'on'].includes(rawCheck(v));
        const checkboxDisplayVal = f.type === 'checkbox'
          ? (isCheckboxChecked(aiVal) ? '<span class="checkbox-display checked">☑ Will check</span>' : '<span class="checkbox-display unchecked">☐ Will not check</span>')
          : null;
        const valueControl = isManual
          ? `<p class="manual-hint">${escapeHtml(aiVal || '') || '—'}</p>`
          : (checkboxDisplayVal
            ? `<div class="field-value-checkbox" data-field="${f.id}">${checkboxDisplayVal}</div>`
            : `<textarea class="field-value-ta" data-field="${f.id}" placeholder="AI value">${escapeHtml(aiVal)}</textarea>`);
        const actionButtons = isManual
          ? ''
          : `<div>
              <button type="button" class="${fillBtnClass}" data-id="${f.id}">${fillBtnText}</button>
              <button type="button" class="secondary regenerate-one" data-id="${f.id}">${t('re_generate')}</button>
            </div>`;
        html += `
          <div class="field-item${isFilled ? ' filled' : ''}${isManual ? ' manual' : ''}" data-id="${f.id}" data-confidence="${conf || ''}">
            <div class="label">${escapeHtml(f.label)}${manualBadge}${savedBadge}${isFilled ? ' <span class="filled-badge">✓</span>' : ''}${confDot}</div>
            <div class="meta"><span class="type-badge">${t('type_' + f.type) || f.type}</span> ${f.required ? '· ' + t('required') : ''}</div>
            ${valueControl}
            ${actionButtons}
          </div>
        `;
      }
    }
    list.innerHTML = html || (lowConfidenceFilterActive ? `<p style="color:#666">${t('no_low_confidence')}</p>` : `<p style="color:#666">${t('no_fields_empty')}</p>`);

    list.querySelectorAll('textarea[data-field]').forEach((ta) => {
      function autoResize() {
        ta.style.height = 'auto';
        ta.style.height = Math.max(36, ta.scrollHeight) + 'px';
      }
      ta.addEventListener('input', () => {
        answers[ta.dataset.field] = ta.value;
        const fillMap = { ...answers };
        chrome.storage.local.set({ fillMap });
        autoResize();
      });
      autoResize();
    });

    list.querySelectorAll('.fill-one').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const f = fields.find((x) => x.id === id);
        const val = answers[id];
        if (val != null && val !== '') {
          if (f?.label) {
            const { answerMemory = {} } = await chrome.storage.local.get('answerMemory');
            answerMemory[getMemoryKey(f.label)] = val;
            await chrome.storage.local.set({ answerMemory });
          }
          try {
            const res = await chrome.runtime.sendMessage({
              type: 'FILL_FIELDS',
              payload: { fillMap: { [id]: val } }
            });
            if (res?.success && res?.filledIds?.length) {
              const { filledFieldIds = [] } = await chrome.storage.local.get('filledFieldIds');
              await chrome.storage.local.set({ filledFieldIds: [...new Set([...filledFieldIds, ...res.filledIds])] });
            }
          } catch (_) {}
          renderFields();
        }
      });
    });

    list.querySelectorAll('.regenerate-one').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const f = fields.find((x) => x.id === btn.dataset.id);
        if (!f) return;
        const { profile: p, answerMemory = {} } = await chrome.storage.local.get(['profile', 'answerMemory']);
        const jd = document.getElementById('jobDesc').value.trim();
        const memVal = getMemorizedAnswer(f.label, answerMemory);
        if (memVal != null) {
          const val = f.type === 'checkbox' ? sanitizeCheckboxValue(memVal) : memVal;
          answers[f.id] = val;
          const ta = list.querySelector(`textarea[data-field="${f.id}"]`);
          if (ta) ta.value = val;
          const { fillMap = {}, answerConfidence: confMap = {} } = await chrome.storage.local.get(['fillMap', 'answerConfidence']);
          fillMap[f.id] = val;
          confMap[f.id] = 'HIGH';
          await chrome.storage.local.set({ fillMap, answerConfidence: confMap });
          renderFields();
          return;
        }
        if (f.type !== 'checkbox' && isPersonalLabel(f.label, f.name) && p) {
          const val = getPersonalValueFromDefaults(p, f.label);
          if (val != null) {
            answers[f.id] = val;
            const ta = list.querySelector(`textarea[data-field="${f.id}"]`);
            if (ta) ta.value = val;
            const { fillMap = {}, answerConfidence: confMap = {} } = await chrome.storage.local.get(['fillMap', 'answerConfidence']);
            fillMap[f.id] = val;
            confMap[f.id] = 'HIGH';
            await chrome.storage.local.set({ fillMap, answerConfidence: confMap });
            renderFields();
            return;
          }
        }
        if (!p || !jd) return;
        try {
          let val;
          if (f.type === 'checkbox') {
            const content = await callDeepSeek([
              { role: 'system', content: 'You are a job application assistant. For this CHECKBOX field, respond with ONLY "true" or "false". Use "true" if the candidate would check (agrees, consents). Use "false" if they would not (e.g. no referral). Label may be in another language - understand the meaning.' },
              { role: 'user', content: `Profile: ${JSON.stringify(p)}\n\nJob: ${jd}\n\nCheckbox label: ${f.label}\n\nRespond with ONLY "true" or "false":` }
            ], { max_tokens: 10 });
            val = sanitizeCheckboxValue(content?.trim());
          } else {
            const content = await callDeepSeek([
              { role: 'system', content: 'You are a job application assistant. Return ONLY the answer string, no JSON. Some labels may be in other languages - understand and answer appropriately. If you cannot determine an appropriate answer, return an empty string. Never return phrases like "Not specified", "Not applicable", "N/A", or "Unknown".' },
              { role: 'user', content: `Profile: ${JSON.stringify(p)}\n\nJob: ${jd}\n\nGenerate answer for: ${f.label}` }
            ]);
            val = content?.trim().replace(/^["']|["']$/g, '') || '';
            const badPhrases = ['not specified', 'n/a', 'unknown', 'not applicable', 'not provided', 'no information'];
            if (val && badPhrases.some((p) => val.toLowerCase().includes(p))) val = '';
          }
          if (val) {
            answers[f.id] = val;
            const ta = list.querySelector(`textarea[data-field="${f.id}"]`);
            if (ta) ta.value = val;
            const { fillMap = {}, answerConfidence: confMap = {} } = await chrome.storage.local.get(['fillMap', 'answerConfidence']);
            fillMap[f.id] = val;
            confMap[f.id] = (f.category === 'EXPERIENCE' && (p.experience?.length || p.skills?.length)) ? 'MEDIUM' : 'LOW';
            await chrome.storage.local.set({ fillMap, answerConfidence: confMap });
            renderFields();
          }
        } catch (_) {}
      });
    });
  }

  function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function triggerDownload(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  document.getElementById('exportTxt').addEventListener('click', async () => {
    if (fields.length === 0) return;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const website = tab?.url || '';
    const date = new Date().toISOString().slice(0, 10);
    const lines = [
      '===JobFill AI Export===',
      `Date: ${date}`,
      `Website: ${website}`,
      ''
    ];
    for (const f of fields) {
      const val = answers[f.id] ?? answers[f.label] ?? '';
      lines.push(f.label || '(unnamed)');
      lines.push(String(val));
      lines.push('---');
    }
    const content = lines.join('\n');
    triggerDownload(`jobfill-export-${date}.txt`, content, 'text/plain;charset=utf-8');
  });

  document.getElementById('exportJson').addEventListener('click', () => {
    if (fields.length === 0) return;
    const content = JSON.stringify(fields, null, 2);
    const date = new Date().toISOString().slice(0, 10);
    triggerDownload(`jobfill-fields-${date}.json`, content, 'application/json;charset=utf-8');
  });

  // --- Fill All ---
  document.getElementById('fillAll').addEventListener('click', async () => {
    const btn = document.getElementById('fillAll');
    const fillMap = { ...answers };
    const { coverLetter: storedCoverLetter } = await chrome.storage.local.get('coverLetter');
    const coverLetterVal = storedCoverLetter || document.getElementById('coverLetterText').value.trim();
    const fillableCount = fields.filter((f) => {
      const v = answers[f.id] ?? answers[f.label] ?? (coverLetterVal && f.type === 'textarea' && isCoverLetterField(f.label) ? coverLetterVal : null);
      return v != null;
    }).length;
    for (const f of fields) {
      if (answers[f.id] != null) fillMap[f.id] = answers[f.id];
      else if (answers[f.label] != null) fillMap[f.id] = answers[f.label];
      else if (coverLetterVal && f.type === 'textarea' && isCoverLetterField(f.label))
        fillMap[f.id] = coverLetterVal;
    }
    await chrome.storage.local.set({ fillMap });
    const origText = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span>' + (currentLang === 'zh' ? '填写中... (0/' + fillableCount + ')' : 'Filling... (0/' + fillableCount + ')');
    const unsub = () => chrome.storage.onChanged.removeListener(progressListener);
    const progressListener = (changes, area) => {
      if (area === 'local' && changes.fillProgress?.newValue) {
        const { current, total } = changes.fillProgress.newValue;
        btn.innerHTML = '<span class="btn-spinner"></span>' + (currentLang === 'zh' ? '填写中... (' + current + '/' + total + ')' : 'Filling... (' + current + '/' + total + ')');
      }
    };
    chrome.storage.onChanged.addListener(progressListener);
    try {
      const res = await chrome.runtime.sendMessage({
        type: 'FILL_FIELDS',
        payload: { fillMap }
      });
      unsub();
      if (res?.success) {
        if (res?.filledIds?.length) {
          const { filledFieldIds = [] } = await chrome.storage.local.get('filledFieldIds');
          await chrome.storage.local.set({ filledFieldIds: [...new Set([...filledFieldIds, ...res.filledIds])] });
        }
        const filled = res.filled || 0;
        document.getElementById('fieldCount').textContent = `${t('filled_count')} ${filled} ${t('fields_count')}`;
        saveToHistory();
        renderFields();
        btn.innerHTML = currentLang === 'zh' ? '✓ 完成' : '✓ Done';
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = origText;
        }, 2000);
        chrome.runtime.sendMessage({
          type: 'SHOW_PAGE_TOAST',
          payload: { message: `JobFill: ${filled} fields filled ✓` }
        }).catch(() => { });
      } else {
        btn.disabled = false;
        btn.textContent = origText;
      }
    } catch (_) {
      unsub();
      btn.disabled = false;
      btn.textContent = origText;
    }
  });

  // --- History ---
  async function loadHistory() {
    const { history = [] } = await chrome.storage.local.get('history');
    const list = document.getElementById('historyList');
    if (history.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon icon-clock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>
          </svg>
          <p class="empty-state-title">${t('no_history')}</p>
          <p class="empty-state-subtitle">${t('no_history_hint')}</p>
        </div>`;
    } else {
      list.innerHTML = history
        .slice(0, 50)
        .map(
          (h) => `
        <div class="history-item" data-id="${h.id}">
          <img src="https://www.google.com/s2/favicons?domain=${escapeHtml(h.domain)}&sz=32" alt="">
          <div>
            <div class="domain">${escapeHtml(h.domain)}</div>
            <div class="date">${escapeHtml(h.date)} · ${h.fieldCount || 0} ${t('history_fields')}</div>
          </div>
        </div>
      `
        )
        .join('');
      list.querySelectorAll('.history-item').forEach((el) => {
        el.addEventListener('click', () => restoreHistory(el.dataset.id));
      });
    }
    loadSavedAnswers();
  }

  async function loadSavedAnswers() {
    const { answerMemory = {} } = await chrome.storage.local.get('answerMemory');
    const list = document.getElementById('savedAnswersList');
    const entries = Object.entries(answerMemory).filter(([, v]) => v != null && String(v).trim() !== '');
    if (entries.length === 0) {
      list.innerHTML = `<p style="color:#666">${t('no_saved_answers')}</p>`;
      return;
    }
    list.innerHTML = entries
      .map(
        ([key, val]) => `
        <div class="saved-answer-item" data-key="${escapeHtml(key)}">
          <span class="label">${escapeHtml(key)}</span>
          <span class="value">${escapeHtml(String(val).slice(0, 50))}${String(val).length > 50 ? '…' : ''}</span>
          <button type="button" class="secondary delete-saved" data-key="${escapeHtml(key)}">${t('delete_saved')}</button>
        </div>
      `
      )
      .join('');
    list.querySelectorAll('.delete-saved').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const key = btn.dataset.key;
        const { answerMemory = {} } = await chrome.storage.local.get('answerMemory');
        delete answerMemory[key];
        await chrome.storage.local.set({ answerMemory });
        loadSavedAnswers();
        renderFields();
      });
    });
  }

  async function restoreHistory(id) {
    const { history = [] } = await chrome.storage.local.get('history');
    const h = history.find((x) => x.id === id);
    if (!h?.answers) return;
    answers = h.answers;
    await chrome.storage.local.set({ fillMap: h.answers });
    renderFields();
  }

  document.getElementById('clearHistory').addEventListener('click', async () => {
    await chrome.storage.local.set({ history: [] });
    loadHistory();
  });

  const AI_PROVIDER_CONFIG = {
    deepseek: {
      keyStorage: 'deepseekKey',
      keyLabel: 'deepseek_api_key',
      placeholder: 'sk-...',
      models: [{ value: 'deepseek-chat', label: 'deepseek-chat' }]
    },
    openai: {
      keyStorage: 'openaiKey',
      keyLabel: 'openai_api_key',
      placeholder: 'sk-...',
      models: [
        { value: 'gpt-4o', label: 'gpt-4o' },
        { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
        { value: 'gpt-4-turbo', label: 'gpt-4-turbo' }
      ]
    },
    claude: {
      keyStorage: 'claudeKey',
      keyLabel: 'anthropic_api_key',
      placeholder: 'sk-ant-...',
      models: [
        { value: 'claude-opus-4-5', label: 'claude-opus-4-5' },
        { value: 'claude-sonnet-4-5', label: 'claude-sonnet-4-5' },
        { value: 'claude-haiku-4-5', label: 'claude-haiku-4-5' }
      ]
    }
  };

  function updateSettingsUI(provider, model) {
    const cfg = AI_PROVIDER_CONFIG[provider] || AI_PROVIDER_CONFIG.deepseek;
    const apiKeyLabel = document.getElementById('apiKeyLabel');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const modelSelect = document.getElementById('modelSelect');
    if (apiKeyLabel) apiKeyLabel.textContent = t(cfg.keyLabel);
    if (apiKeyInput) apiKeyInput.placeholder = cfg.placeholder;
    if (modelSelect) {
      modelSelect.innerHTML = cfg.models.map((m) => `<option value="${m.value}">${m.label}</option>`).join('');
      const selected = model || cfg.models[0]?.value;
      if (selected && cfg.models.some((m) => m.value === selected)) modelSelect.value = selected;
      else if (cfg.models[0]) modelSelect.value = cfg.models[0].value;
    }
  }

  // --- Settings & initial load ---
  chrome.storage.local.get(['aiProvider', 'deepseekKey', 'openaiKey', 'claudeKey', 'selectedModel', 'apiKey', 'language', 'theme', 'profile', 'fillMap', 'savedResume', 'savedJobDescription', 'jobDescription', 'coverLetter', 'matchAnalysis'], async (r) => {
    if (r.apiKey && !r.deepseekKey) {
      await chrome.storage.local.set({ deepseekKey: r.apiKey });
      r.deepseekKey = r.apiKey;
    }
    const provider = r.aiProvider || 'deepseek';
    const cfg = AI_PROVIDER_CONFIG[provider];
    const storedKey = cfg ? (r[cfg.keyStorage] || '') : '';
    if (document.getElementById('aiProvider')) document.getElementById('aiProvider').value = provider;
    updateSettingsUI(provider, r.selectedModel);
    if (document.getElementById('apiKeyInput')) document.getElementById('apiKeyInput').value = storedKey;
    const modelSelect = document.getElementById('modelSelect');
    if (modelSelect && !r.selectedModel) {
      chrome.storage.local.set({ selectedModel: modelSelect.value || '' });
    }
    if (r.language) {
      currentLang = r.language === 'zh' ? 'zh' : 'en';
      document.getElementById('language').value = r.language;
    }
    if (r.theme) currentTheme = r.theme;
    applyLanguage();
    applyTheme(currentTheme);
    updateCoverLetterWordCount();
    if (r.savedResume != null && r.savedResume !== '') resumeTa.value = r.savedResume;
    if (r.savedJobDescription != null && r.savedJobDescription !== '') jobDescTa.value = r.savedJobDescription;
    else if (r.jobDescription) jobDescTa.value = r.jobDescription;
    if (r.profile) {
      profile = r.profile;
      document.getElementById('profilePreview').style.display = 'block';
      document.getElementById('profilePreview').innerHTML = renderProfilePreview(profile);
    }
    if (r.fillMap) answers = r.fillMap;
    if (r.coverLetter) {
      coverLetterTa.value = r.coverLetter;
      updateCoverLetterWordCount();
      autoResizeCoverLetter();
    }
    if (r.matchAnalysis) renderMatchAnalysis(r.matchAnalysis);
  });

  document.getElementById('aiProvider').addEventListener('change', async (e) => {
    const oldProvider = (await chrome.storage.local.get('aiProvider')).aiProvider || 'deepseek';
    const oldCfg = AI_PROVIDER_CONFIG[oldProvider];
    if (oldCfg) {
      const currentVal = document.getElementById('apiKeyInput')?.value?.trim() || '';
      await chrome.storage.local.set({ [oldCfg.keyStorage]: currentVal });
    }
    const provider = e.target.value;
    const cfg = AI_PROVIDER_CONFIG[provider];
    const key = cfg ? (await chrome.storage.local.get(cfg.keyStorage))[cfg.keyStorage] || '' : '';
    const apiKeyInput = document.getElementById('apiKeyInput');
    if (apiKeyInput) apiKeyInput.value = key;
    updateSettingsUI(provider);
    await chrome.storage.local.set({ aiProvider: provider });
  });

  document.getElementById('apiKeyInput').addEventListener('change', async (e) => {
    const provider = (await chrome.storage.local.get('aiProvider')).aiProvider || 'deepseek';
    const cfg = AI_PROVIDER_CONFIG[provider];
    if (cfg) {
      const upd = { [cfg.keyStorage]: e.target.value.trim() };
      await chrome.storage.local.set(upd);
    }
  });

  document.getElementById('modelSelect').addEventListener('change', (e) => {
    chrome.storage.local.set({ selectedModel: e.target.value });
  });

  document.getElementById('language').addEventListener('change', async (e) => {
    currentLang = e.target.value === 'zh' ? 'zh' : 'en';
    await chrome.storage.local.set({ language: currentLang });
    applyLanguage();
    const provider = (await chrome.storage.local.get('aiProvider')).aiProvider || 'deepseek';
    updateSettingsUI(provider);
    renderFields();
    updateCoverLetterWordCount();
    if (profile) {
      document.getElementById('profilePreview').innerHTML = renderProfilePreview(profile);
    }
    loadHistory();
  });

  document.getElementById('themeDark').addEventListener('click', () => applyTheme('dark'));
  document.getElementById('themeLight').addEventListener('click', () => applyTheme('light'));

  document.getElementById('testApi').addEventListener('click', async () => {
    const msgEl = document.getElementById('settingsMessage');
    const provider = (await chrome.storage.local.get('aiProvider')).aiProvider || 'deepseek';
    const cfg = AI_PROVIDER_CONFIG[provider];
    if (cfg) {
      const keyVal = document.getElementById('apiKeyInput')?.value?.trim() || '';
      await chrome.storage.local.set({ [cfg.keyStorage]: keyVal });
    }
    await chrome.storage.local.set({ selectedModel: document.getElementById('modelSelect')?.value || '' });
    showMessage(msgEl, currentLang === 'zh' ? '测试中...' : 'Testing...', '');
    try {
      await callDeepSeek([{ role: 'user', content: 'Say hello' }], { max_tokens: 10 });
      showMessage(msgEl, t('connection_successful'), 'success');
    } catch (e) {
      showMessage(msgEl, (e?.message || '').toLowerCase().includes('api') ? '✗ Failed - check API key' : (e?.message || (currentLang === 'zh' ? '连接失败' : 'Connection failed.')), 'error');
    }
  });

  function switchToFieldsTab() {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active'));
    const fieldsTab = document.querySelector('.tab[data-tab="fields"]');
    const fieldsPane = document.getElementById('fields');
    if (fieldsTab) fieldsTab.classList.add('active');
    if (fieldsPane) fieldsPane.classList.add('active');
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      const newFields = changes.scannedFields?.newValue ?? changes.lastScannedFields?.newValue;
      if (newFields) {
        fields = newFields;
        const countEl = document.getElementById('fieldCount');
        if (countEl) countEl.textContent = `${fields.length} ${t('fields_found')}.`;
        renderFields();
        switchToFieldsTab();
      }
    }
  });

  chrome.storage.local.get(['scannedFields', 'lastScannedFields'], (r) => {
    const flds = r.scannedFields ?? r.lastScannedFields;
    if (Array.isArray(flds) && flds.length > 0) {
      fields = flds;
      const countEl = document.getElementById('fieldCount');
      if (countEl) countEl.textContent = `${fields.length} ${t('fields_found')}.`;
      renderFields();
    }
  });

  async function saveToHistory() {
    const [tab] = await new Promise((r) => chrome.tabs.query({ active: true, currentWindow: true }, r));
    if (!tab?.url || Object.keys(answers).length === 0) return;
    try {
      const domain = new URL(tab.url).hostname;
      const { history = [] } = await chrome.storage.local.get('history');
      history.unshift({
        id: crypto.randomUUID(),
        url: tab.url,
        domain,
        date: new Date().toISOString().slice(0, 10),
        fieldCount: fields.length,
        answers: { ...answers }
      });
      await chrome.storage.local.set({ history: history.slice(0, 100) });
    } catch (_) {}
  }

  loadHistory();
})();
