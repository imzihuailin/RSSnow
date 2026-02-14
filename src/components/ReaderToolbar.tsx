import { useState } from 'react'

const FONT_OPTIONS = [
  { id: 'serif', label: '宋体', fontFamily: '"SimSun", "Songti SC", serif' },
  { id: 'sans', label: '黑体', fontFamily: '"SimHei", "Heiti SC", sans-serif' },
  { id: 'kai', label: '楷体', fontFamily: '"KaiTi", "Kaiti SC", serif' },
  { id: 'yahei', label: '微软雅黑', fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif' },
  { id: 'georgia', label: 'Georgia', fontFamily: 'Georgia, "Times New Roman", serif' },
  { id: 'times', label: 'Times New Roman', fontFamily: '"Times New Roman", Times, serif' },
  { id: 'arial', label: 'Arial', fontFamily: 'Arial, Helvetica, sans-serif' },
  { id: 'verdana', label: 'Verdana', fontFamily: 'Verdana, Geneva, sans-serif' },
]

const BG_OPTIONS = [
  { id: 'white', label: '白色', bg: '#ffffff', text: '#1e293b' },
  { id: 'dark', label: '深色', bg: '#000000', text: '#e8e8e8' },
  { id: 'yellow', label: '黄色', bg: '#f5ebd0', text: '#5c4033' },
  { id: 'green', label: '绿色', bg: '#ecfccb', text: '#14532d' },
]

type ExpandKey = 'progress' | 'font' | 'bg' | 'brightness' | null

const SLIDER_STYLES =
  'flex-1 h-2 rounded-full appearance-none bg-slate-200 dark:bg-slate-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer'

interface ReaderToolbarProps {
  visible: boolean
  progress: number
  onProgressChange: (value: number) => void
  brightness: number
  onBrightnessChange: (value: number) => void
  fontSize: number
  onFontSizeChange: (value: number) => void
  lineHeight: number
  onLineHeightChange: (value: number) => void
  fontId: string
  onFontChange: (id: string) => void
  bgId: string
  onBgChange: (id: string) => void
}

export function ReaderToolbar({
  visible,
  progress,
  onProgressChange,
  brightness,
  onBrightnessChange,
  fontSize,
  onFontSizeChange,
  lineHeight,
  onLineHeightChange,
  fontId,
  onFontChange,
  bgId,
  onBgChange,
}: ReaderToolbarProps) {
  const [expanded, setExpanded] = useState<ExpandKey>(null)
  const bg = BG_OPTIONS.find((b) => b.id === bgId) ?? BG_OPTIONS[0]
  const isDark = bgId === 'dark'

  const toggle = (key: ExpandKey) => setExpanded((v) => (v === key ? null : key))

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    if (!isNaN(v)) onProgressChange(v)
  }

  const hoverClass = isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'
  const activeClass = 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
  const borderColor = isDark ? 'border-white/20' : 'border-black/10'

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-300 ease-out ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={`backdrop-blur border-t shadow-[0_-4px_20px_rgba(0,0,0,0.08)] ${borderColor}`}
        style={{ backgroundColor: `${bg.bg}F2` }}
      >
        <div className="max-w-3xl mx-auto px-4 py-3" style={{ color: bg.text }}>
          {/* 模块图标行 */}
          <div className="flex items-stretch justify-center gap-8 sm:gap-12">
            {/* 进度 - 迷你进度条样式 */}
            <button
              onClick={() => toggle('progress')}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg transition-colors min-w-[3rem] ${
                expanded === 'progress' ? activeClass : hoverClass
              }`}
              title="进度"
            >
              <div className="h-8 flex items-center justify-center shrink-0">
                <div
                  className="relative w-11 h-2.5 rounded-full overflow-visible"
                  style={{ backgroundColor: `${bg.text}30` }}
                >
                  <div
                    className="absolute top-1/2 w-3 h-3 rounded-full bg-blue-500 shadow-sm -translate-y-1/2 -translate-x-1/2"
                    style={{ left: `${Math.max(2, Math.min(progress, 98))}%` }}
                  />
                </div>
              </div>
              <span className="text-[10px] leading-none">进度</span>
            </button>

            {/* 字体 - A */}
            <button
              onClick={() => toggle('font')}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg transition-colors min-w-[3rem] ${
                expanded === 'font' ? activeClass : hoverClass
              }`}
              title="字体"
            >
              <div className="h-8 flex items-center justify-center shrink-0">
                <span className="text-2xl font-serif font-bold leading-none">A</span>
              </div>
              <span className="text-[10px] leading-none">字体</span>
            </button>

            {/* 背景 - B */}
            <button
              onClick={() => toggle('bg')}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg transition-colors min-w-[3rem] ${
                expanded === 'bg' ? activeClass : hoverClass
              }`}
              title="背景"
            >
              <div className="h-8 flex items-center justify-center shrink-0">
                <span className="text-2xl font-bold leading-none">B</span>
              </div>
              <span className="text-[10px] leading-none">背景</span>
            </button>

            {/* 亮度 - 小太阳 */}
            <button
              onClick={() => toggle('brightness')}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg transition-colors min-w-[3rem] ${
                expanded === 'brightness' ? activeClass : hoverClass
              }`}
              title="亮度"
            >
              <div className="h-8 flex items-center justify-center shrink-0">
                <svg className="w-7 h-7 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              </div>
              <span className="text-[10px] leading-none">亮度</span>
            </button>
          </div>

          {/* 展开内容区 - 仅在有展开时渲染 */}
          {expanded && (
          <div className={`mt-3 pt-3 border-t ${borderColor}`}>
            {expanded === 'progress' && (
              <div className="flex items-center gap-3">
                <span className="text-xs opacity-75 shrink-0 w-10">进度</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={progress}
                  onChange={handleProgressChange}
                  className={SLIDER_STYLES}
                />
                <span className="text-xs opacity-75 shrink-0 w-10">{Math.round(progress)}%</span>
              </div>
            )}

            {expanded === 'font' && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs opacity-75 shrink-0 w-10">字号</span>
                  <input
                    type="range"
                    min="14"
                    max="24"
                    step="1"
                    value={fontSize}
                    onChange={(e) => onFontSizeChange(parseInt(e.target.value, 10))}
                    className={SLIDER_STYLES}
                  />
                  <span className="text-xs opacity-75 shrink-0 w-10">{fontSize}px</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs opacity-75 shrink-0 w-10">行距</span>
                  <input
                    type="range"
                    min="1.2"
                    max="2.2"
                    step="0.1"
                    value={lineHeight}
                    onChange={(e) => onLineHeightChange(parseFloat(e.target.value))}
                    className={SLIDER_STYLES}
                  />
                  <span className="text-xs opacity-75 shrink-0 w-10">{lineHeight.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs opacity-75 shrink-0">字体</span>
                  {FONT_OPTIONS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => onFontChange(f.id)}
                      className={`px-3 py-1.5 rounded text-sm transition-colors ${
                        fontId === f.id
                          ? 'bg-blue-500 text-white'
                          : isDark ? 'bg-white/20 text-current hover:bg-white/30' : 'bg-black/10 text-current hover:bg-black/15'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {expanded === 'bg' && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs opacity-75 shrink-0">背景</span>
                {BG_OPTIONS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => onBgChange(b.id)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      bgId === b.id ? 'border-blue-500 scale-110' : isDark ? 'border-white/30' : 'border-black/20'
                    }`}
                    style={{ backgroundColor: b.bg }}
                    title={b.label}
                  />
                ))}
              </div>
            )}

            {expanded === 'brightness' && (
              <div className="flex items-center gap-3">
                <span className="text-xs opacity-75 shrink-0 w-10">亮度</span>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={brightness}
                  onChange={(e) => onBrightnessChange(parseFloat(e.target.value))}
                  className={SLIDER_STYLES}
                />
                <span className="text-xs opacity-75 shrink-0 w-10">
                  {Math.round(brightness * 100)}%
                </span>
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  )
}

export { FONT_OPTIONS, BG_OPTIONS }
