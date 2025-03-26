import React from 'react';
import { createRoot } from 'react-dom/client';
import AIChatSidebar from '@/components/AIChatSidebar';
import '@/index.css';

// 获取根元素
const root = document.getElementById('app');
if (!root) {
  throw new Error('Root element not found');
}

// 渲染应用
createRoot(root).render(
  <React.StrictMode>
    <AIChatSidebar />
  </React.StrictMode>
);