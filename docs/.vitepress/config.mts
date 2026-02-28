// .vitepress/config.mts
import { defineConfig } from 'vitepress'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const postsDir = path.resolve(projectRoot, '')

// 定义博客文章的类型
interface BlogPost {
  title: string
  date: string  // YYYY-MM-DD 格式
  year: string
  month: string
  day: string
  formattedDate: string
  link: string
  excerpt?: string
  tags?: string[]
  author?: string
  cover?: string
}

// 解析Markdown文件，获取Frontmatter
function parseFrontmatter(filePath: string): {
  title: string
  date: string
  year: string
  month: string
  day: string
  excerpt?: string
  tags?: string[]
  author?: string
  cover?: string
  hide?: boolean
} {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const { data } = matter(content)
    
    // 处理日期
    let dateStr: string
    if (data.date) {
      // 如果date是Date对象，转换为YYYY-MM-DD
      if (data.date instanceof Date) {
        const year = data.date.getFullYear()
        const month = String(data.date.getMonth() + 1).padStart(2, '0')
        const day = String(data.date.getDate()).padStart(2, '0')
        dateStr = `${year}-${month}-${day}`
      } else {
        // 如果是字符串，确保格式为YYYY-MM-DD
        dateStr = String(data.date)
      }
    } else {
      // 使用文件创建时间
      const stats = fs.statSync(filePath)
      const date = stats.birthtime
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      dateStr = `${year}-${month}-${day}`
    }
    
    // 提取年月日
    const [year, month, day] = dateStr.split('-')
    
    return {
      title: data.title || path.basename(filePath, '.md'),
      date: dateStr,
      year,
      month,
      day,
      excerpt: data.excerpt || data.description || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      author: data.author || '佚名',
      cover: data.cover || '',
      hide: data.hide || false
    }
  } catch (error) {
    // 出错时使用当前日期
    const now = new Date()
    const year = String(now.getFullYear())
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    return {
      title: path.basename(filePath, '.md'),
      date: dateStr,
      year,
      month,
      day,
      hide: false
    }
  }
}

// 获取所有博客文章并按日期排序
function getAllPosts(): BlogPost[] {
  console.log(`\n=== 获取博客文章 ===`)
  
  if (!fs.existsSync(postsDir)) {
    console.warn(`⚠️ 博客目录不存在: ${postsDir}`)
    return []
  }

  const posts: BlogPost[] = []
  
  // 递归遍历posts目录下的所有.md文件
  function traverseDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      
      if (entry.isDirectory()) {
        // 递归遍历子目录
        traverseDir(fullPath)
      } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'index.md') {
        // 处理Markdown文件
        const { title, date, year, month, day, excerpt, tags, author, cover, hide } = parseFrontmatter(fullPath)
        
        if (hide) {
          console.log(`📄 隐藏文章: ${entry.name}`)
          continue
        }
        
        // 生成文章链接（相对路径）
        const relativePath = path.relative(postsDir, fullPath)
        const link = `/${relativePath.replace(/\.md$/, '')}`
        
        // 格式化日期显示
        const formattedDate = `${year}年${month}月${day}日`
        
        posts.push({
          title,
          date,
          year,
          month,
          day,
          formattedDate,
          link,
          excerpt,
          tags,
          author,
          cover
        })
      }
    }
  }
  
  traverseDir(postsDir)
  
  // 按日期倒序排序（最新的在前）
  posts.sort((a, b) => {
    if (a.date > b.date) return -1
    if (a.date < b.date) return 1
    return 0
  })
  
  console.log(`✅ 共找到 ${posts.length} 篇文章`)
  return posts
}

// 生成导航栏
function generateNav() {
  return [
    { text: '个人主页', link: 'https://huanhuan0812.github.io/', activeMatch: '^/$' },
    { text: '🏠 首页', link: '/', activeMatch: '^/$' },
    { text: '📝 文章', link: '/posts/', activeMatch: '^/posts/' },
    { text: '📅 归档', link: '/archive/', activeMatch: '^/archive/' },
    { text: '🏷️ 标签', link: '/tags/', activeMatch: '^/tags/' },
    { text: '👤 关于', link: '/about/', activeMatch: '^/about/' }
  ]
}

// 生成侧边栏（按年份归档）
function generateSidebar() {
  const posts = getAllPosts()
  
  // 按年份分组
  const postsByYear: Record<string, BlogPost[]> = {}
  
  posts.forEach(post => {
    const year = post.year
    if (!postsByYear[year]) {
      postsByYear[year] = []
    }
    postsByYear[year].push(post)
  })
  
  // 构建侧边栏项
  const sidebarItems = Object.keys(postsByYear)
    .sort((a, b) => Number(b) - Number(a)) // 年份倒序
    .map(year => ({
      text: `${year}年 (${postsByYear[year].length}篇)`,
      collapsed: true,
      items: postsByYear[year].map(post => ({
        text: `${post.month}-${post.day} ${post.title}`,
        link: post.link
      }))
    }))
  
  return {
    '/': [
      {
        text: '📚 博客归档',
        items: sidebarItems.length > 0 ? sidebarItems : [{ text: '暂无文章', link: '/' }]
      }
    ],
    '/posts/': [
      {
        text: '📚 博客归档',
        items: sidebarItems.length > 0 ? sidebarItems : [{ text: '暂无文章', link: '/posts/' }]
      }
    ]
  }
}

// 生成所有文章数据，供首页和归档页面使用
const allPosts = getAllPosts()

export default defineConfig({
  base: '/life/',
  title: '个人博客',
  description: '记录生活，分享思考',
  
  head: [
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }]
  ],

  themeConfig: {
    // 导航栏
    nav: generateNav(),
    
    // 侧边栏
    sidebar: generateSidebar(),
    
    // 文章页脚导航
    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },
    
    
    // 最后更新时间
    lastUpdated: {
      text: '最后更新',
      formatOptions: {
        dateStyle: 'full',
        timeStyle: 'medium'
      }
    },
    
    // 返回顶部
    returnToTopLabel: '返回顶部',
    
    // 侧边栏菜单标题
    sidebarMenuLabel: '归档',
    
    // 深色模式切换
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
    
    // 页脚
    footer: {
      message: '基于 VitePress 构建',
      copyright: `Copyright © ${new Date().getFullYear()} _huanhuan_`
    },
    
    // 社交链接
    socialLinks: [
      { icon: 'github', link: 'https://github.com/huanhuan0812' }
    ]
  },

  markdown: {
    lineNumbers: true,
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    }
  },

  // 生成干净的 URL
  cleanUrls: true
})