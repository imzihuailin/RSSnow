import { useState } from 'react'
import { t } from '../i18n'
import {
  getReaderBackground,
  READER_BACKGROUND_VARIANTS,
  READER_COLOR_OPTIONS,
  type ReaderBackgroundVariantId,
  type ReaderColorId,
} from '../utils/readerBackgrounds'

const FONT_OPTIONS = [
  {
    id: 'yahei-arial',
    label: '微软雅黑 / Arial',
    labelEn: 'YaHei / Arial',
    fontFamily: '"Microsoft YaHei", Arial, sans-serif',
  },
  {
    id: 'pingfang-helvetica',
    label: '苹方 / Helvetica',
    labelEn: 'PingFang / Helvetica',
    fontFamily: '"PingFang SC", Helvetica, Arial, sans-serif',
  },
  {
    id: 'simsun-times',
    label: '宋体 / Times New Roman',
    labelEn: 'SimSun / Times New Roman',
    fontFamily: '"SimSun", "Times New Roman", serif',
  },
  {
    id: 'simhei-verdana',
    label: '黑体 / Verdana',
    labelEn: 'SimHei / Verdana',
    fontFamily: '"SimHei", Verdana, Arial, sans-serif',
  },
  {
    id: 'songti-georgia',
    label: '宋体 SC / Georgia',
    labelEn: 'Songti SC / Georgia',
    fontFamily: '"Songti SC", Georgia, "Times New Roman", serif',
  },
]

type ExpandKey = 'progress' | 'font' | 'bg' | 'brightness' | null

