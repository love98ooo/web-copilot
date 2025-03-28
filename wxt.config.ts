import { defineConfig } from 'wxt';
import { config } from 'dotenv';

// 加载环境变量
config();

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: 'chrome',
  manifest: {
    name: 'AI Web Copilot',
    description: 'Your AI assistant for web browsing',
    permissions: [
      'storage',
      'sidePanel',
      'tabs',
      'scripting'
    ],
    host_permissions: ["<all_urls>"],
    chrome_url_overrides: {
      newtab: 'newtab.html'
    },
    background: {
      service_worker: 'background.ts'
    }
    // icons: {
    //   16: 'public/icons/icon-16.png',
    //   32: 'public/icons/icon-32.png',
    //   48: 'public/icons/icon-48.png',
    //   128: 'public/icons/icon-128.png'
    // }
  },
  modules: ['@wxt-dev/module-react'],
  srcDir: 'src'
});
