/**
 * JobFill AI - Background Service Worker
 * Handles: Side Panel, API calls, message routing
 */

// Open Side Panel on extension icon click (user gesture - always works)
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Ensure side panel opens when user clicks extension icon
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// Handle keyboard shortcut for floating panel toggle
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-panel') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_FLOATING_PANEL' }).catch(() => {});
      }
    });
  }
});

/**
 * Call AI API - routes to DeepSeek, OpenAI, or Claude based on saved provider
 * API keys never exposed to content scripts
 */
async function callAI(messages, options = {}) {
  const { aiProvider, deepseekKey, openaiKey, claudeKey, selectedModel } = await chrome.storage.local.get([
    'aiProvider', 'deepseekKey', 'openaiKey', 'claudeKey', 'selectedModel'
  ]);
  const provider = aiProvider || 'deepseek';

  if (provider === 'deepseek') {
    const key = deepseekKey;
    if (!key) throw new Error('API key not configured. Please add your DeepSeek API key in Settings.');
    const model = selectedModel || options.model || 'deepseek-chat';
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: options.max_tokens || 4096,
        temperature: options.temperature ?? 0.3
      })
    });
    return parseChatResponse(response, 'choices.0.message.content');
  }

  if (provider === 'openai') {
    const key = openaiKey;
    if (!key) throw new Error('API key not configured. Please add your OpenAI API key in Settings.');
    const model = selectedModel || options.model || 'gpt-4o';
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: options.max_tokens || 4096,
        temperature: options.temperature ?? 0.3
      })
    });
    return parseChatResponse(response, 'choices.0.message.content');
  }

  if (provider === 'claude') {
    const key = claudeKey;
    if (!key) throw new Error('API key not configured. Please add your Anthropic API key in Settings.');
    const model = selectedModel || options.model || 'claude-sonnet-4-5';
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    const chatMessages = messages.filter((m) => m.role !== 'system');
    const body = {
      model,
      max_tokens: options.max_tokens || 4096,
      system: system || undefined,
      messages: chatMessages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
    };
    if (!body.system) delete body.system;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errMsg = data.error?.message || `API error (${response.status})`;
      throw new Error(errMsg);
    }
    const text = data.content?.[0]?.text;
    if (!text) throw new Error('Empty response from API');
    return text;
  }

  throw new Error('Unknown AI provider');
}

async function parseChatResponse(response, contentPath) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errMsg = data.error?.message || `API error (${response.status})`;
    throw new Error(errMsg);
  }
  const content = contentPath.split('.').reduce((o, k) => o?.[k], data);
  if (!content) throw new Error('Empty response from API');
  return content;
}

/**
 * Message handler - routes between content script and API
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'OPEN_SIDEPANEL') {
    const tabId = sender?.tab?.id;
    if (!tabId) {
      sendResponse({ ok: false, error: 'No tab' });
      return false;
    }
    chrome.sidePanel.open({ tabId }).then(() => {
      sendResponse({ ok: true });
    }).catch((err) => {
      console.error('[JobFill] sidePanel.open failed:', err);
      chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
      sendResponse({ ok: false, error: err?.message });
    });
    return true;
  }
  const tabId = sender?.tab?.id;
  const handlers = {
    async CALL_DEEPSEEK(payload) {
      const { messages, options } = payload;
      const content = await callAI(messages, options || {});
      return { success: true, content };
    },

    async SCAN_FIELDS() {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return { success: false, error: 'No active tab' };
      try {
        const result = await chrome.tabs.sendMessage(tab.id, { type: 'SCAN_FIELDS' });
        return { success: true, fields: result?.fields || [] };
      } catch (e) {
        return { success: false, error: e?.message || 'Content script not ready' };
      }
    },

    async FILL_FIELDS(payload) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return { success: false, error: 'No active tab' };
      try {
        const result = await chrome.tabs.sendMessage(tab.id, {
          type: 'FILL_FIELDS',
          fillMap: payload.fillMap || payload || {},
        });
        return { success: true, filled: result?.filled ?? 0, filledIds: result?.filledIds || [] };
      } catch (e) {
        return { success: false, error: e?.message || 'Content script not ready' };
      }
    },

    async REQUEST_FILL_ALL() {
      const { fillMap = {} } = await chrome.storage.local.get('fillMap');
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return { success: false, error: 'No active tab' };
      try {
        const result = await chrome.tabs.sendMessage(tab.id, {
          type: 'FILL_FIELDS',
          fillMap,
        });
        if (result?.filled > 0) {
          await chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_FILL_PROGRESS', percent: 100 });
          if (result?.filledIds?.length) {
            const { filledFieldIds = [] } = await chrome.storage.local.get('filledFieldIds');
            const merged = [...new Set([...filledFieldIds, ...result.filledIds])];
            await chrome.storage.local.set({ filledFieldIds: merged });
          }
        }
        return { success: true, filled: result?.filled ?? 0, filledIds: result?.filledIds || [] };
      } catch (e) {
        return { success: false, error: e?.message || 'Content script not ready' };
      }
    },

    async SHOW_PAGE_TOAST(payload) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return { success: false };
      const msg = payload?.message ?? payload?.payload?.message ?? '';
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_PAGE_TOAST', message: msg });
        return { success: true };
      } catch (e) {
        return { success: false, error: e?.message };
      }
    },
  };

  const handler = handlers[message.type];
  if (!handler) {
    sendResponse({ success: false, error: 'Unknown message type' });
    return false;
  }

  const payload = message.payload !== undefined ? message.payload : message;
  handler(payload)
    .then(sendResponse)
    .catch((err) => sendResponse({ success: false, error: err?.message || 'Unknown error' }));
  return true; // async response
});
