/**
 * 页面内容接口
 */
export interface PageContent {
  url: string;
  title: string;
  content: string;
  markdown: string;
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
      markdown: '',
      metadata
    };
  }

  /**
   * 从浏览器标签页读取当前页面内容
   * 该方法应该在扩展的侧边栏或弹出窗口中调用
   */
  public async readPageFromTab(): Promise<PageContent> {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs || !tabs[0]?.id) {
        throw new Error('无法获取当前标签页');
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          // 此函数在页面上下文中执行
          const url = window.location.href;
          const title = document.title;

          function getMetaContent(name: string): string | undefined {
            const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
            const content = meta?.getAttribute('content');
            return content || undefined;
          }

          // 提取主要内容并转换为 Markdown
          function extractContent(): { content: string; markdown: string } {
            // 移除不需要的元素
            const elementsToRemove = [
              'script', 'style', 'iframe', 'nav', 'header', 'footer', 'noscript',
              'form', 'button', 'input', 'select', 'textarea'
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
            const targetElement = mainContent || contentContainer;

            // 转换为 Markdown
            function convertToMarkdown(element: Element, isInline: boolean = false): string {
              // 检查元素是否为内联元素
              const isInlineElement = (el: Element): boolean => {
                const inlineElements = [
                  'SPAN', 'STRONG', 'EM', 'B', 'I', 'A', 'CODE',
                  'SUB', 'SUP', 'MARK', 'SMALL', 'DEL', 'INS', 'U'
                ];
                return inlineElements.includes(el.tagName);
              };

              // 处理内联元素的文本
              const processInlineContent = (el: Element): string => {
                let text = '';
                Array.from(el.childNodes).forEach(child => {
                  if (child.nodeType === Node.TEXT_NODE) {
                    text += child.textContent?.trim() || '';
                  } else if (child instanceof Element) {
                    text += convertToMarkdown(child, true);
                  }
                });
                return text;
              };

              // 处理块级元素的内联内容
              const processBlockContent = (el: Element): string => {
                let content = '';
                let currentLine = '';

                Array.from(el.childNodes).forEach((child, index, array) => {
                  if (child.nodeType === Node.TEXT_NODE) {
                    const text = child.textContent?.trim() || '';
                    if (text) currentLine += text;
                  } else if (child instanceof Element) {
                    if (isInlineElement(child)) {
                      currentLine += convertToMarkdown(child, true);
                    } else {
                      // 如果当前行有内容，先添加当前行
                      if (currentLine) {
                        content += currentLine + '\n';
                        currentLine = '';
                      }
                      content += convertToMarkdown(child, false);
                    }
                  }

                  // 处理最后一个节点
                  if (index === array.length - 1 && currentLine) {
                    content += currentLine + '\n';
                  }
                });

                return content;
              };

              // 处理标题
              if (element.tagName.match(/^H[1-6]$/) ||
                  (element.tagName === 'DIV' && (
                    element.getAttribute('data-block-type')?.startsWith('heading') ||
                    element.getAttribute('data-type')?.match(/^h[1-6]$/i)
                  ))) {
                let level: number;

                if (element.tagName.match(/^H[1-6]$/)) {
                  // 从标签名获取级别
                  level = parseInt(element.tagName[1]);
                } else {
                  // 从 data-block-type 或 data-type 获取级别
                  const blockType = element.getAttribute('data-block-type');
                  const dataType = element.getAttribute('data-type');

                  if (blockType?.startsWith('heading')) {
                    // heading1 -> 1, heading2 -> 2, 等
                    level = parseInt(blockType.replace('heading', '') || '1');
                  } else if (dataType?.match(/^h[1-6]$/i)) {
                    // h1 -> 1, h2 -> 2, 等
                    level = parseInt(dataType.substring(1));
                  } else {
                    level = 1;
                  }
                }

                const text = processInlineContent(element);
                return '#'.repeat(level) + ' ' + text + '\n\n';
              }

              // 处理段落和 div
              if (element.tagName === 'P' || element.tagName === 'DIV') {
                // 检查是否有特殊的 block type 或 data type
                const blockType = element.getAttribute('data-block-type');
                const dataType = element.getAttribute('data-type');

                if (blockType || dataType) {
                  // 根据不同的 block type 或 data type 处理
                  const type = blockType || dataType;
                  switch (type) {
                    case 'quote':
                      const content = processBlockContent(element)
                        .split('\n')
                        .map(line => line ? '> ' + line : '>')
                        .join('\n');
                      return content + '\n\n';
                    case 'code':
                      // 如果是结构化的代码块
                      let codeBlockContent = '';
                      // 获取所有代码行
                      const codeLineElements = element.querySelectorAll('[data-type="code-line"]');
                      codeLineElements.forEach(line => {
                        // 排除行号和其他非代码内容
                        Array.from(line.childNodes).forEach(child => {
                          if (child instanceof Element) {
                            // 只处理不是行号的内容
                            if (!child.hasAttribute('contenteditable') || child.getAttribute('contenteditable') !== 'false') {
                              codeBlockContent += child.textContent?.trim() || '';
                            }
                          } else if (child.nodeType === Node.TEXT_NODE) {
                            codeBlockContent += child.textContent?.trim() || '';
                          }
                        });
                        codeBlockContent += '\n';
                      });

                      const language = element.getAttribute('data-language') || '';
                      return '```' + language + '\n' + codeBlockContent.trim() + '\n```\n\n';
                    case 'bullet-list':
                    case 'ul':
                      return element.textContent?.split('\n')
                        .filter(line => line.trim())
                        .map(line => '- ' + line.trim())
                        .join('\n') + '\n\n';
                    case 'numbered-list':
                    case 'ol':
                      return element.textContent?.split('\n')
                        .filter(line => line.trim())
                        .map((line, index) => `${index + 1}. ${line.trim()}`)
                        .join('\n') + '\n\n';
                    default:
                      // 如果是未知的类型，按普通段落处理
                      if (isInline) {
                        return processInlineContent(element);
                      }
                      return processBlockContent(element);
                  }
                }

                if (isInline) {
                  return processInlineContent(element);
                }
                return processBlockContent(element);
              }

              // 处理内联元素
              if (isInlineElement(element)) {
                let text = processInlineContent(element);

                // 根据标签添加 Markdown 格式
                if (element.tagName === 'STRONG' || element.tagName === 'B') {
                  text = `**${text}**`;
                } else if (element.tagName === 'EM' || element.tagName === 'I') {
                  text = `*${text}*`;
                } else if (element.tagName === 'CODE') {
                  text = '`' + text + '`';
                } else if (element.tagName === 'DEL') {
                  text = '~~' + text + '~~';
                } else if (element.tagName === 'INS' || element.tagName === 'U') {
                  text = '__' + text + '__';
                }

                return text + (isInline ? '' : '\n');
              }

              // 处理列表
              if (element.tagName === 'UL' || element.tagName === 'OL') {
                let listItems = '';
                element.querySelectorAll('li').forEach((li, index) => {
                  const prefix = element.tagName === 'UL' ? '- ' : `${index + 1}. `;
                  listItems += prefix + processInlineContent(li) + '\n';
                });
                return listItems + '\n';
              }

              // 处理链接
              if (element.tagName === 'A') {
                const href = element.getAttribute('href') || '';
                const text = processInlineContent(element) || href;
                return `[${text}](${href})`;
              }

              // 处理图片
              if (element.tagName === 'IMG') {
                const src = element.getAttribute('src') || '';
                // 忽略 base64 格式的图片
                if (src.startsWith('data:image')) {
                  return '';
                }
                const alt = element.getAttribute('alt') || '';
                return `![${alt}](${src})`;
              }

              // 处理代码块
              if (element.tagName === 'PRE') {
                const code = element.textContent?.trim() || '';
                return '```\n' + code + '\n```\n\n';
              }

              // 处理引用
              if (element.tagName === 'BLOCKQUOTE') {
                const content = processBlockContent(element)
                  .split('\n')
                  .map(line => line ? '> ' + line : '>')
                  .join('\n');
                return content + '\n\n';
              }

              // 处理表格
              if (element.tagName === 'TABLE') {
                let tableMarkdown = '';
                const rows = element.querySelectorAll('tr');

                // 处理表头
                const headers = Array.from(rows[0]?.querySelectorAll('th') || [])
                  .map(th => processInlineContent(th));
                if (headers.length > 0) {
                  tableMarkdown += '| ' + headers.join(' | ') + ' |\n';
                  tableMarkdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
                }

                // 处理表格内容
                Array.from(rows).slice(headers.length > 0 ? 1 : 0).forEach(row => {
                  const cells = Array.from(row.querySelectorAll('td'))
                    .map(td => processInlineContent(td));
                  tableMarkdown += '| ' + cells.join(' | ') + ' |\n';
                });

                return tableMarkdown + '\n';
              }

              // 处理其他块级元素
              return processBlockContent(element);
            }

            const markdown = convertToMarkdown(targetElement)
              .replace(/\n{3,}/g, '\n\n') // 合并多个换行
              .replace(/[ \t]+/g, ' ') // 合并多个空格
              .trim();

            return {
              content: cleanText(targetElement.textContent || ''),
              markdown
            };
          }

          function cleanText(text: string): string {
            return text
              .replace(/[\n\r]+/g, '\n')
              .replace(/\s+/g, ' ')
              .replace(/^\s+|\s+$/g, '')
              .trim();
          }

          const keywords = getMetaContent('keywords');
          const metadata = {
            description: getMetaContent('description'),
            keywords: keywords ? keywords.split(',').map(k => k.trim()) : undefined,
            author: getMetaContent('author'),
            publishedTime: getMetaContent('article:published_time')
          };

          const { content, markdown } = extractContent();

          return {
            url,
            title,
            content,
            markdown,
            metadata
          };
        }
      });

      if (!results || results.length === 0 || !results[0]?.result) {
        throw new Error('获取页面内容失败');
      }

      console.debug(results[0].result)

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