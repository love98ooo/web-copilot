import { defineConfig } from 'wxt';
import { config } from 'dotenv';

// 加载环境变量
config();

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: 'chrome',
  runner: {
    chromiumArgs: ['--user-data-dir=./.wxt/chrome-data'],
  },
  manifest: {
    name: 'Web Copilot',
    description: 'Your AI assistant for web browsing',
    permissions: [
      'storage',
      'sidePanel',
      'tabs',
      'scripting'
    ],
    host_permissions: ["<all_urls>"],
    background: {
      service_worker: 'background.ts'
    },
    action: {
      default_title: "Web Copilot",
      default_icon: {
        "16": "icon-16.png",
        "32": "icon-32.png",
        "48": "icon-48.png",
        "128": "icon-128.png"
      }
    },
    icons: {
      "16": "icon-16.png",
      "32": "icon-32.png",
      "48": "icon-48.png",
      "128": "icon-128.png"
    },
    side_panel: {
      default_path: "sidepanel.html"
    }
  },
  modules: ['@wxt-dev/module-react'],
  srcDir: 'src'
});