const SLIDER_STYLES =
  'flex-1 h-2 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer'

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
  pagePadding: number
  onPagePaddingChange: (value: number) => void
  fontId: string
  onFontChange: (id: string) => void
  colorId: ReaderColorId
  onColorChange: (id: ReaderColorId) => void
  backgroundVariantId: ReaderBackgroundVariantId
  onBackgroundVariantChange: (id: ReaderBackgroundVariantId) => void
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
  pagePadding,
  onPagePaddingChange,
  fontId,
  onFontChange,
  colorId,
  onColorChange,
  backgroundVariantId,
  onBackgroundVariantChange,
}: ReaderToolbarProps) {
  const [expanded, setExpanded] = useState<ExpandKey>(null)
  const currentBackground = getReaderBackground(colorId, backgroundVariantId)

  const toggle = (key: ExpandKey) => setExpanded((v) => (v === key ? null : key))

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    if (!Number.isNaN(v)) onProgressChange(v)
  }

  const hoverClass = currentBackground.isDarkScheme ? 'hover:bg-white/10' : 'hover:bg-black/5'
  const activeClass = currentBackground.isDarkScheme
    ? 'bg-blue-500/20 text-blue-300'
    : 'bg-blue-500/20 text-blue-600'

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-300 ease-out ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="backdrop-blur border-t shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
        style={{
          backgroundColor: currentBackground.surfaceOverlay,
          borderColor: currentBackground.borderColor,
        }}
      >
        <div className="max-w-4xl mx-auto px-4 py-3" style={{ color: currentBackground.textColor }}>
          <div className="flex items-stretch justify-center gap-8 sm:gap-12">
            <button
              onClick={() => toggle('progress')}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg transition-colors min-w-[3rem] ${
                expanded === 'progress' ? activeClass : hoverClass
              }`}
              title={t('进度', 'Progress')}
            >
              <div className="h-8 flex items-center justify-center shrink-0">
                <div
                  className="relative w-11 h-2.5 rounded-full overflow-visible"
                  style={{ backgroundColor: `${currentBackground.textColor}30` }}
                >
                  <div
                    className="absolute top-1/2 w-3 h-3 rounded-full bg-blue-500 shadow-sm -translate-y-1/2 -translate-x-1/2"
                    style={{ left: `${Math.max(2, Math.min(progress, 98))}%` }}
                  />
                </div>
              </div>
              <span className="text-[10px] leading-none">{t('进度', 'Progress')}</span>
            </button>

            <button
              onClick={() => toggle('font')}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg transition-colors min-w-[3rem] ${
                expanded === 'font' ? activeClass : hoverClass
              }`}
              title={t('字体', 'Font')}
            >
              <div className="h-8 flex items-center justify-center shrink-0">
                <span className="text-2xl font-serif font-bold leading-none">A</span>
              </div>
              <span className="text-[10px] leading-none">{t('字体', 'Font')}</span>
            </button>

            <button
              onClick={() => toggle('bg')}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg transition-colors min-w-[3rem] ${
                expanded === 'bg' ? activeClass : hoverClass
              }`}
              title={t('背景', 'Background')}
            >
              <div className="h-8 flex items-center justify-center shrink-0">
                <span className="text-2xl font-bold leading-none">B</span>
              </div>
              <span className="text-[10px] leading-none">{t('背景', 'Background')}</span>
            </button>

            <button
              onClick={() => toggle('brightness')}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg transition-colors min-w-[3rem] ${
                expanded === 'brightness' ? activeClass : hoverClass
              }`}
              title={t('亮度', 'Brightness')}
            >
              <div className="h-8 flex items-center justify-center shrink-0">
                <svg
                  className="w-7 h-7 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              </div>
              <span className="text-[10px] leading-none">{t('亮度', 'Brightness')}</span>
            </button>
          </div>

          {expanded && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: currentBackground.borderColor }}>
              {expanded === 'progress' && (
                <div className="flex items-center gap-3">
                  <span className="text-xs opacity-75 shrink-0 w-10">{t('进度', 'Progress')}</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    value={progress}
                    onChange={handleProgressChange}
                    className={SLIDER_STYLES}
                    style={{ backgroundColor: currentBackground.isDarkScheme ? 'rgba(148, 163, 184, 0.35)' : '#e2e8f0' }}
                  />
                  <span className="text-xs opacity-75 shrink-0 w-10">{Math.round(progress)}%</span>
                </div>
              )}

              {expanded === 'font' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs opacity-75 shrink-0 w-10">{t('字号', 'Size')}</span>
                    <input
                      type="range"
                      min="14"
                      max="24"
                      step="1"
                      value={fontSize}
                      onChange={(e) => onFontSizeChange(parseInt(e.target.value, 10))}
                      className={SLIDER_STYLES}
                      style={{ backgroundColor: currentBackground.isDarkScheme ? 'rgba(148, 163, 184, 0.35)' : '#e2e8f0' }}
                    />
                    <span className="text-xs opacity-75 shrink-0 w-10">{fontSize}px</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs opacity-75 shrink-0 w-10">{t('行距', 'Spacing')}</span>
                    <input
                      type="range"
                      min="1.2"
                      max="2.2"
                      step="0.1"
                      value={lineHeight}
                      onChange={(e) => onLineHeightChange(parseFloat(e.target.value))}
                      className={SLIDER_STYLES}
                      style={{ backgroundColor: currentBackground.isDarkScheme ? 'rgba(148, 163, 184, 0.35)' : '#e2e8f0' }}
                    />
                    <span className="text-xs opacity-75 shrink-0 w-10">{lineHeight.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs opacity-75 shrink-0 w-10">{t('页边距', 'Margin')}</span>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="1"
                      value={pagePadding}
                      onChange={(e) => onPagePaddingChange(parseInt(e.target.value, 10))}
                      className={SLIDER_STYLES}
                      style={{ backgroundColor: currentBackground.isDarkScheme ? 'rgba(148, 163, 184, 0.35)' : '#e2e8f0' }}
                    />
                    <span className="text-xs opacity-75 shrink-0 w-10">{pagePadding}%</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {FONT_OPTIONS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => onFontChange(f.id)}
                        className={`rounded-xl px-3 py-1.5 text-sm transition ${
                          fontId === f.id
                            ? 'bg-blue-500 text-white'
                            : currentBackground.isDarkScheme
                              ? 'bg-white/15 hover:bg-white/20'
                              : 'bg-black/5 hover:bg-black/10'
                        }`}
                      >
                        {t(f.label, f.labelEn)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {expanded === 'bg' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-xs opacity-75">{t('颜色', 'Color')}</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {READER_COLOR_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => onColorChange(option.id)}
                          className={`relative overflow-hidden rounded-[1.5rem] border transition-all duration-200 h-16 ${
                            colorId === option.id ? 'scale-[1.02] shadow-lg' : 'hover:-translate-y-0.5'
                          }`}
                          style={{
                            borderColor: colorId === option.id ? option.previewBorder : currentBackground.borderColor,
                            boxShadow:
                              colorId === option.id ? `0 0 0 2px ${option.previewBorder}` : 'none',
                            backgroundImage: `url("${option.previewImage}")`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center center',
                          }}
                          title={t(option.label, option.labelEn)}
                        >
                          <span
                            className="absolute inset-0"
                            style={{ backgroundColor: option.overlayTint }}
                          />
                          <span
                            className="relative z-10 text-sm font-medium"
                            style={{ color: option.previewTextColor }}
                          >
                            {t(option.label, option.labelEn)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs opacity-75">{t('背景', 'Background')}</div>
                    <div className="grid grid-cols-3 gap-3">
                      {READER_BACKGROUND_VARIANTS.map((variant) => {
                        const preview = getReaderBackground(colorId, variant.id)
                        const selected = backgroundVariantId === variant.id
                        return (
                          <button
                            key={variant.id}
                            onClick={() => onBackgroundVariantChange(variant.id)}
                            className={`relative overflow-hidden rounded-[1.5rem] border transition-all duration-200 h-24 ${
                              selected ? 'scale-[1.02] shadow-lg' : 'hover:-translate-y-0.5'
                            }`}
                            style={{
                              borderColor: selected ? '#3b82f6' : currentBackground.borderColor,
                              boxShadow: selected ? '0 0 0 2px rgba(59,130,246,0.7)' : 'none',
                              backgroundImage: `url("${preview.image}")`,
                              backgroundSize: 'cover',
                              backgroundPosition: preview.previewPosition,
                            }}
                            title={t(variant.label, variant.labelEn)}
                          >
                            <span
                              className="absolute inset-0"
                              style={{
                                backgroundColor: selected
                                  ? 'rgba(59,130,246,0.12)'
                                  : preview.isDarkScheme
                                    ? 'rgba(5,10,18,0.18)'
                                    : 'rgba(255,255,255,0.1)',
                              }}
                            />
                            <span className="absolute left-3 bottom-3 text-xs font-medium">
                              {t(variant.label, variant.labelEn)}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {expanded === 'brightness' && (
                <div className="flex items-center gap-3">
                  <span className="text-xs opacity-75 shrink-0 w-10">{t('亮度', 'Brightness')}</span>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={brightness}
                    onChange={(e) => onBrightnessChange(parseFloat(e.target.value))}
                    className={SLIDER_STYLES}
                    style={{ backgroundColor: currentBackground.isDarkScheme ? 'rgba(148, 163, 184, 0.35)' : '#e2e8f0' }}
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

export { FONT_OPTIONS }
