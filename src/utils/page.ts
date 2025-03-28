/**
 * 页面内容接口
 */
export interface PageContent {
  url: string;
  title: string;
  content: string;
  metadata: {
    description?: string;
    keywords?: string[];
    author?: string;
    publishedTime?: string;
  };
}

/**
 * 页面工具类
 */
export class PageService {
  private static instance: PageService;

  private constructor() {}

  public static getInstance(): PageService {
    if (!PageService.instance) {
      PageService.instance = new PageService();
    }
    return PageService.instance;
  }

  /**
   * 读取当前页面内容
   */
  public async readCurrentPage(): Promise<PageContent> {
    // 获取页面基本信息
    const url = window.location.href;
    const title = document.title;

    // 获取页面元数据
    const metadata = {
      description: this.getMetaContent('description'),
      keywords: this.getMetaContent('keywords')?.split(',').map(k => k.trim()),
      author: this.getMetaContent('author'),
      publishedTime: this.getMetaContent('article:published_time')
    };

    // 获取主要内容
    const content = this.extractMainContent();

    return {
      url,
      title,
      content,
      metadata
    };
  }

  /**
   * 从浏览器标签页读取当前页面内容
   * 该方法应该在扩展的侧边栏或弹出窗口中调用
   */
  public async readPageFromTab(): Promise<PageContent> {
    try {
      // 获取当前活动标签页
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs || !tabs[0]?.id) {
        throw new Error('无法获取当前标签页');
      }

      // 注入并执行脚本以读取页面内容
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          // 此函数在页面上下文中执行
          // 获取页面基本信息
          const url = window.location.href;
          const title = document.title;

          // 提取元数据
          function getMetaContent(name: string): string | undefined {
            const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
            const content = meta?.getAttribute('content');
            return content || undefined;
          }

          // 提取主要内容
          function extractMainContent(): string {
            // 移除不需要的元素
            const elementsToRemove = [
              'script', 'style', 'iframe', 'nav', 'header', 'footer', 'noscript'
            ];

            // 创建页面副本
            const contentContainer = document.body.cloneNode(true) as HTMLElement;

            // 移除不需要的元素
            elementsToRemove.forEach(tag => {
              const elements = contentContainer.getElementsByTagName(tag);
              while (elements.length > 0) {
                elements[0].parentNode?.removeChild(elements[0]);
              }
            });

            // 尝试找到主要内容区域
            const mainContent = contentContainer.querySelector('main, article, #content, .content, .main, [role="main"]');
            if (mainContent) {
              return cleanText(mainContent.textContent || '');
            }

            // 如果找不到主要内容区域，返回清理后的全部文本
            return cleanText(contentContainer.textContent || '');
          }

          // 清理文本内容
          function cleanText(text: string): string {
            return text
              .replace(/[\n\r]+/g, '\n') // 合并多个换行
              .replace(/\s+/g, ' ') // 合并多个空格
              .replace(/^\s+|\s+$/g, '') // 移除首尾空格
              .trim();
          }

          // 获取元数据
          const keywords = getMetaContent('keywords');
          const metadata = {
            description: getMetaContent('description'),
            keywords: keywords ? keywords.split(',').map(k => k.trim()) : undefined,
            author: getMetaContent('author'),
            publishedTime: getMetaContent('article:published_time')
          };

          // 获取主要内容
          const content = extractMainContent();

          return {
            url,
            title,
            content,
            metadata
          };
        }
      });

      if (!results || results.length === 0 || !results[0]?.result) {
        throw new Error('获取页面内容失败');
      }

      return results[0].result as PageContent;
    } catch (error) {
      console.error('读取页面失败:', error);
      throw error;
    }
  }

  /**
   * 获取 meta 标签内容
   */
  private getMetaContent(name: string): string | undefined {
    const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    const content = meta?.getAttribute('content');
    return content || undefined;
  }

  /**
   * 提取页面主要内容
   */
  private extractMainContent(): string {
    // 移除不需要的元素
    const elementsToRemove = [
      'script',
      'style',
      'iframe',
      'nav',
      'header',
      'footer',
      'noscript'
    ];

    // 创建页面副本进行处理
    const contentContainer = document.body.cloneNode(true) as HTMLElement;

    // 移除不需要的元素
    elementsToRemove.forEach(tag => {
      const elements = contentContainer.getElementsByTagName(tag);
      while (elements.length > 0) {
        elements[0].parentNode?.removeChild(elements[0]);
      }
    });

    // 尝试找到主要内容区域
    const mainContent = contentContainer.querySelector('main, article, #content, .content, .main, [role="main"]');
    if (mainContent) {
      return this.cleanText(mainContent.textContent || '');
    }

    // 如果找不到主要内容区域，返回清理后的全部文本
    return this.cleanText(contentContainer.textContent || '');
  }

  /**
   * 清理文本内容
   */
  private cleanText(text: string): string {
    return text
      .replace(/[\n\r]+/g, '\n') // 合并多个换行
      .replace(/\s+/g, ' ') // 合并多个空格
      .replace(/^\s+|\s+$/g, '') // 移除首尾空格
      .trim();
  }

  /**
   * 获取页面可见区域的截图
   */
  public async captureVisiblePage(): Promise<string | null> {
    try {
      // 使用 chrome.tabs.captureVisibleTab API 获取截图
      const tab = await this.getCurrentTab();
      if (!tab?.id) return null;

      return new Promise((resolve) => {
        chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }, (dataUrl) => {
          resolve(dataUrl || null);
        });
      });
    } catch (error) {
      console.error('截图失败:', error);
      return null;
    }
  }

  /**
   * 获取当前标签页
   */
  private async getCurrentTab(): Promise<chrome.tabs.Tab | undefined> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  }
}

export const pageService = PageService.getInstance(); 