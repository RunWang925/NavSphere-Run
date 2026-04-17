'use client'

import { useState, useMemo } from 'react'
import type { NavigationData } from '@/types/navigation'
import type { SiteConfig } from '@/types/site'
import { NavigationCard } from '@/components/navigation-card'
import { Sidebar } from '@/components/sidebar'
import { SearchBar } from '@/components/search-bar'
import { ModeToggle } from '@/components/mode-toggle'
import { Footer } from '@/components/footer'
import { cn } from '@/lib/utils'
import { Github, HelpCircle, Menu } from 'lucide-react'
import { Button } from "@/registry/new-york/ui/button"

export function NavigationContent({ navigationData, siteData }: { navigationData: NavigationData, siteData: SiteConfig }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [submittedQuery, setSubmittedQuery] = useState('')

  /**
   * 核心搜索分发逻辑
   * @param query 搜索关键词
   * @param type 'baidu' (全网搜索) 或 'site' (站内搜索)
   */
  const handleSearch = (query: string, type: 'baidu' | 'site') => {
    const trimmed = query.trim()
    
    // 关键修正：如果输入内容为空，立即清空站内搜索状态，让界面恢复原状
    if (!trimmed) {
      setSubmittedQuery('')
      return
    }

    if (type === 'site') {
      // 执行站内搜索：在本页面更新状态
      setSubmittedQuery(trimmed)
    } else {
      // 执行百度搜索：打开新标签页，不干扰当前页面状态
      window.open(`https://www.baidu.com/s?wd=${encodeURIComponent(trimmed)}`, '_blank')
    }
  }

  // 搜索结果过滤逻辑
  const searchResults = useMemo(() => {
    const query = submittedQuery.toLowerCase().trim()
    if (!query) return []
    const results: any[] = []
    const seenIds = new Set()

    navigationData.navigationItems.forEach(category => {
      const allItems = [
        ...(category.items || []),
        ...(category.subCategories?.flatMap(sub => sub.items || []) || [])
      ]
      allItems.forEach(item => {
        if (item.enabled !== false && !seenIds.has(item.id)) {
          const titleMatch = item.title.toLowerCase().includes(query)
          const descMatch = item.description?.toLowerCase().includes(query)
          if (titleMatch || descMatch) {
            results.push(item)
            seenIds.add(item.id)
          }
        }
      })
    })
    return results
  }, [navigationData, submittedQuery])

  return (
    <div className="flex flex-col sm:flex-row min-h-screen bg-background">
      {/* 桌面端侧边栏 */}
      <div className="hidden sm:block">
        <Sidebar navigationData={navigationData} siteInfo={siteData} className="sticky top-0 h-screen" />
      </div>

      {/* 移动端侧边栏抽屉 */}
      <div className={cn(
        "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm transition-all sm:hidden",
        isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        <div className={cn(
          "fixed inset-y-0 left-0 w-3/4 max-w-xs bg-background shadow-lg transform transition-transform duration-200",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <Sidebar navigationData={navigationData} siteInfo={siteData} onClose={() => setIsSidebarOpen(false)} />
        </div>
      </div>
      
      <main className="flex-1 min-w-0">
        {/* 顶部导航与搜索栏 */}
        <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-30 px-4 sm:px-6 py-3 border-b">
          <div className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[1fr_2fr_1fr] items-center max-w-7xl mx-auto gap-4">
            
            <div className="flex items-center">
               <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setIsSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
            </div>

            {/* 搜索组件调用 */}
            <div className="flex justify-center w-full"> 
              <SearchBar onSearch={handleSearch} searchQuery={submittedQuery} />
            </div>
            
            <div className="flex items-center gap-1 justify-end">
              <ModeToggle />
              <Button variant="ghost" size="icon" asChild className="h-9 w-9">
                <a href="https://github.com" target="_blank" rel="noreferrer">
                  <Github className="h-[1.2rem] w-[1.2rem]" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" asChild className="h-9 w-9">
                <a href="/help" target="_blank" rel="noreferrer">
                  <HelpCircle className="h-[1.2rem] w-[1.2rem]" />
                </a>
              </Button>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-8 py-6">
          {/* 站内搜索结果区域：仅在提交了查询且不为空时显示 */}
          {submittedQuery && (
            <section className="mb-12">
              <h2 className="text-base font-semibold text-foreground mb-4">
                站内搜索结果: "{submittedQuery}"
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                {searchResults.length > 0 ? (
                  searchResults.map(item => (
                    <NavigationCard key={`search-${item.id}`} item={item} siteConfig={siteData} searchQuery={submittedQuery} />
                  ))
                ) : (
                  <div className="col-span-full py-12 text-center border rounded-lg border-dashed">
                    <p className="text-sm text-muted-foreground">未找到相关站内资源</p>
                  </div>
                )}
              </div>
              <div className="h-px bg-border/60 mt-10 mb-6" />
            </section>
          )}

          {/* 默认分类导航展示列表 */}
          <div className="space-y-10">
            {navigationData.navigationItems.map((category) => (
              <section key={category.id} id={category.id} className="scroll-m-20">
                <div className="space-y-4">
                  <h2 className="text-base font-semibold text-foreground">
                    {category.title}
                  </h2>

                  {category.subCategories && category.subCategories.length > 0 ? (
                    <div className="space-y-8">
                      {category.subCategories.map((subCategory) => (
                        <div key={subCategory.id} id={subCategory.id} className="space-y-3">
                          <h3 className="text-sm font-medium text-muted-foreground/80">
                            {subCategory.title}
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                            {(subCategory.items || []).map((item) => (
                              <NavigationCard key={item.id} item={item} siteConfig={siteData} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                      {(category.items || []).map((item) => (
                        <NavigationCard key={item.id} item={item} siteConfig={siteData} />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
        <Footer siteInfo={siteData} />
      </main>
    </div>
  )
}