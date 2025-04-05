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
            function findMainContent(): Element {
              // 定义返回结果接口
              interface MainContentResult {
                element: Element;
                confidence: number; // 置信度，0-1之间
                score?: number; // 原始评分，用于调试
                debugInfo?: string;
                textLength: number; // 文本内容长度
              }

              // 最小有效内容长度 - 小于此长度将回退到其他候选
              const MIN_CONTENT_LENGTH = 100;

              // 记录每种策略的识别结果
              let recognitionResults: MainContentResult[] = [];

              // 1. 特定框架/平台的自定义识别逻辑
              function trySpecificPlatforms(): MainContentResult | null {
                // 飞书文档特殊处理
                if (document.querySelector('.bear-web-x-container, .docx-page-block, .page-block-content')) {
                  // 飞书文档的主体内容通常在这些容器中
                  const feishuContent = document.querySelector('.page-main-item.editor, .page-block-children');
                  if (feishuContent) {
                    const textLength = feishuContent.textContent?.trim().length || 0;
                    console.debug('Found Feishu document content');
                    return {
                      element: feishuContent,
                      confidence: 0.95,
                      debugInfo: 'Found Feishu document content',
                      textLength,
                      score: 190
                    };
                  }
                }

                // Radix UI 文档特殊处理
                if (document.querySelector('[class*="radix"]') || document.location.href.includes('radix-ui.com')) {
                  // Radix UI 文档通常在main内容区域
                  const radixContent = document.querySelector('main[class*="content"], [class*="docs-content"], [id*="content"]');
                  if (radixContent) {
                    const textLength = radixContent.textContent?.trim().length || 0;
                    return {
                      element: radixContent,
                      confidence: 0.9,
                      debugInfo: 'Found Radix UI documentation content',
                      textLength,
                      score: 180
                    };
                  }
                }

                // MDN 或技术文档类网站特殊处理
                if (document.querySelector('[class*="article"], [class*="documentation"], [class*="docs-"]')) {
                  const docContent = document.querySelector('[class*="article-content"], [class*="doc-content"], main[class*="content"]');
                  if (docContent) {
                    const textLength = docContent.textContent?.trim().length || 0;
                    return {
                      element: docContent,
                      confidence: 0.85,
                      debugInfo: 'Found technical documentation content',
                      textLength,
                      score: 170
                    };
                  }
                }

                return null;
              }

              // 先尝试使用语义化标签快速匹配
              function trySemanticElements(): MainContentResult | null {
                function evaluateSemanticCandidate(element: Element | null, baseConfidence: number, debugMsg: string): MainContentResult | null {
                  if (!element) return null;

                  // 检查内容长度
                  const textLength = element.textContent?.trim().length || 0;
                  // 如果内容太短，降低可信度
                  const confidence = textLength < MIN_CONTENT_LENGTH ? baseConfidence * 0.7 : baseConfidence;

                  return {
                    element,
                    confidence,
                    debugInfo: debugMsg,
                    textLength,
                    score: baseConfidence * 100
                  };
                }

                // 优先检查<main>标签，通常更可靠
                const main = contentContainer.querySelector('main');
                const mainResult = evaluateSemanticCandidate(main, 0.95, 'Found semantic main element');
                if (mainResult && mainResult.textLength >= MIN_CONTENT_LENGTH) {
                  console.debug('Found semantic main element with good content length');
                  return mainResult;
                }

                // 检查<article>标签
                const article = contentContainer.querySelector('article');
                const articleResult = evaluateSemanticCandidate(article, 0.9, 'Found article element');
                if (articleResult && articleResult.textLength >= MIN_CONTENT_LENGTH) {
                  console.debug('Found semantic article element with good content length');
                  return articleResult;
                }

                // 检查[role="main"]
                const roleMain = contentContainer.querySelector('[role="main"]');
                const roleMainResult = evaluateSemanticCandidate(roleMain, 0.85, 'Found [role="main"] element');
                if (roleMainResult && roleMainResult.textLength >= MIN_CONTENT_LENGTH) {
                  return roleMainResult;
                }

                // 检查其他高置信度语义元素
                const roleArticle = contentContainer.querySelector('[role="article"]');
                const roleArticleResult = evaluateSemanticCandidate(roleArticle, 0.85, 'Found [role="article"] element');
                if (roleArticleResult && roleArticleResult.textLength >= MIN_CONTENT_LENGTH) {
                  return roleArticleResult;
                }

                // 文档相关高置信度语义元素
                const roleDocument = contentContainer.querySelector('[role="document"]');
                const roleDocResult = evaluateSemanticCandidate(roleDocument, 0.8, 'Found [role="document"] element');
                if (roleDocResult && roleDocResult.textLength >= MIN_CONTENT_LENGTH) {
                  return roleDocResult;
                }

                // 对于没有达到最小长度的结果，返回最长的一个
                const candidates = [mainResult, articleResult, roleMainResult, roleArticleResult, roleDocResult]
                  .filter(Boolean) as MainContentResult[];

                if (candidates.length > 0) {
                  candidates.sort((a, b) => b.textLength - a.textLength);
                  return candidates[0];
                }

                return null;
              }

              // 初步区域选择器（仅作为候选元素来源，实际内容质量仍需评分）
              const candidateSelectors = [
                // 语义化标签
                'article', 'main', 'section',
                '[role="main"]', '[role="article"]', '[role="document"]', '[role="contentinfo"]',

                // 常见 ID
                '#main', '#main-content', '#mainContent', '#article', '#post', '#post-content', '#content',
                '#documentation', '#docs-content', '#api-reference',

                // 技术文档与API区域
                '.docs-content', '.markdown-body', '.documentation-content', '.api-content', '.api-docs',
                '.api-reference', '.docs-section', '.main-content'
              ];

              // 排除选择器
              const excludeSelectors = [
                'header', 'footer', 'nav', 'aside', '.sidebar', '.comment', '.comments', '.ad', '.advertisement',
                '.banner', '#header', '#footer', '#sidebar', '#comments', '#navigation',
                '[class*="sidebar"]', '[class*="advert"]', '[id*="advert"]', '[role*="navigation"]',
                '[role*="banner"]', '[class*="nav-"]', '[class*="-nav"]', '[class*="menu"]',
                '[class*="social"]', '[class*="related"]', '[class*="widget"]', '[class*="toolbar"]',
                'form', '.search', '#search', '[class*="search"]'
              ];

              // 检查元素是否在排除列表中
              function isExcludedElement(element: Element): boolean {
                // 如果元素是隐藏的，排除
                const style = window.getComputedStyle(element);
                if (style && (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0')) {
                  return true;
                }

                // 基于选择器排除
                return excludeSelectors.some(selector => {
                  try {
                    return element.matches(selector);
                  } catch (e) {
                    return false;
                  }
                });
              }

              // 评分函数：根据元素的特征计算得分
              function scoreElement(element: Element): number {
                if (isExcludedElement(element)) {
                  return 0;
                }

                let score = 0;

                // 1. 内容长度评分
                const textLength = element.textContent?.trim().length || 0;
                score += Math.min(textLength / 100, 50); // 最高 50 分

                // 对于特别短的内容，直接降低分数
                if (textLength < MIN_CONTENT_LENGTH) {
                  score *= 0.5;
                }

                // 2. 段落密度评分
                const paragraphs = element.getElementsByTagName('p').length;
                score += Math.min(paragraphs * 2, 30); // 最高 30 分

                // 3. 标题评分（技术文档通常有更多的标题）
                const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
                score += Math.min(headings * 8, 40); // 提高标题权重，最高 40 分

                // 对于文档页面，标题层次结构是强信号
                if (headings >= 2 && element.querySelector('h1, h2') && element.querySelector('h3, h4, h5, h6')) {
                  score += 15; // 有完整标题层次加分
                }

                // 4. 代码块评分（技术文档特有）
                const codeBlocks = element.querySelectorAll('pre, code, [class*="code"], [class*="language-"]').length;
                score += Math.min(codeBlocks * 10, 30); // 代码块高权重，最高 30 分

                // 针对API文档的特殊处理
                const apiElements = element.querySelectorAll('[class*="api"], [id*="api"], [class*="reference"], [id*="reference"]').length;
                if (apiElements > 0) {
                  score += 20; // API文档专用加分
                }

                // 5. 图片评分
                const images = element.getElementsByTagName('img').length;
                score += Math.min(images * 3, 15); // 最高 15 分

                // 6. API 文档特征评分 - 加强表格权重
                const tables = element.getElementsByTagName('table').length;
                score += Math.min(tables * 15, 30); // API 文档通常包含表格，提高到最高 30 分

                // 检测表格的复杂度（多行多列的表格更可能是内容）
                if (tables > 0) {
                  const tableRows = element.querySelectorAll('tr').length;
                  const tableCells = element.querySelectorAll('td, th').length;
                  if (tableRows > 3 && tableCells > 10) {
                    score += 15; // 复杂表格加分
                  }
                }

                // 7. 链接密度评分
                const links = element.getElementsByTagName('a').length;
                const linkDensity = links / Math.max(textLength, 1);
                // 对于文档页面，适当链接是必要的，只惩罚特别高的链接密度
                if (linkDensity > 0.4) {
                  score -= 15;
                }

                // 8. 特定标签加分
                if (element.tagName === 'ARTICLE') score += 30;
                if (element.tagName === 'MAIN') score += 25;
                if (element.tagName === 'SECTION') score += 15;
                if (element.getAttribute('role') === 'main') score += 25;
                if (element.getAttribute('role') === 'document') score += 25;
                if (element.getAttribute('role') === 'article') score += 25;

                // 9. 嵌套深度惩罚（降低权重，因为文档可能有较深的嵌套）
                let depth = 0;
                let parent = element.parentElement;
                while (parent) {
                  depth++;
                  parent = parent.parentElement;
                }
                score -= depth * 1.5; // 降低嵌套深度的惩罚

                // 10. 列表评分 - 文档页面通常有更多列表
                const lists = element.querySelectorAll('ul, ol').length;
                score += Math.min(lists * 5, 15);

                // 检查列表的复杂度
                if (lists > 0) {
                  const listItems = element.querySelectorAll('li').length;
                  if (listItems > 8) {
                    score += 10; // 复杂列表加分
                  }
                }

                // 11. 正文内容结构评分
                const hasIntroduction = !!element.textContent?.match(/introduction|overview|getting started|简介|概述|入门/i);
                if (hasIntroduction) {
                  score += 15; // 包含介绍性文本
                }

                // 12. 针对API文档的关键字检测
                const hasApiKeywords = !!element.textContent?.match(/api|reference|props|parameters|arguments|methods|functions|attributes|options|configuration|interface|类型|参数|方法|属性|配置|接口/i);
                if (hasApiKeywords) {
                  score += 20;
                }

                // 13. 文本到代码的比例 - 技术文档往往有更多代码示例
                const textNodes = countTextNodes(element);
                const codeElements = element.querySelectorAll('code, pre').length;
                if (textNodes > 0 && codeElements > 0) {
                  const codeRatio = codeElements / textNodes;
                  if (codeRatio > 0.05 && codeRatio < 0.5) {
                    // 适当的代码/文本比例对于技术文档是好的信号
                    score += 15;
                  }
                }

                // 14. 类名/ID包含文档相关关键词
                const className = (element.className || '').toLowerCase();
                const id = (element.id || '').toLowerCase();
                if (
                  className.includes('content') ||
                  className.includes('main') ||
                  className.includes('article') ||
                  className.includes('post') ||
                  className.includes('doc') ||
                  id.includes('content') ||
                  id.includes('main') ||
                  id.includes('article') ||
                  id.includes('post') ||
                  id.includes('doc')
                ) {
                  score += 10;
                }

                // 确保分数在有效范围内
                return Math.max(0, score);
              }

              // 计算元素中的文本节点数量
              function countTextNodes(element: Element): number {
                let count = 0;
                const walker = document.createTreeWalker(
                  element,
                  NodeFilter.SHOW_TEXT,
                  {
                    acceptNode: function(node) {
                      return node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                    }
                  }
                );

                while (walker.nextNode()) {
                  count++;
                }

                return count;
              }

              // 构建内容元素的完整通用评估
              function evaluateContent(element: Element): MainContentResult {
                const score = scoreElement(element);
                const textLength = element.textContent?.trim().length || 0;

                return {
                  element,
                  score,
                  confidence: score / 200, // 归一化到0-1范围
                  textLength,
                  debugInfo: `Score: ${score}, TextLength: ${textLength}`
                };
              }

              // 1. 尝试特定平台识别
              const platformResult = trySpecificPlatforms();
              if (platformResult) {
                recognitionResults.push(platformResult);
              }

              // 2. 尝试语义化标签快速匹配
              const semanticResult = trySemanticElements();
              if (semanticResult) {
                recognitionResults.push(semanticResult);
              }

              // 3. 获取所有候选元素
              let candidates: Element[] = [];

              // 先使用候选选择器获取元素
              candidateSelectors.forEach(selector => {
                try {
                const elements = contentContainer.querySelectorAll(selector);
                elements.forEach(element => {
                    if (!candidates.includes(element) && !isExcludedElement(element)) {
                    candidates.push(element);
                  }
                });
                } catch (e) {
                  // 忽略无效选择器
                }
              });

              // 获取所有内容区块作为候选
              if (candidates.length === 0 || !candidates.some(el => (el.textContent?.trim().length || 0) >= MIN_CONTENT_LENGTH)) {
                // 如果没有候选元素或没有足够长的内容，尝试更广泛的元素
                const contentBlocks = contentContainer.querySelectorAll('div, section, article, main');
                contentBlocks.forEach(block => {
                  if (!candidates.includes(block) && !isExcludedElement(block)) {
                    candidates.push(block);
                  }
                });
              }

              // 4. 为每个候选元素评分
              const scoredCandidates = candidates.map(element => evaluateContent(element));

              // 添加之前获得的结果到评分列表
              recognitionResults = [...recognitionResults, ...scoredCandidates];

              // 5. 按分数和内容长度综合排序
              recognitionResults.sort((a, b) => {
                // 如果分数差异显著，优先选择高分
                if (Math.abs((b.score ?? 0) - (a.score ?? 0)) > 50) {
                  return (b.score ?? 0) - (a.score ?? 0);
                }
                // 否则，在分数相近时优先考虑内容长度
                return b.textLength - a.textLength;
              });

              // 调试输出
              console.debug('Main content candidates with scores:',
                recognitionResults.slice(0, 5).map(c => ({
                  selector: getElementSelector(c.element),
                  score: c.score,
                  confidence: c.confidence,
                  textLength: c.textLength
                }))
              );

              // 如果没有候选元素，回退到整个页面
              if (recognitionResults.length === 0) {
                console.debug('No content candidates found, using entire document');
                return contentContainer;
              }

              // 如果最高分内容太短，尝试寻找更长的内容
              const topCandidate = recognitionResults[0];
              if (topCandidate && topCandidate.textLength < MIN_CONTENT_LENGTH * 3) {
                // 查找分数不是特别低但内容更长的候选
                const betterLengthCandidate = recognitionResults.find(c =>
                  c.textLength > topCandidate.textLength * 2 && (c.score ?? 0) > (topCandidate.score ?? 0) * 0.7
                );

                if (betterLengthCandidate) {
                  console.debug('Found better length candidate:', getElementSelector(betterLengthCandidate.element));
                  return betterLengthCandidate.element;
                }
              }

              // 如果找到的最佳候选仍然内容太少，回退到整个页面
              if (topCandidate.textLength < MIN_CONTENT_LENGTH) {
                console.debug('Best candidate content too short, using entire document');
                return contentContainer;
              }

              // 返回得分最高的元素
              return topCandidate.element;
            }

            // 获取元素的唯一选择器（用于调试）
            function getElementSelector(element: Element): string {
              const path: string[] = [];
              let current = element;

              while (current && current !== document.body) {
                let selector = current.tagName.toLowerCase();
                if (current.id) {
                  selector += '#' + current.id;
                } else if (current.className) {
                  // 只取第一个类名，避免太长
                  const className = Array.from(current.classList)[0];
                  if (className) {
                    selector += '.' + className;
                  }
                }
                path.unshift(selector);
                current = current.parentElement as Element;
                // 限制路径长度，只保留最近的3个元素
                if (path.length >= 3) break;
              }

              return path.join(' > ');
            }

            const mainContent = findMainContent();
            console.debug(mainContent ? `Found main content: ${getElementSelector(mainContent)}` : 'Main content not found');
            const targetElement = mainContent || contentContainer;
            // 转换为 Markdown
            function convertToMarkdown(element: Element, isInline: boolean = false): string {
              // 检查元素是否为内联元素
              const isInlineElement = (el: Element): boolean => {
                const inlineElements = [
                  'SPAN', 'STRONG', 'EM', 'B', 'I', 'CODE',
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
                    const text = child.textContent || '';
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
                      let language = element.getAttribute('data-language') || '';

                      // 获取所有代码行
                      const codeLineElements = element.querySelectorAll('[data-type="code-line"]');

                      // 检查是否存在行号容器
                      const gutterElements = element.querySelectorAll(
                        '.gutter, .line-numbers, [data-line-number], [class*="linenumber"], [class*="line-number"], [class*="gutter"]'
                      );

                      if (codeLineElements.length > 0) {
                        codeLineElements.forEach(line => {
                          // 排除行号和其他非代码内容
                          Array.from(line.childNodes).forEach(child => {
                            if (child instanceof Element) {
                              // 只处理不是行号的内容
                              if ((!child.hasAttribute('contenteditable') || child.getAttribute('contenteditable') !== 'false') &&
                                  !child.classList.contains('gutter') &&
                                  !child.classList.contains('line-number') &&
                                  !child.classList.contains('line-numbers')) {
                                codeBlockContent += child.textContent?.trim() || '';
                              }
                            } else if (child.nodeType === Node.TEXT_NODE) {
                              codeBlockContent += child.textContent?.trim() || '';
                            }
                          });
                          codeBlockContent += '\n';
                        });
                      } else if (gutterElements.length > 0) {
                        // 如果发现行号元素但没有明确的代码行元素，创建一个副本并移除行号元素
                        const tempContainer = element.cloneNode(true) as HTMLElement;
                        Array.from(gutterElements).forEach(gutter => {
                          const matchingElement = tempContainer.querySelector(`${gutter.tagName}${gutter.className ? '.' + gutter.className.split(' ').join('.') : ''}`);
                          if (matchingElement && matchingElement.parentNode) {
                            matchingElement.parentNode.removeChild(matchingElement);
                          }
                        });
                        codeBlockContent = tempContainer.textContent?.trim() || '';
                      } else {
                        // 回退到简单处理
                        codeBlockContent = element.textContent?.trim() || '';
                      }

                      // 尝试从类名或属性推断语言
                      if (!language) {
                        const className = element.className;
                        if (className) {
                          const langMatch = className.match(/(?:lang|language|highlight)-([a-zA-Z0-9]+)/);
                          if (langMatch && langMatch[1]) {
                            language = langMatch[1];
                          }
                        }
                      }

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

              // 处理 BR 元素
              if (element.tagName === 'BR') {
                return isInline ? '\n' : '\n\n';
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
                // 检查是否有语法高亮容器
                const codeElement = element.querySelector('code');

                // 排除可能的行号（gutter）元素
                const gutterSelectors = [
                  '.gutter',
                  '.line-numbers',
                  '.line-number',
                  '.hljs-ln-numbers',
                  '[data-line-number]',
                  '[class*="linenumber"]',
                  '[class*="line-number"]',
                  '[class*="gutter"]'
                ];

                if (codeElement) {
                  // 如果找到code元素，优先使用它的内容
                  const code = codeElement.textContent?.trim() || '';

                  // 尝试确定语言
                  let language = '';
                  const codeClass = codeElement.className;

                  // 检测常见的语法高亮命名模式
                  if (codeClass) {
                    const langMatch = codeClass.match(/(?:lang|language|highlight)-([a-zA-Z0-9]+)/);
                    if (langMatch && langMatch[1]) {
                      language = langMatch[1];
                    }
                  }

                  return '```' + language + '\n' + code + '\n```\n\n';
                } else {
                  // 否则使用pre的内容，但排除gutter元素
                  let codeContent = '';

                  // 移除行号容器元素
                  const gutterElements = gutterSelectors.flatMap(selector =>
                    Array.from(element.querySelectorAll(selector))
                  );

                  if (gutterElements.length > 0) {
                    // 如果找到gutter元素，创建临时副本并移除它们
                    const tempContainer = element.cloneNode(true) as HTMLElement;
                    gutterElements.forEach(gutter => {
                      const matchingElement = tempContainer.querySelector(`${gutter.tagName}${gutter.className ? '.' + gutter.className.split(' ').join('.') : ''}`);
                      if (matchingElement && matchingElement.parentNode) {
                        matchingElement.parentNode.removeChild(matchingElement);
                      }
                    });
                    codeContent = tempContainer.textContent?.trim() || '';
                  } else {
                    codeContent = element.textContent?.trim() || '';
                  }

                  return '```\n' + codeContent + '\n```\n\n';
                }
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
                // 检查是否是单行表格或是代码显示表格（包含gutter和code区域）
                const rows = element.querySelectorAll('tr');
                const hasGutter = element.querySelector('.gutter, [class*="gutter"]');
                const hasCode = element.querySelector('.code, [class*="code"]');

                // 忽略表格中的布局辅助元素
                const ignoreSelectors = [
                  '.gutter',
                  '.line-numbers',
                  '[data-role="gutter"]',
                  '[class*="gutter"]',
                  '[class*="helper"]',
                  '[class*="decoration"]'
                ];

                const shouldSkipCell = (cell: Element) => {
                  return ignoreSelectors.some(selector => {
                    try {
                      return cell.matches(selector);
                    } catch (e) {
                      return false;
                    }
                  });
                };

                // 如果是只有一行的表格或包含gutter和code的特殊代码块表格，不作为表格处理
                if (rows.length <= 1 || (hasGutter && hasCode)) {
                  // 寻找代码内容
                  if (hasGutter && hasCode) {
                    // 这可能是代码块的特殊表格结构
                    const codeElement = element.querySelector('.code, [class*="code"]');
                    if (codeElement) {
                      // 尝试提取语言
                      let language = '';
                      const codeClass = codeElement.className;
                      if (codeClass) {
                        const langMatch = codeClass.match(/(?:lang|language|highlight)-([a-zA-Z0-9]+)/);
                        if (langMatch && langMatch[1]) {
                          language = langMatch[1];
                        }
                      }

                      const codeContent = codeElement.textContent?.trim() || '';
                      return '```' + language + '\n' + codeContent + '\n```\n\n';
                    }
                  }

                  // 作为普通内容处理
                  return processBlockContent(element);
                }

                // 正常表格处理逻辑
                let tableMarkdown = '';

                // 处理表头
                const headerRow = rows[0];
                if (headerRow) {
                  const headerCells = Array.from(headerRow.querySelectorAll('th'))
                    .filter(cell => !shouldSkipCell(cell))
                    .map(th => processInlineContent(th));

                  if (headerCells.length > 0) {
                    tableMarkdown += '| ' + headerCells.join(' | ') + ' |\n';
                    tableMarkdown += '| ' + headerCells.map(() => '---').join(' | ') + ' |\n';
                  }
                }

                // 处理表格内容
                for (let i = headerRow && headerRow.querySelectorAll('th').length > 0 ? 1 : 0; i < rows.length; i++) {
                  const row = rows[i];
                  // 跳过可能的布局行
                  if (shouldSkipCell(row)) continue;

                  const cells = Array.from(row.querySelectorAll('td'))
                    .filter(cell => !shouldSkipCell(cell))
                    .map(td => processInlineContent(td));

                  if (cells.length > 0) {
                    tableMarkdown += '| ' + cells.join(' | ') + ' |\n';
                  }
                }

                return tableMarkdown + '\n';
              }

              // 处理其他块级元素
              return processBlockContent(element);
            }

            const markdown = convertToMarkdown(targetElement)
              .replace(/\n{3,}/g, '\n\n') // 合并多个换行
              .replace(/[ \t]+/g, ' ') // 合并多个空格
              .replace(/\n\s*\n/g, '\n\n') // 处理多个空行（可能包含空格的行）
              .replace(/(\n\s*){3,}/g, '\n\n') // 确保不会有超过两个连续的换行
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

      console.debug(results)

      return results[0].result as PageContent;
    } catch (error) {
      console.error('读取页面失败:', error);
      throw error;
    }
  }

  /**
   * 获取页面可见区域的截图
   */
  public async captureVisiblePage(): Promise<string | null> {
    try {
      // 获取当前活动窗口的标签页
      const tab = await this.getCurrentTab();
      if (!tab?.id) {
        console.error('无法获取当前标签页');
        return null;
      }

      // 使用 Promise 封装截图方法
      return new Promise<string | null>((resolve) => {
        chrome.tabs.captureVisibleTab(
          tab.windowId,
          { format: 'png', quality: 100 },
          (dataUrl) => {
            if (chrome.runtime.lastError) {
              console.error('截图失败:', chrome.runtime.lastError.message);
              resolve(null);
              return;
            }
          resolve(dataUrl || null);
          }
        );
      });
    } catch (error) {
      console.error('截图过程发生错误:', error);
      return null;
    }
  }

  /**
   * 获取当前标签页
   */
  private async getCurrentTab(): Promise<chrome.tabs.Tab | undefined> {
    try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
    } catch (error) {
      console.error('获取当前标签页失败:', error);
      return undefined;
    }
  }
}

export const pageService = PageService.getInstance();