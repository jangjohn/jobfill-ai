# JobFill AI

> AI-powered Chrome extension that automatically fills job application forms using your resume and the job description.

![Demo](https://s5.ezgif.com/tmp/ezgif-5ab70288bc52e357.gif)

## ✨ Features

- **Smart Form Detection** — Automatically scans any job application page and detects all fillable fields
- **AI-Powered Answers** — Generates context-aware answers using your resume + job description
- **Multi-Provider Support** — Works with DeepSeek, OpenAI (GPT-4o), and Claude (Anthropic)
- **Cover Letter Generator** — Produces tailored 250-350 word cover letters per application
- **Job Match Analysis** — Shows match percentage, matched skills, missing skills, and improvement suggestions
- **One-Click Fill** — Fills all detected fields simultaneously with a single button
- **Answer Memory** — Remembers your edited answers and reuses them for similar fields
- **Bilingual UI** — Full English and Chinese (中文) interface support
- **Light / Dark Theme** — Toggle between themes in Settings

## 🎯 Supported Platforms

Lever (jobs.lever.co) — ✅ Full support

## 🚀 Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the project folder
5. The JobFill AI icon will appear in your toolbar

## ⚙️ Setup

1. Click the JobFill AI icon to open the sidebar
2. Go to **Settings** tab
3. Select your AI provider (DeepSeek / OpenAI / Claude)
4. Enter your API key
5. Click **Test Connection** to verify

> API keys are stored locally in your browser and never sent anywhere except the chosen AI provider.

## 📖 How to Use

1. Navigate to a job application page
2. Click **Scan** on the floating JobFill panel (bottom-right)
3. Open the sidebar — it auto-switches to the **Fields** tab
4. Go to **Setup** tab, paste your resume and job description
5. Click **Parse Resume** then **Analyze Match**
6. Click **Generate All Answers**
7. Review answers in the **Fields** tab, edit if needed
8. Click **Fill All** to auto-fill the form

## 🏗️ Tech Stack

- **Manifest V3** Chrome Extension
- Vanilla JavaScript (zero dependencies)
- Chrome APIs: `sidePanel`, `storage.local`, `runtime messaging`
- Shadow DOM for CSS isolation
- DeepSeek / OpenAI / Anthropic APIs

## 📁 Project Structure

```
jobfill-ai/
├── manifest.json       # Extension config (MV3)
├── background.js       # Service worker, API routing
├── content.js          # Form scanner, filler, floating panel
├── sidebar.html        # Main UI
├── sidebar.js          # Sidebar logic
├── floating.css        # Injected styles
└── icons/              # Extension icons
```

## 🔑 API Keys

You need an API key from one of:
- [DeepSeek](https://platform.deepseek.com/) — Most cost-effective
- [OpenAI](https://platform.openai.com/) — GPT-4o, GPT-4.1
- [Anthropic](https://console.anthropic.com/) — Claude Sonnet 4.6, Claude Haiku 4.5

## 📄 License

MIT License — free to use and modify.

---

Built by [@jangjohn](https://github.com/jangjohn)
