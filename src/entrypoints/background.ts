import { defineBackground } from 'wxt/sandbox';

export default defineBackground(() => {
  // 初始化侧边栏配置
  const initializeSidePanel = async () => {
    await chrome.sidePanel.setOptions({
      path: 'sidepanel.html',
      enabled: true
    });
  };

  // 处理扩展安装或更新
  chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install' || details.reason === 'update') {
      // 初始化侧边栏
      await initializeSidePanel();
      // 打开设置页面
      chrome.tabs.create({
        url: 'newtab.html'
      });
    }
  });

  // 处理点击扩展图标
  chrome.action.onClicked.addListener((tab) => {
    // 注意：这里不使用 async/await，因为这样可能会打断用户手势链
    chrome.sidePanel.open({ windowId: tab.windowId }).catch((error) => {
      console.error('打开侧边栏失败:', error);
    });
  });
});
