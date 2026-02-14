const READING_PREFERENCES_KEY = 'rssnow_reading_preferences'

export interface ReadingPreferences {
  fontId: string
  fontSize: number
  lineHeight: number
  bgId: string
  brightness: number
}

const DEFAULTS: ReadingPreferences = {
  fontId: 'serif',
  fontSize: 18,
  lineHeight: 1.6,
  bgId: 'white',
  brightness: 1,
}

export function getReadingPreferences(): ReadingPreferences {
  try {
    const data = localStorage.getItem(READING_PREFERENCES_KEY)
    if (!data) return { ...DEFAULTS }
    const raw = JSON.parse(data)
    return {
      fontId: typeof raw.fontId === 'string' ? raw.fontId : DEFAULTS.fontId,
      fontSize: typeof raw.fontSize === 'number' ? Math.max(14, Math.min(24, raw.fontSize)) : DEFAULTS.fontSize,
      lineHeight: typeof raw.lineHeight === 'number' ? Math.max(1.2, Math.min(2.2, raw.lineHeight)) : DEFAULTS.lineHeight,
      bgId: typeof raw.bgId === 'string' ? raw.bgId : DEFAULTS.bgId,
      brightness: typeof raw.brightness === 'number' ? Math.max(0.5, Math.min(1.5, raw.brightness)) : DEFAULTS.brightness,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveReadingPreferences(prefs: Partial<ReadingPreferences>): void {
  try {
    const current = getReadingPreferences()
    const next = { ...current, ...prefs }
    localStorage.setItem(READING_PREFERENCES_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}
