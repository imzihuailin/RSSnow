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

interface ReaderToolbarProps {
  visible: boolean
  progress: number
  onProgressChange: (value: number) => void
  fontId: string
  onFontChange: (id: string) => void
  bgId: string
  onBgChange: (id: string) => void
}

export function ReaderToolbar({
  visible,
  progress,
  onProgressChange,
  fontId,
  onFontChange,
  bgId,
  onBgChange,
}: ReaderToolbarProps) {
  const [fontExpanded, setFontExpanded] = useState(false)

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    if (!isNaN(v)) onProgressChange(v)
  }

  const currentFont = FONT_OPTIONS.find((f) => f.id === fontId)?.label ?? '字体'

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-300 ease-out ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur border-t border-slate-200 dark:border-slate-700 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
          {/* 进度 - 单独一行 */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0 w-10">
              进度
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={progress}
              onChange={handleSliderChange}
              className="flex-1 h-2 rounded-full appearance-none bg-slate-200 dark:bg-slate-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0 w-10">
              {Math.round(progress)}%
            </span>
          </div>

          {/* 字体 + 背景 */}
          <div className="flex items-center gap-4 md:gap-6 flex-wrap">
            {/* 字体 - 可折叠 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                字体
              </span>
              <button
                onClick={() => setFontExpanded((v) => !v)}
                className="px-3 py-1.5 rounded text-sm bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500 flex items-center gap-1"
              >
                {currentFont}
                <span className="text-xs opacity-70">{fontExpanded ? '▲' : '▼'}</span>
              </button>
            </div>

            {/* 背景 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                背景
              </span>
              <div className="flex gap-1">
                {BG_OPTIONS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => onBgChange(b.id)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      bgId === b.id
                        ? 'border-blue-500 scale-110'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                    style={{ backgroundColor: b.bg }}
                    title={b.label}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 字体选项 - 展开时显示 */}
          {fontExpanded && (
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-200 dark:border-slate-600">
              {FONT_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    onFontChange(f.id)
                    setFontExpanded(false)
                  }}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    fontId === f.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export { FONT_OPTIONS, BG_OPTIONS }
