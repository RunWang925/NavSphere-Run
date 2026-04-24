import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { uint8ArrayToBase64 } from '@/lib/buffer-utils'

export const runtime = 'edge'

interface WebsiteMetadata {
    title: string
    description: string
    icon: string
}

export async function POST(request: Request) {
    try {
        const session = await auth()
        if (!session?.user?.accessToken) {
            return new Response('Unauthorized', { status: 401 })
        }

        const { url } = await request.json()

        if (!url || !isValidUrl(url)) {
            return NextResponse.json({ error: '请提供有效的网站链接' }, { status: 400 })
        }

        const metadata = await fetchWebsiteMetadata(url)

        // 确保 metadata 对象包含所有必需的属性
        if (!metadata || typeof metadata !== 'object') {
            throw new Error('Failed to fetch valid metadata')
        }

        // 如果获取到了 favicon，下载并上传到 GitHub
        if (metadata.icon) {
            try {
                const iconUrl = await downloadAndUploadIcon(metadata.icon, session.user.accessToken)
                metadata.icon = iconUrl

            } catch (error) {
                console.warn('Failed to download icon:', error)
                // ======================== 已修改 ========================
                // 原来逻辑：下载失败 → 使用谷歌图标
                // 现在逻辑：下载失败 → 直接使用 favicon.im（国内可用）
                // 不再调用谷歌接口，彻底解决国内无法访问问题
                // ======================================================
                try {
                    const domain = new URL(url).hostname
                    // 使用 favicon.im 替代谷歌，国内可直接访问
                    const fallbackIconUrl = `https://favicon.im/${domain}?larger=true`
                    metadata.icon = fallbackIconUrl
                } catch (fallbackError) {
                    console.warn('使用 favicon.im 兜底失败:', fallbackError)
                }
            }
        }

        return NextResponse.json(metadata)
    } catch (error) {
        console.error('Failed to fetch website metadata:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : '获取网站信息失败' },
            { status: 500 }
        )
    }
}

function isValidUrl(string: string): boolean {
    try {
        new URL(string)
        return true
    } catch (_) {
        return false
    }
}

async function fetchWebsiteMetadata(url: string): Promise<WebsiteMetadata> {
    try {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Cache-Control': 'max-age=0',
            'Sec-Ch-Ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"macOS"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1'
        }

        const response = await fetch(url, {
            headers: headers,
            redirect: 'follow',
            signal: AbortSignal.timeout(1500)
        })

        if (response.ok) {
            const html = await response.text()
            return parseMetadataFromHtml(html, url)
        } else if (response.status === 403) {
            console.warn(`网站拒绝访问 (403): 该网站可能阻止了自动化访问`)
            return getFallbackMetadata(url)
        } else if (response.status === 404) {
            return getFallbackMetadata(url)
        } else if (response.status >= 500) {
            return getFallbackMetadata(url)
        } else {
            console.warn(`无法访问网站: ${response.status}`)
            return getFallbackMetadata(url)
        }
    } catch (error) {
        if (error instanceof Error && error.name === 'TimeoutError') {
            console.warn('请求超时，网站响应过慢')
        } else {
            console.warn('获取网站元数据失败:', error)
        }
        return getFallbackMetadata(url)
    }
}

function getFallbackMetadata(url: string): WebsiteMetadata {
    try {
        const urlObj = new URL(url)
        const hostname = urlObj.hostname

        const title = hostname.replace(/^www\./, '').split('.')[0]
        const capitalizedTitle = title.charAt(0).toUpperCase() + title.slice(1)

        return {
            title: capitalizedTitle,
            description: `访问 ${hostname}`,
            // ======================== 已修改 ========================
            // 原来：谷歌图标接口（国内无法访问）
            // 现在：favicon.im 国内可用高清图标接口
            // ======================================================
            icon: `https://favicon.im/${hostname}?larger=true`
        }
    } catch {
        return {
            title: '未知网站',
            description: '无法获取网站信息',
            icon: ''
        }
    }
}

function parseMetadataFromHtml(html: string, url: string): WebsiteMetadata {
    const title = extractMetaContent(html, 'title') ||
        extractMetaContent(html, 'og:title') ||
        extractMetaContent(html, 'twitter:title') ||
        new URL(url).hostname

    const description = extractMetaContent(html, 'description') ||
        extractMetaContent(html, 'og:description') ||
        extractMetaContent(html, 'twitter:description') ||
        ''

    let icon = extractFavicon(html, url)

    return {
        title: title.trim(),
        description: description.trim(),
        icon: icon || ''
    }
}

