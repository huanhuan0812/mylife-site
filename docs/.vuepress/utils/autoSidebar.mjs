import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import matter from 'gray-matter'  // 用于解析Frontmatter

// 获取ESM中的__dirname等效路径
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 首字母大写函数
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

// 解析Frontmatter

function parseFrontmatter(filePath) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8')
        const { data } = matter(fileContent)
        // 确保 tags 是数组格式
        if (data.tags && !Array.isArray(data.tags)) {
            data.tags = [data.tags]
        }
        return data
    } catch (err) {
        console.error(`解析Frontmatter出错(${filePath}):`, err)
        return {}
    }
}


function getSidebarItems(dir, base = '') {
    const fullPath = path.join(__dirname, '../../', dir)
    if (!fs.existsSync(fullPath)) return []

    const items = []
    let files = []

    try {
        files = fs.readdirSync(fullPath)
            .filter(item => !item.startsWith('.')) // 过滤隐藏文件
            .sort((a, b) => {
                // 优先处理index/README文件
                if (a === 'index.md' || a === 'README.md') return -1
                if (b === 'index.md' || b === 'README.md') return 1

                // 获取Frontmatter用于排序
                const aPath = path.join(fullPath, a)
                const bPath = path.join(fullPath, b)
                const aFrontmatter = fs.statSync(aPath).isFile() ? parseFrontmatter(aPath) : {}
                const bFrontmatter = fs.statSync(bPath).isFile() ? parseFrontmatter(bPath) : {}

                // 使用Frontmatter中的order值排序，默认0
                const aOrder = aFrontmatter.order || 0
                const bOrder = bFrontmatter.order || 0

                if (aOrder !== bOrder) return aOrder - bOrder
                return a.localeCompare(b)  // 字母顺序作为后备方案
            })
    } catch (err) {
        console.error(`读取目录出错(${fullPath}):`, err)
        return []
    }

    for (const item of files) {
        try {
            const itemPath = path.join(fullPath, item)
            const stat = fs.statSync(itemPath)
            const routePath = path.posix.join(base, item.replace(/\.md$/, ''))

            if (stat.isDirectory()) {
                const indexPath = path.join(itemPath, 'index.md')
                const readmePath = path.join(itemPath, 'README.md')
                const hasIndex = fs.existsSync(indexPath) || fs.existsSync(readmePath)

                if (hasIndex) {
                    const frontmatter = parseFrontmatter(fs.existsSync(indexPath) ? indexPath : readmePath)
                    items.push({
                        text: frontmatter.title || capitalize(item),  // 优先使用Frontmatter中的title
                        link: `${routePath}/`,
                        collapsible: true,
                        collapsed: frontmatter.collapsed !== false,  // 控制默认折叠状态
                        children: getSidebarItems(
                            path.join(dir, item),
                            path.posix.join(base, item)
                        )
                    })
                }
            } else if (item.endsWith('.md') && item !== 'index.md' && item !== 'README.md') {
                const frontmatter = parseFrontmatter(itemPath)
                items.push({
                    text: frontmatter.title || capitalize(item.replace(/\.md$/, '').replace(/-/g, ' ')),
                    link: routePath,
                    ...(frontmatter.order !== undefined && { order: frontmatter.order })  // 保留排序信息
                })
            }
        } catch (err) {
            console.error(`处理文件出错(${item}):`, err)
        }
    }

    return items
}

export function autoGenerateSidebar() {
    const rootDir = './docs'
    const sidebar = {}

    try {
        fs.readdirSync(rootDir).forEach(item => {
            try {
                const itemPath = path.join(rootDir, item)
                if (fs.statSync(itemPath).isDirectory() && item !== '.vuepress') {
                    sidebar[`/${item}/`] = getSidebarItems(item)
                }
            } catch (err) {
                console.error(`处理目录项出错(${item}):`, err)
            }
        })
    } catch (err) {
        console.error(`读取根目录出错(${rootDir}):`, err)
    }

    return sidebar
}