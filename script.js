// 初始化 Mermaid
mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    flowchart: { useMaxWidth: true }
});

// 配置 marked 支持扩展语法
const renderer = new marked.Renderer();

// 自定义图片渲染
renderer.image = (href, title, text) => {
    // 处理相对路径图片
    if (href && !href.startsWith('http') && !href.startsWith('data:')) {
        href = `./docs/${href}`;
    }
    
    let imgHtml = `<img src="${href}" alt="${text || ''}" class="markdown-image"`;
    if (title) {
        imgHtml += ` title="${title}"`;
    }
    imgHtml += '>';
    
    if (text) {
        imgHtml += `<div class="image-caption">${text}</div>`;
    }
    
    return imgHtml;
};

// 自定义链接渲染
renderer.link = (href, title, text) => {
    // 处理相对路径链接
    if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:')) {
        href = `./docs/${href}`;
    }
    
    let linkHtml = `<a href="${href}"`;
    if (title) {
        linkHtml += ` title="${title}"`;
    }
    linkHtml += `>${text}</a>`;
    
    return linkHtml;
};

// 配置 marked 选项
marked.setOptions({
    highlight: function(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
    },
    langPrefix: 'hljs language-',
    breaks: true,
    gfm: true, // 启用 GitHub Flavored Markdown
    tables: true, // 支持表格
    pedantic: false,
    sanitize: false,
    smartLists: true, // 智能列表
    smartypants: true, // 智能标点
    xhtml: false,
    renderer: renderer
});

// 获取文件列表
async function fetchFileList() {
    try {
        const response = await fetch('./docs/markdown_list.json');
        if (!response.ok) {
            throw new Error('无法加载文件列表');
        }
        return await response.json();
    } catch (error) {
        console.error('加载文件列表失败:', error);
        document.getElementById('file-list-container').innerHTML = 
            '<p class="text-danger">加载文件列表失败，请刷新重试</p>';
        return [];
    }
}

// 获取Markdown文件内容
async function fetchMarkdownContent(path) {
    try {
        const response = await fetch(`./docs/${path}`);
        if (!response.ok) {
            throw new Error('无法加载文件内容');
        }
        let content = await response.text();
        
        // 去除Frontmatter部分
        const frontmatterPattern = /^---\s*\n(.*?)\n---\s*\n(.*)$/s;
        const match = content.match(frontmatterPattern);
        if (match) {
            content = match[2]; // 只保留Frontmatter之后的内容
        }
        
        return content;
    } catch (error) {
        console.error('加载文件内容失败:', error);
        return `# 加载失败\n\n无法加载文件内容: ${error.message}`;
    }
}

// 渲染数学公式
function renderMath() {
    const mathElements = document.querySelectorAll('.math');
    mathElements.forEach(el => {
        const tex = el.textContent;
        try {
            katex.render(tex, el, {
                throwOnError: false,
                displayMode: el.classList.contains('display-math')
            });
        } catch (e) {
            console.error('KaTeX渲染错误:', e);
            el.innerHTML = `<span class="text-danger">公式渲染错误: ${e.message}</span>`;
        }
    });
}

// 渲染Mermaid图表
async function renderMermaid() {
    const mermaidElements = document.querySelectorAll('.mermaid');
    if (mermaidElements.length > 0) {
        try {
            await mermaid.run({
                nodes: mermaidElements,
                suppressErrors: true
            });
        } catch (e) {
            console.error('Mermaid渲染错误:', e);
        }
    }
}

// 初始化图片查看器
function initImageViewer() {
    const images = document.querySelectorAll('.markdown-image');
    if (images.length > 0) {
        const gallery = new Viewer(Array.from(images), {
            navbar: false,
            title: false,
            toolbar: {
                zoomIn: 1,
                zoomOut: 1,
                oneToOne: 1,
                reset: 1,
                prev: 1,
                play: 0,
                next: 1,
                rotateLeft: 1,
                rotateRight: 1,
                flipHorizontal: 1,
                flipVertical: 1,
            }
        });
    }
}

// 在 renderFileList 函数上方添加搜索函数
function filterFiles(filesData, searchTerm) {
    if (!searchTerm) return filesData;
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    return filesData.filter(file => {
        // 搜索标题
        const titleMatch = file.frontmatter.title.toLowerCase().includes(lowerSearchTerm);
        
        // 搜索标签
        const tagsMatch = file.frontmatter.tags.some(tag => 
            tag.toLowerCase().includes(lowerSearchTerm)
        );
        
        // 搜索日期
        const dateMatch = file.frontmatter.date.toLowerCase().includes(lowerSearchTerm);
        
        return titleMatch || tagsMatch || dateMatch;
    });
}

function renderFilteredList(filesData, searchTerm) {
    const container = document.getElementById('file-list-container');
    const filteredFiles = filterFiles(filesData, searchTerm);
    
    if (filteredFiles.length === 0) {
        container.innerHTML = '<p class="text-muted">没有找到匹配的文件</p>';
        return;
    }
    
    container.innerHTML = '';
    
    filteredFiles.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <strong>${file.frontmatter.title}</strong>
                <span class="file-date">${file.frontmatter.date}</span>
            </div>
            <div class="mt-2">
                ${file.frontmatter.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
        `;
        
        fileItem.addEventListener('click', async () => {
            document.querySelectorAll('.file-item').forEach(item => {
                item.classList.remove('active');
            });
            fileItem.classList.add('active');
            
            const contentContainer = document.getElementById('file-content-container');
            contentContainer.innerHTML = '<p class="loading">加载中...</p>';
            
            const content = await fetchMarkdownContent(file.path);
            const dirty = marked.parse(content);
            const clean = DOMPurify.sanitize(dirty, {
                ADD_ATTR: ['target']
            });
            contentContainer.innerHTML = clean;
            
            renderMath();
            renderMermaid();
            initImageViewer();
        });
        
        container.appendChild(fileItem);
    });
    
    // 默认选中第一个文件（仅在初始加载时）
    if (searchTerm === '' && filteredFiles.length > 0) {
        container.firstChild.click();
    }
}

// 修改 renderFileList 函数
async function renderFileList() {
    const filesData = await fetchFileList();
    const container = document.getElementById('file-list-container');
    
    if (filesData.length === 0) {
        container.innerHTML = '<p class="text-muted">没有可用的文件</p>';
        return;
    }
    
    // 添加搜索输入事件监听
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', () => {
        renderFilteredList(filesData, searchInput.value);
    });
    
    // 初始渲染
    renderFilteredList(filesData, '');
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    renderFileList();
    
    // 配置KaTeX自动渲染
    document.addEventListener('DOMContentLoaded', function() {
        renderMathElements();
    });
    
    function renderMathElements() {
        renderMath();
    }
});