function extractMetaContent(html: string, name: string): string | null {
    if (name === 'title') {
        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
        return titleMatch ? titleMatch[1] : null
    }

    const patterns = [
        new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i'),
        new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["']`, 'i'),
        new RegExp(`<meta[^>]*property=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i'),
        new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${name}["']`, 'i')
    ]

    for (const pattern of patterns) {
        const match = html.match(pattern)
        if (match) {
            return match[1]
        }
    }

    return null
}

function extractFavicon(html: string, baseUrl: string): string | null {
    const base = new URL(baseUrl)

    const faviconPatterns = [
        /<link[^>]*rel=["']icon["'][^>]*href=["']([^"']*)["']/i,
        /<link[^>]*href=["']([^"']*)["'][^>]*rel=["']icon["']/i,
        /<link[^>]*rel=["']shortcut icon["'][^>]*href=["']([^"']*)["']/i,
        /<link[^>]*href=["']([^"']*)["'][^>]*rel=["']shortcut icon["']/i,
        /<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']*)["']/i,
        /<link[^>]*href=["']([^"']*)["'][^>]*rel=["']apple-touch-icon["']/i
    ]

    for (const pattern of faviconPatterns) {
        const match = html.match(pattern)
        if (match) {
            const href = match[1]
            if (href.startsWith('http')) {
                return href
            } else if (href.startsWith('//')) {
                return base.protocol + href
            } else if (href.startsWith('/')) {
                return base.origin + href
            } else {
                return base.origin + '/' + href
            }
        }
    }

    // ======================== 已修改 ========================
    // 原来：没找到图标 → 使用谷歌
    // 现在：没找到图标 → 使用 favicon.im（国内可用）
    // ======================================================
    return `https://favicon.im/${base.hostname}?larger=true`
}

// ======================== 已注释/废弃 ========================
// 原来的谷歌下载函数，现在已经完全不用了
// 因为全部替换成了 favicon.im，国内可直接访问
// ============================================================
// async function downloadGoogleFavicon(domain: string, token: string): Promise<string> {
//     ... 谷歌代码已废弃 ...
// }

async function downloadAndUploadIcon(iconUrl: string, token: string): Promise<string> {
    const strategies: Array<{ headers: HeadersInit; delay?: number }> = [
        {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'Referer': new URL(iconUrl).origin + '/',
                'Sec-Ch-Ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"macOS"',
                'Sec-Fetch-Dest': 'image',
                'Sec-Fetch-Mode': 'no-cors',
                'Sec-Fetch-Site': 'same-origin'
            },
            delay: 1000
        }
    ]

    let lastError: Error | null = null

    for (const strategy of strategies) {
        try {
            const response = await fetch(iconUrl, {
                headers: strategy.headers,
                redirect: 'follow',
                signal: AbortSignal.timeout(15000)
            })

            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer()
                const binaryData = new Uint8Array(arrayBuffer)
                const { path } = await uploadImageToGitHub(binaryData, token, getFileExtension(iconUrl))
                return path
            } else {
                lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)
                console.warn(`Strategy failed with status ${response.status}, trying next strategy...`)
            }
        } catch (error) {
            lastError = error instanceof Error ? error : new Error('Unknown error')
            console.warn(`Strategy failed with error:`, error)
        }
    }

    throw lastError || new Error('All download strategies failed')
}

function getFileExtension(url: string): string {
    try {
        const pathname = new URL(url).pathname
        const extension = pathname.split('.').pop()?.toLowerCase()

        if (extension && ['png', 'jpg', 'jpeg', 'gif', 'svg', 'ico'].includes(extension)) {
            return extension
        }
        return 'png'
    } catch {
        return 'png'
    }
}

async function uploadImageToGitHub(binaryData: Uint8Array, token: string, extension: string = 'png'): Promise<{ path: string, commitHash: string }> {
    const owner = process.env.GITHUB_OWNER!
    const repo = process.env.GITHUB_REPO!
    const branch = process.env.GITHUB_BRANCH || 'main'
    const path = `/assets/favicon_${Date.now()}.${extension}`
    const githubPath = 'public' + path

    const base64String = uint8ArrayToBase64(binaryData)
    const currentFileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${githubPath}?ref=${branch}`

    const response = await fetch(currentFileUrl, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
            message: `Upload favicon ${githubPath}`,
            content: base64String,
            branch: branch,
        }),
    })

    if (!response.ok) {
        const errorData = await response.json()
        console.error('Failed to upload image to GitHub:', errorData)
        throw new Error(`Failed to upload image to GitHub: ${errorData.message || 'Unknown error'}`)
    }

    const responseData = await response.json()
    const commitHash = responseData.commit.sha

    return { path, commitHash }
}
