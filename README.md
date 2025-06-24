# Web Copilot

<div align="center">

![Web Copilot Logo](src/public/icon-128.png)

**Your AI Assistant for Web Browsing**

A powerful browser extension that integrates multiple AI providers to help you browse, analyze, and interact with web content seamlessly.

[![License](https://img.shields.io/badge/license-Apache_2.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](package.json)

</div>

## 🌟 Features

- **🤖 Multi-AI Provider Support**: Integrate with Google Gemini, OpenAI, and other AI providers
- **💬 Intelligent Chat Interface**: Natural conversation with AI about any webpage
- **📄 Page Content Analysis**: Automatically extract and analyze webpage content
- **💾 Chat History**: Save and manage your conversation history
- **⚙️ Customizable Settings**: Configure AI parameters, system prompts, and provider settings
- **🎨 Modern UI**: Beautiful interface built with React, TailwindCSS, and Shadcn components
- **🔄 Real-time Streaming**: Stream AI responses for better user experience

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- pnpm (recommended) or npm
- Chrome/Chromium browser

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/love98ooo/web-copilot.git
   cd web-copilot
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your AI provider API keys:
   ```env
   GOOGLE_AI_API_KEY=your_google_ai_key
   OPENAI_API_KEY=your_openai_key
   ```

4. **Start development**
   ```bash
   pnpm dev
   ```

5. **Load extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `.output/chrome-mv3` folder

## 📦 Build for Production

### Chrome Extension
```bash
pnpm build
pnpm zip
```

### Firefox Extension
```bash
pnpm build:firefox
pnpm zip:firefox
```

## 🛠️ Tech Stack

- **Framework**: [WXT](https://wxt.dev/) - Modern web extension framework
- **Frontend**: React 19 + TypeScript
- **Styling**: TailwindCSS 4.0
- **UI Components**: Shadcn/ui + Radix UI
- **AI Integration**: Google Generative AI, OpenAI
- **Build Tool**: Vite
- **Package Manager**: pnpm

## 📁 Project Structure

```
web-copilot/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Shadcn UI components
│   │   ├── AIConfigSettings.tsx
│   │   ├── ChatHistory.tsx
│   │   └── MessageList.tsx
│   ├── entrypoints/        # Extension entry points
│   │   ├── background.ts   # Service worker
│   │   ├── settings/       # Settings page
│   │   └── sidepanel/      # Main chat interface
│   ├── hooks/              # Custom React hooks
│   │   ├── use-ai.ts       # AI interaction logic
│   │   └── use-mobile.ts   # Mobile detection
│   ├── pages/              # Page components
│   │   ├── settings/       # Settings configuration
│   │   └── sidebar/        # Chat sidebar
│   ├── utils/              # Utility functions
│   │   ├── ai.ts          # AI provider abstractions
│   │   ├── storage.ts     # Chrome storage API
│   │   ├── history.ts     # Chat history management
│   │   └── page.ts        # Page content extraction
│   └── public/            # Static assets
├── scripts/               # Build scripts
├── wxt.config.ts         # WXT configuration
└── package.json
```

## ⚙️ Configuration

### AI Providers

The extension supports multiple AI providers. Configure them in the settings:

1. **Google Gemini**: Requires `GOOGLE_AI_API_KEY`
2. **OpenAI**: Requires `OPENAI_API_KEY`

### Extension Permissions

- `storage`: Save settings and chat history
- `sidePanel`: Access to Chrome side panel
- `tabs`: Read active tab information
- `scripting`: Inject content scripts
- `host_permissions`: Access webpage content

## 🎯 Usage

1. **Open Side Panel**: Click the extension icon or use the keyboard shortcut
2. **Read Page Content**: Click the "Read Page" button to analyze current webpage
3. **Chat with AI**: Type your questions about the page or general topics
4. **Switch Models**: Use the dropdown to switch between different AI models
5. **Manage History**: Access previous conversations from the history panel
6. **Customize Settings**: Configure AI parameters and system prompts

## 🔧 Development

### Available Scripts

- `pnpm dev` - Start development server for Chrome
- `pnpm dev:firefox` - Start development server for Firefox
- `pnpm build` - Build for production (Chrome)
- `pnpm build:firefox` - Build for production (Firefox)
- `pnpm compile` - Type check with TypeScript
- `pnpm generate-icons` - Generate extension icons

### Development Workflow

1. Make changes to source files
2. The extension will auto-reload in development mode
3. Test functionality in the browser
4. Build and test production version before release

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes
4. Run type checking: `pnpm compile`
5. Test the extension thoroughly
6. Commit your changes: `git commit -m 'Add new feature'`
7. Push to the branch: `git push origin feature/new-feature`
8. Submit a pull request

## 📜 License

This project is licensed under the Apache-2.0 License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [WXT](https://wxt.dev/) - Web extension framework
- [Shadcn/ui](https://ui.shadcn.com/) - UI components
- [Radix UI](https://www.radix-ui.com/) - Primitive components
- [TailwindCSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Lucide](https://lucide.dev/) - Icon library

## 🐛 Issues & Support

If you encounter any issues or have questions, please [open an issue](https://github.com/love98ooo/web-copilot/issues) on GitHub.

---

<div align="center">
Made with ❤️ using React, TypeScript, and WXT
</div>
