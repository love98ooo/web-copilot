import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: 'chrome',
  manifest: {
    name: 'AI Web Copilot',
    description: 'Your AI assistant for web browsing',
    permissions: [
      'storage',
      'sidePanel',
    ],
    host_permissions: ["<all_urls>"],
    chrome_url_overrides: {
      newtab: 'newtab.html'
    },
    options_ui: {
      page: 'options/index.html',
      open_in_tab: true
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
