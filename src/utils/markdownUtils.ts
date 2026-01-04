/**
 * 检测内容是否为 Markdown 格式
 * @param content 要检测的内容
 * @returns 如果是 Markdown 格式返回 true，否则返回 false
 */
export const isMarkdown = (content: string): boolean => {
  if (!content || typeof content !== 'string') return false;
  
  if (content.trim().startsWith('<')) {
    const markdownPatterns = [
      /^#{1,6}\s/m,
      /^\*\s/m,
      /^-\s/m,
      /^\d+\.\s/m,
      /\[.*\]\(.*\)/m,
      /!\[.*\]\(.*\)/m,
      /```/m,
      /`[^`]+`/m,
      /^\>/m,
      /^\|.*\|/m,
    ];
    return markdownPatterns.some(pattern => pattern.test(content));
  }
  
  const markdownIndicators = [
    /^#{1,6}\s/m,
    /^\*\s/m,
    /^-\s/m,
    /^\d+\.\s/m,
    /\[.*\]\(.*\)/m,
    /!\[.*\]\(.*\)/m,
    /```[\s\S]*```/m,
    /`[^`]+`/m,
    /^\>/m,
    /^\|.*\|/m,
  ];
  
  return markdownIndicators.some(pattern => pattern.test(content));
};

/**
 * 将 Markdown 格式的文本转换为 HTML
 * @param markdown Markdown 格式的文本
 * @returns 转换后的 HTML 字符串
 */
export const markdownToHtml = (markdown: string): string => {
  let html = markdown;
  
  const codeBlocks: string[] = [];
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(`<pre><code>${code}</code></pre>`);
    return placeholder;
  });
  
  const inlineCodes: string[] = [];
  html = html.replace(/`([^`]+)`/g, (match, code) => {
    const placeholder = `__INLINE_CODE_${inlineCodes.length}__`;
    inlineCodes.push(`<code>${code}</code>`);
    return placeholder;
  });
  
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
    const escapedUrl = url.replace(/"/g, '&quot;');
    const escapedAlt = alt.replace(/"/g, '&quot;');
    return `<img src="${escapedUrl}" alt="${escapedAlt}" style="max-width: 100%; height: auto; display: block; margin: 12px 0; border-radius: 6px;" />`;
  });
  
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  inlineCodes.forEach((code, index) => {
    html = html.replace(`__INLINE_CODE_${index}__`, code);
  });
  
  codeBlocks.forEach((code, index) => {
    html = html.replace(`__CODE_BLOCK_${index}__`, code);
  });
  
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  html = html.replace(/(?<!!)\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
  
  html = html.replace(/(?<!\*)\*(?!\*)([^*]+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
  html = html.replace(/(?<!_)_(?!_)([^_]+?)(?<!_)_(?!_)/g, '<em>$1</em>');
  
  html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
  
  // 处理无序列表：先标记列表项
  html = html.replace(/^[\*\-]\s+(.*)$/gim, '__LIST_ITEM__$1__END_LIST_ITEM__');
  
  // 处理有序列表：先标记列表项
  html = html.replace(/^\d+\.\s+(.*)$/gim, '__LIST_ITEM__$1__END_LIST_ITEM__');
  
  // 将连续的列表项标记包裹在 <ul> 中
  html = html.replace(/(__LIST_ITEM__.*?__END_LIST_ITEM__(?:\s*__LIST_ITEM__.*?__END_LIST_ITEM__)*)/g, (match) => {
    const items = match.match(/__LIST_ITEM__(.*?)__END_LIST_ITEM__/g) || [];
    const listItems = items.map(item => {
      const content = item.replace(/__LIST_ITEM__(.*?)__END_LIST_ITEM__/, '$1');
      return `<li>${content}</li>`;
    }).join('');
    return `<ul>${listItems}</ul>`;
  });
  
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br />');
  
  if (!html.trim().match(/^<(ul|ol|blockquote|h[1-3]|pre|p)/)) {
    html = '<p>' + html + '</p>';
  }
  
  return html;
};

