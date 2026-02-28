#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const hljs = require('highlight.js');

// 配置marked
marked.setOptions({
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  }
});

// 生成HTML
function generateHTML(sections, title = '朋友圈') {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #f5f7fa;
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 100%;
            margin: 0;
            padding: 0;
        }
        
        .moment-card {
            background: white;
            border-radius: 0;
            padding: 24px 32px;
            margin-bottom: 1px;
            box-shadow: none;
            border-bottom: 1px solid #e5e7eb;
            width: 100%;
            text-align: left;
        }
        
        .moment-card:first-child {
            border-top: 1px solid #e5e7eb;
        }
        
        .moment-header {
            display: flex;
            align-items: center;
            margin-bottom: 16px;
            width: 100%;
        }
        
        .moment-date {
            color: #6b7280;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .moment-date-icon {
            color: #9ca3af;
        }
        
        .moment-time-badge {
            color: #9ca3af;
            font-size: 13px;
            background: #f3f4f6;
            padding: 2px 8px;
            border-radius: 4px;
        }
        
        .moment-title {
            font-size: 18px;
            font-weight: 600;
            color: #2563eb;
            margin-bottom: 12px;
            text-align: left;
            width: 100%;
        }
        
        .moment-content {
            color: #1f2937;
            line-height: 1.8;
            font-size: 15px;
            text-align: left;
            width: 100%;
        }
        
        .moment-content p {
            margin-bottom: 16px;
            text-align: left;
        }
        
        .moment-content img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            margin: 16px 0;
            display: block;
        }
        
        .moment-content blockquote {
            background: #f9fafb;
            border-left: 4px solid #2563eb;
            padding: 12px 20px;
            margin: 16px 0;
            border-radius: 0 4px 4px 0;
            color: #4b5563;
            font-style: italic;
            text-align: left;
        }
        
        .moment-content pre {
            background: #1f2937;
            color: #f3f4f6;
            padding: 16px;
            border-radius: 8px;
            overflow-x: auto;
            font-size: 14px;
            margin: 16px 0;
            text-align: left;
        }
        
        .moment-content code {
            font-family: 'SF Mono', Monaco, 'Roboto Mono', monospace;
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 14px;
            color: #2563eb;
        }
        
        .moment-content pre code {
            background: none;
            color: inherit;
            padding: 0;
        }
        
        .moment-content a {
            color: #2563eb;
            text-decoration: none;
        }
        
        .moment-content a:hover {
            text-decoration: underline;
        }
        
        .moment-content ul, 
        .moment-content ol {
            padding-left: 24px;
            margin: 12px 0;
            text-align: left;
        }
        
        .moment-content li {
            margin: 4px 0;
            text-align: left;
        }
        
        .moment-content h1,
        .moment-content h2,
        .moment-content h3,
        .moment-content h4,
        .moment-content h5,
        .moment-content h6 {
            text-align: left;
            margin: 20px 0 12px 0;
        }
        
        .moment-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
            text-align: left;
        }
        
        .moment-content th,
        .moment-content td {
            border: 1px solid #e5e7eb;
            padding: 8px 12px;
            text-align: left;
        }
        
        .moment-content th {
            background: #f9fafb;
            font-weight: 600;
        }
        
        @media (max-width: 640px) {
            body {
                padding: 0;
            }
            
            .moment-card {
                padding: 20px 16px;
            }
            
            .moment-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
            }
        }
        
        /* 让所有块级元素左对齐 */
        div, section, article, main, header, footer {
            text-align: left;
        }
    </style>
