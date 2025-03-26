import { defineBackground } from 'wxt/sandbox';

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install' || details.reason === 'update') {
      chrome.tabs.create({
        url: 'newtab.html'
      });
    }
  });
});
