'use client'

import * as React from 'react'
import { Search, LayoutGrid, X } from 'lucide-react'
import { Input } from "@/registry/new-york/ui/input"
import { Button } from "@/registry/new-york/ui/button"

export function SearchBar({ onSearch, searchQuery }: { onSearch: (v: string, type: 'baidu' | 'site') => void, searchQuery: string }) {
  const [inputValue, setInputValue] = React.useState(searchQuery)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    setInputValue(searchQuery)
  }, [searchQuery])

  const handleInputChange = (val: string) => {
    setInputValue(val)
    if (val === '') {
      onSearch('', 'site')
    }
  }

  // 统一站内搜索触发
  const triggerSiteSearch = () => {
    if (inputValue.trim()) {
      onSearch(inputValue, 'site')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (e.ctrlKey || e.metaKey) {
        triggerSiteSearch()
      } else {
        if (inputValue.trim() === '') {
          onSearch('', 'site')
        } else {
          onSearch(inputValue, 'baidu')
        }
      }
    }
  }

  const handleClear = () => {
    setInputValue('')
    onSearch('', 'site')
    inputRef.current?.focus()
  }

  return (
    <div className="relative group/bar w-full flex items-center max-w-2xl mx-auto">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
      
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder="搜索本站卡片 (Enter 百度 / Ctrl+Enter 站内)"
        onKeyDown={handleKeyDown}
        className="w-full pl-10 pr-20 h-10 bg-background border-border focus-visible:ring-1 rounded-lg transition-all text-sm"
      />

      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
        
        {inputValue && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground/30 hover:text-foreground"
            onClick={handleClear}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* 提示容器：纯 CSS 驱动，位置锁定 */}
        <div className="relative flex items-center group/tip">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
            onClick={triggerSiteSearch}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>

          {/* 自动适配主题的提示框 */}
          <div className="absolute top-[calc(100%+10px)] right-0 opacity-0 scale-95 pointer-events-none group-hover/tip:opacity-100 group-hover/tip:scale-100 transition-all duration-200 z-[100] origin-top-right">
            {/* bg-popover 会在深色模式下变黑，在浅色模式下变白 */}
            <div className="bg-popover border border-border shadow-2xl rounded-xl p-3 min-w-[150px] flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-[12px] font-bold text-foreground leading-none">
                  站内搜索
                </span>
                <span className="text-[10px] text-muted-foreground leading-none">
                  点击图标 或 使用快捷键
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] bg-muted px-1.5 py-1 rounded border border-border text-muted-foreground font-bold leading-none">
                    Ctrl
                  </span>
                  <span className="text-[9px] text-muted-foreground/40 font-bold">+</span>
                  <span className="text-[9px] bg-muted px-1.5 py-1 rounded border border-border text-muted-foreground font-bold leading-none">
                    Enter
                  </span>
                </div>
              </div>

              {/* 箭头装饰 */}
              <div className="absolute -top-1 right-3 w-2 h-2 bg-popover border-t border-l border-border rotate-45" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}