</head>
<body>
    <div class="container">
        ${sections.map((section, index) => {
          // 格式化日期显示
          const dateDisplay = section.date ? 
            new Date(section.date).toLocaleDateString('zh-CN', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              weekday: 'long'
            }) : '未知日期';
          
          const timeDisplay = section.time ? 
            section.time : '';
          
          return `
          <div class="moment-card">
              <div class="moment-header">
                  <div class="moment-date">
                      <span class="moment-date-icon">📅</span>
                      <span>${dateDisplay}</span>
                      ${timeDisplay ? `<span class="moment-time-badge">${timeDisplay}</span>` : ''}
                  </div>
              </div>
              
              ${section.title ? `
              <div class="moment-title">
                  📌 ${section.title}
              </div>
              ` : ''}
              
              <div class="moment-content">
                  ${section.content}
              </div>
          </div>
        `}).join('')}
    </div>
</body>
</html>`;
}

// 解析Markdown
function parseMarkdown(content) {
  // 按---分割
  const sections = content.split(/^---$/gm);
  
  return sections.map(section => {
    section = section.trim();
    if (!section) return null;
    
    // 提取标题（###后的内容）
    const titleMatch = section.match(/^###\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : '';
    
    // 提取日期时间（支持多种格式）
    // 格式1: @2026-02-28 20:00
    // 格式2: 2026-02-28 20:00
    // 格式3: 2026-02-28
    const dateTimeMatch = section.match(/@?\s*(\d{4}-\d{1,2}-\d{1,2})(?:\s+(\d{1,2}:\d{2}))?/);
    let date = null;
    let time = null;
    
    if (dateTimeMatch) {
      date = dateTimeMatch[1];
      time = dateTimeMatch[2] || null;
      
      // 补全日期格式
      const dateParts = date.split('-');
      if (dateParts[1].length === 1) dateParts[1] = '0' + dateParts[1];
      if (dateParts[2].length === 1) dateParts[2] = '0' + dateParts[2];
      date = dateParts.join('-');
    }
    
    // 移除标题行
    let contentWithoutTitle = section;
    if (titleMatch) {
      contentWithoutTitle = section.replace(/^###\s+.+$/m, '').trim();
    }
    
    // 移除日期时间行（包括@符号）
    let finalContent = contentWithoutTitle;
    if (dateTimeMatch) {
      // 移除整行包含日期时间的文本
      const dateTimeLineRegex = new RegExp(`^.*@?\\s*${dateTimeMatch[1]}[^\\n]*\\n?`, 'm');
      finalContent = contentWithoutTitle.replace(dateTimeLineRegex, '').trim();
    }
    
    // 如果没找到日期，使用文件修改时间
    if (!date) {
      const stats = fs.statSync(__filename);
      date = stats.mtime.toISOString().split('T')[0];
    }
    
    // 转换Markdown
    const htmlContent = marked.parse(finalContent);
    
    return {
      title,
      content: htmlContent,
      date,
      time
    };
  }).filter(item => item !== null);
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const inputFile = args[0] || path.resolve(__dirname, '../friendzone.md');
  const outputFile = args[1] || path.resolve(__dirname, '../docs/public/daily.html');
  
  console.log('\n🔧 朋友圈转换工具');
  console.log('========================\n');
  
  async function convert() {
    console.log(`📖 读取文件: ${path.relative(process.cwd(), inputFile)}`);
    
    try {
      const content = fs.readFileSync(inputFile, 'utf8');
      
      console.log('🔄 解析Markdown内容...');
      const sections = parseMarkdown(content);
      console.log(`✅ 解析到 ${sections.length} 条动态`);
      
      // 按日期排序（最新的在前）
      sections.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date) - new Date(a.date);
      });
      
      console.log('🎨 生成HTML页面...');
      const html = generateHTML(sections);
      
      // 确保输出目录存在
      const outputDir = path.dirname(outputFile);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      fs.writeFileSync(outputFile, html, 'utf8');
      
      const relativeOutput = path.relative(process.cwd(), outputFile);
      console.log(`✨ 转换完成！已保存到: ${relativeOutput}`);
      
      return true;
    } catch (error) {
      console.error('❌ 转换失败:', error.message);
      return false;
    }
  }
  
  // 执行转换
  await convert();
}

// 如果直接运行脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { convert: main };