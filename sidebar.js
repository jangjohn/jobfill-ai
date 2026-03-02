/**
 * JobFill AI - Sidebar Logic
 */

(function () {
  'use strict';

  const CATEGORY_ORDER = ['PERSONAL', 'EXPERIENCE', 'APPLICATION', 'AVAILABILITY', 'CUSTOM'];

  let profile = null;
  let fields = [];
  let answers = {};

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

  // --- PDF upload ---
  const pdfInput = document.getElementById('pdfInput');
  document.getElementById('uploadPdf').addEventListener('click', () => pdfInput.click());
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
      document.getElementById('resumeText').value = text;
    };
    r.readAsArrayBuffer(file);
    e.target.value = '';
  });

  // --- Parse Resume (Phase 1) ---
  document.getElementById('parseResume').addEventListener('click', async () => {
    const text = document.getElementById('resumeText').value.trim();
    const msgEl = document.getElementById('setupMessage');
    const previewEl = document.getElementById('profilePreview');
    if (!text) {
      msgEl.textContent = 'Please paste or upload your resume first.';
      msgEl.className = 'error';
      return;
    }
    msgEl.textContent = 'Parsing...';
    msgEl.className = '';
    try {
      const content = await callDeepSeek([
        { role: 'system', content: 'You are a resume parser. Extract structured data and return ONLY valid JSON, no markdown, no code blocks.' },
        { role: 'user', content: `Parse this resume:\n\n${text}` }
      ]);
      const json = parseJsonFromResponse(content);
      profile = json;
      await chrome.storage.local.set({ profile: json });
      previewEl.style.display = 'block';
      previewEl.innerHTML = `
        <p><strong>Name:</strong> ${json.name || '-'}</p>
        <p><strong>Email:</strong> ${json.email || '-'}</p>
        <p><strong>Skills:</strong> ${(json.skills || []).slice(0, 8).map(s => `<span class="skill-tag">${s}</span>`).join('')}</p>
        <p><strong>Experience:</strong> ${(json.experience || []).length} entries</p>
      `;
      msgEl.textContent = 'Resume parsed successfully.';
      msgEl.className = 'success';
    } catch (e) {
      msgEl.textContent = e?.message || 'Parse failed.';
      msgEl.className = 'error';
    }
  });

  // --- Analyze Job ---
  document.getElementById('analyzeJob').addEventListener('click', async () => {
    const jd = document.getElementById('jobDesc').value.trim();
    const msgEl = document.getElementById('setupMessage');
    if (!jd) {
      msgEl.textContent = 'Please paste the job description first.';
      msgEl.className = 'error';
      return;
    }
    await chrome.storage.local.set({ jobDescription: jd });
    msgEl.textContent = 'Job description saved.';
    msgEl.className = 'success';
  });

  // --- Generate All Answers (Phase 2) ---
  document.getElementById('generateAll').addEventListener('click', async () => {
    const msgEl = document.getElementById('setupMessage');
    if (fields.length === 0) {
      msgEl.textContent = 'Scan the page first to detect form fields.';
      msgEl.className = 'error';
      return;
    }
    const { profile: p, jobDescription: jd } = await chrome.storage.local.get(['profile', 'jobDescription']);
    profile = p || profile;
    if (!profile) {
      msgEl.textContent = 'Parse your resume first.';
      msgEl.className = 'error';
      return;
    }
    if (!jd) {
      msgEl.textContent = 'Add job description first.';
      msgEl.className = 'error';
      return;
    }
    msgEl.textContent = 'Generating answers...';
    msgEl.className = '';
    try {
      const fillMap = await generateAllAnswers(profile, jd, fields);
      answers = fillMap;
      await chrome.storage.local.set({ fillMap });
      msgEl.textContent = `Generated ${Object.keys(fillMap).length} answers.`;
      msgEl.className = 'success';
      renderFields();
    } catch (e) {
      msgEl.textContent = e?.message || 'Generation failed.';
      msgEl.className = 'error';
    }
  });

  async function generateAllAnswers(prof, jd, fieldList) {
    const profileJson = JSON.stringify(prof);
    const personalFields = fieldList.filter((f) => f.category === 'PERSONAL');
    const shortFields = fieldList.filter((f) => f.category !== 'PERSONAL' && f.type !== 'textarea');
    const longFields = fieldList.filter((f) => f.type === 'textarea' || (f.label || '').toLowerCase().includes('cover') || (f.label || '').toLowerCase().includes('letter'));

    const fillMap = {};

    for (const f of personalFields) {
      const val = getPersonalValue(prof, f.label, f.name);
      if (val != null) fillMap[f.id] = val;
    }

    if (shortFields.length > 0) {
      const labels = shortFields.map((f) => f.label).filter(Boolean);
      const content = await callDeepSeek([
        { role: 'system', content: 'You are a job application assistant. Given a candidate profile and job description, generate concise, authentic answers for each form field. Return ONLY a JSON object mapping each field label (exactly as given) to the answer string.' },
        { role: 'user', content: `Profile: ${profileJson}\n\nJob: ${jd}\n\nGenerate answers for: ${JSON.stringify(labels)}` }
      ]);
      const batch = parseJsonFromResponse(content);
      for (const f of shortFields) {
        const val = batch[f.label] ?? batch[f.label?.toLowerCase()];
        if (val != null) fillMap[f.id] = String(val);
      }
    }

    for (const f of longFields) {
      const content = await callDeepSeek([
        { role: 'system', content: 'You are a job application assistant. Write a concise, professional cover letter / long-form answer (200-400 words) that connects the candidate to the role. Return ONLY the text, no JSON.' },
        { role: 'user', content: `Profile: ${profileJson}\n\nJob: ${jd}\n\nField: ${f.label}` }
      ], { max_tokens: 1024 });
      const text = content.trim().replace(/^["']|["']$/g, '');
      if (text) fillMap[f.id] = text;
    }

    return fillMap;
  }

  function getPersonalValue(prof, label, name) {
    const l = (label || name || '').toLowerCase();
    if (l.includes('name') && !l.includes('last') && !l.includes('first')) return prof.name;
    if (l.includes('first') && l.includes('name')) return (prof.name || '').split(/\s+/)[0] || prof.name;
    if (l.includes('last') && l.includes('name')) return (prof.name || '').split(/\s+/).slice(1).join(' ') || '';
    if (l.includes('email')) return prof.email;
    if (l.includes('phone') || l.includes('tel')) return prof.phone;
    if (l.includes('linkedin')) return prof.linkedin;
    if (l.includes('location') || l.includes('city') || l.includes('address')) return prof.location;
    return null;
  }

  function parseJsonFromResponse(str) {
    const cleaned = str.replace(/```json\s*|\s*```/g, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch (_) {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      throw new Error('Could not parse JSON from response');
    }
  }

  async function callDeepSeek(messages, options = {}) {
    const res = await chrome.runtime.sendMessage({
      type: 'CALL_DEEPSEEK',
      payload: { messages, options }
    });
    if (!res?.success) throw new Error(res?.error || 'API call failed');
    return res.content;
  }

  // --- Scan Fields ---
  document.getElementById('scanFields').addEventListener('click', async () => {
    const countEl = document.getElementById('fieldCount');
    countEl.textContent = 'Scanning...';
    try {
      const res = await chrome.runtime.sendMessage({ type: 'SCAN_FIELDS' });
      if (res?.success && Array.isArray(res.fields)) {
        fields = res.fields;
        countEl.textContent = `${fields.length} fields found.`;
        renderFields();
      } else {
        countEl.textContent = res?.error || 'No fields found.';
      }
    } catch (e) {
      countEl.textContent = 'Scan failed. Reload the page and try again.';
    }
  });

  function renderFields() {
    const list = document.getElementById('fieldList');
    if (fields.length === 0) {
      list.innerHTML = '<p style="color:#666">No fields. Click Scan Page first.</p>';
      return;
    }
    const grouped = {};
    for (const cat of CATEGORY_ORDER) grouped[cat] = [];
    for (const f of fields) {
      const c = f.category || 'CUSTOM';
      if (!grouped[c]) grouped[c] = [];
      grouped[c].push(f);
    }
    let html = '';
    for (const cat of CATEGORY_ORDER) {
      const arr = grouped[cat] || [];
      if (arr.length === 0) continue;
      html += `<h4 style="margin:12px 0 8px;color:#999">${cat}</h4>`;
      for (const f of arr) {
        const aiVal = answers[f.id] ?? f.aiValue ?? '';
        html += `
          <div class="field-item" data-id="${f.id}">
            <div class="label">${escapeHtml(f.label)}</div>
            <div class="meta"><span class="type-badge">${f.type}</span> ${f.required ? '· Required' : ''}</div>
            <input type="text" data-field="${f.id}" value="${escapeHtml(aiVal)}" placeholder="AI value">
            <div>
              <button type="button" class="secondary fill-one" data-id="${f.id}">Fill This</button>
              <button type="button" class="secondary regenerate-one" data-id="${f.id}">Re-generate</button>
            </div>
          </div>
        `;
      }
    }
    list.innerHTML = html || '<p style="color:#666">No fields.</p>';

    list.querySelectorAll('input[data-field]').forEach((input) => {
      input.addEventListener('input', () => {
        answers[input.dataset.field] = input.value;
        const fillMap = { ...answers };
        chrome.storage.local.set({ fillMap });
      });
    });

    list.querySelectorAll('.fill-one').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const val = answers[id];
        if (val != null) {
          chrome.runtime.sendMessage({
            type: 'FILL_FIELDS',
            payload: { fillMap: { [id]: val } }
          });
        }
      });
    });

    list.querySelectorAll('.regenerate-one').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const f = fields.find((x) => x.id === btn.dataset.id);
        if (!f) return;
        const { profile: p, jobDescription: jd } = await chrome.storage.local.get(['profile', 'jobDescription']);
        if (!p || !jd) return;
        try {
          const content = await callDeepSeek([
            { role: 'system', content: 'You are a job application assistant. Return ONLY the answer string, no JSON.' },
            { role: 'user', content: `Profile: ${JSON.stringify(p)}\n\nJob: ${jd}\n\nGenerate answer for: ${f.label}` }
          ]);
          const val = content.trim().replace(/^["']|["']$/g, '');
          if (val) {
            answers[f.id] = val;
            const input = list.querySelector(`input[data-field="${f.id}"]`);
            if (input) input.value = val;
            const { fillMap = {} } = await chrome.storage.local.get('fillMap');
            fillMap[f.id] = val;
            await chrome.storage.local.set({ fillMap });
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

  // --- Fill All ---
  document.getElementById('fillAll').addEventListener('click', async () => {
    const fillMap = { ...answers };
    for (const f of fields) {
      if (answers[f.id] != null) fillMap[f.id] = answers[f.id];
      else if (answers[f.label] != null) fillMap[f.id] = answers[f.label];
    }
    await chrome.storage.local.set({ fillMap });
    try {
      const res = await chrome.runtime.sendMessage({
        type: 'FILL_FIELDS',
        payload: { fillMap }
      });
      if (res?.success) {
        document.getElementById('fieldCount').textContent = `Filled ${res.filled || 0} fields.`;
        saveToHistory();
      }
    } catch (_) {}
  });

  // --- History ---
  async function loadHistory() {
    const { history = [] } = await chrome.storage.local.get('history');
    const list = document.getElementById('historyList');
    if (history.length === 0) {
      list.innerHTML = '<p style="color:#666">No history yet.</p>';
      return;
    }
    list.innerHTML = history
      .slice(0, 50)
      .map(
        (h) => `
        <div class="history-item" data-id="${h.id}">
          <img src="https://www.google.com/s2/favicons?domain=${escapeHtml(h.domain)}&sz=32" alt="">
          <div>
            <div class="domain">${escapeHtml(h.domain)}</div>
            <div class="date">${escapeHtml(h.date)} · ${h.fieldCount || 0} fields</div>
          </div>
        </div>
      `
      )
      .join('');
    list.querySelectorAll('.history-item').forEach((el) => {
      el.addEventListener('click', () => restoreHistory(el.dataset.id));
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

  // --- Settings ---
  chrome.storage.local.get(['apiKey', 'language'], (r) => {
    if (r.apiKey) document.getElementById('apiKey').value = r.apiKey;
    if (r.language) document.getElementById('language').value = r.language;
  });

  document.getElementById('apiKey').addEventListener('change', (e) => {
    chrome.storage.local.set({ apiKey: e.target.value.trim() });
  });

  document.getElementById('language').addEventListener('change', (e) => {
    chrome.storage.local.set({ language: e.target.value });
  });

  document.getElementById('testApi').addEventListener('click', async () => {
    const msgEl = document.getElementById('settingsMessage');
    msgEl.textContent = 'Testing...';
    msgEl.className = '';
    try {
      await callDeepSeek([{ role: 'user', content: 'Hi' }], { max_tokens: 5 });
      msgEl.textContent = 'Connection successful.';
      msgEl.className = 'success';
    } catch (e) {
      msgEl.textContent = e?.message || 'Connection failed.';
      msgEl.className = 'error';
    }
  });

  // --- Sync fields from storage (set by content script when scanning) ---
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.lastScannedFields?.newValue) {
      fields = changes.lastScannedFields.newValue;
      const countEl = document.getElementById('fieldCount');
      if (countEl) countEl.textContent = `${fields.length} fields found.`;
      renderFields();
    }
  });

  chrome.storage.local.get('lastScannedFields', (r) => {
    if (Array.isArray(r.lastScannedFields) && r.lastScannedFields.length > 0) {
      fields = r.lastScannedFields;
      document.getElementById('fieldCount').textContent = `${fields.length} fields found.`;
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

  // Load initial data
  chrome.storage.local.get(['profile', 'fillMap', 'jobDescription'], (r) => {
    if (r.profile) {
      profile = r.profile;
      document.getElementById('profilePreview').style.display = 'block';
      document.getElementById('profilePreview').innerHTML = `
        <p><strong>Name:</strong> ${profile.name || '-'}</p>
        <p><strong>Email:</strong> ${profile.email || '-'}</p>
        <p><strong>Skills:</strong> ${(profile.skills || []).slice(0, 8).map(s => `<span class="skill-tag">${s}</span>`).join('')}</p>
        <p><strong>Experience:</strong> ${(profile.experience || []).length} entries</p>
      `;
    }
    if (r.fillMap) answers = r.fillMap;
    if (r.jobDescription) document.getElementById('jobDesc').value = r.jobDescription;
  });

  loadHistory();
})();
