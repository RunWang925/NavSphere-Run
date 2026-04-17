'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription } from '@/registry/new-york/ui/card'
import type { NavigationSubItem } from '@/types/navigation'
import type { SiteConfig } from '@/types/site'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface NavigationCardProps {
  item: NavigationSubItem
  siteConfig?: SiteConfig
  searchQuery?: string // 新增：接收搜索词
}

export function NavigationCard({ item, siteConfig, searchQuery }: NavigationCardProps) {
  // 渲染高亮文本并智能处理描述截断
  const renderHighlightText = (text: string, query: string, isDescription = false) => {
    if (!query || !text) return text
    
    const lowerText = text.toLowerCase()
    const lowerQuery = query.toLowerCase()
    
    // 如果是描述文字，且关键词不在开头，进行智能智能定位
    let displayText = text
    if (isDescription && !lowerText.startsWith(lowerQuery) && lowerText.includes(lowerQuery)) {
      const index = lowerText.indexOf(lowerQuery)
      if (index > 15) {
        displayText = `...${text.slice(index - 10, index + 30)}...`
      }
    }

    const parts = displayText.split(new RegExp(`(${query})`, 'gi'))

    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === lowerQuery ? (
            <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 text-foreground px-0.5 rounded-sm">
              {part}
            </mark>
          ) : part
        )}
      </>
    )
  }

  const linkTarget = siteConfig?.navigation?.linkTarget || '_blank'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className="overflow-hidden transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-lg h-full">
            <Link
              href={item.href}
              target={linkTarget}
              rel="noopener noreferrer"
              className="block h-full"
            >
              <CardHeader className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  {item.icon && (
                    <div className="flex-shrink-0 w-9 h-9 sm:w-11 sm:h-11 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                      <img
                        src={item.icon}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="text-sm sm:text-base truncate">
                      {renderHighlightText(item.title, searchQuery || '')}
                    </CardTitle>
                    {item.description && (
                      <CardDescription className="text-xs sm:text-sm line-clamp-1 italic">
                        {renderHighlightText(item.description, searchQuery || '', true)}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Link>
          </Card>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[280px]">
          <p>{item.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}