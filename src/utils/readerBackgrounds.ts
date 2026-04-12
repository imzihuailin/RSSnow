const backgroundBasePath = `${import.meta.env.BASE_URL}reader-backgrounds`

export type ReaderColorId = 'white' | 'yellow' | 'green' | 'dark'
export type ReaderBackgroundVariantId = 'pure' | 'moon' | 'scene'

export interface ReaderColorOption {
  id: ReaderColorId
  label: string
  labelEn: string
  previewImage: string
  previewBorder: string
  overlayTint: string
  previewTextColor: string
}

export interface ReaderBackgroundVariantOption {
  id: ReaderBackgroundVariantId
  label: string
  labelEn: string
}

export interface ReaderBackground {
  id: string
  colorId: ReaderColorId
  backgroundVariantId: ReaderBackgroundVariantId
  image: string
  textColor: string
  linkColor: string
  surfaceOverlay: string
  borderColor: string
  isDarkScheme: boolean
  fallbackColor: string
  pageScrim: string
  previewPosition: string
  pagePosition: string
}

const createAssetPath = (filename: string) => `${backgroundBasePath}/${filename}`

export const READER_COLOR_OPTIONS: ReaderColorOption[] = [
  {
    id: 'white',
    label: '白色',
    labelEn: 'White',
    previewImage: createAssetPath('white-pure.jpg'),
    previewBorder: '#d7dfeb',
    overlayTint: 'rgba(255,255,255,0.14)',
    previewTextColor: '#1f2937',
  },
  {
    id: 'yellow',
    label: '黄色',
    labelEn: 'Yellow',
    previewImage: createAssetPath('yellow-pure.jpg'),
    previewBorder: '#efc678',
    overlayTint: 'rgba(255,255,255,0.14)',
    previewTextColor: '#3f2f12',
  },
  {
    id: 'green',
    label: '绿色',
    labelEn: 'Green',
    previewImage: createAssetPath('green-pure.jpg'),
    previewBorder: '#4aa95b',
    overlayTint: 'rgba(255,255,255,0.14)',
    previewTextColor: '#1f3b28',
  },
  {
    id: 'dark',
    label: '深色',
    labelEn: 'Dark',
    previewImage: createAssetPath('dark-pure.jpg'),
    previewBorder: '#4d5b7a',
    overlayTint: 'rgba(4,8,16,0.18)',
    previewTextColor: '#f8fafc',
  },
]

export const READER_BACKGROUND_VARIANTS: ReaderBackgroundVariantOption[] = [
  { id: 'pure', label: '纯色', labelEn: 'Pure' },
  { id: 'moon', label: '月色', labelEn: 'Moon' },
  { id: 'scene', label: '景色', labelEn: 'Scene' },
]

const BACKGROUND_MAP: Record<ReaderColorId, Record<ReaderBackgroundVariantId, ReaderBackground>> = {
  white: {
    pure: {
      id: 'white-pure',
      colorId: 'white',
      backgroundVariantId: 'pure',
      image: createAssetPath('white-pure.jpg'),
      textColor: '#1f2937',
      linkColor: '#2563eb',
      surfaceOverlay: 'rgba(255,255,255,0.68)',
      borderColor: 'rgba(82,97,122,0.18)',
      isDarkScheme: false,
      fallbackColor: '#f8fbff',
      pageScrim: 'rgba(255,255,255,0.08)',
      previewPosition: 'center center',
      pagePosition: 'center top',
    },
    moon: {
      id: 'white-moon',
      colorId: 'white',
      backgroundVariantId: 'moon',
      image: createAssetPath('white-moon.jpg'),
      textColor: '#1e293b',
      linkColor: '#2563eb',
      surfaceOverlay: 'rgba(255,255,255,0.58)',
      borderColor: 'rgba(82,97,122,0.18)',
      isDarkScheme: false,
      fallbackColor: '#dfeeff',
      pageScrim: 'rgba(255,255,255,0.08)',
      previewPosition: 'center top',
      pagePosition: 'center top',
    },
    scene: {
      id: 'white-scene',
      colorId: 'white',
      backgroundVariantId: 'scene',
      image: createAssetPath('white-scene.jpg'),
      textColor: '#1e293b',
      linkColor: '#2563eb',
      surfaceOverlay: 'rgba(255,255,255,0.56)',
      borderColor: 'rgba(82,97,122,0.18)',
      isDarkScheme: false,
      fallbackColor: '#dbeafe',
      pageScrim: 'rgba(255,255,255,0.08)',
      previewPosition: 'center top',
      pagePosition: 'center bottom',
    },
  },
  yellow: {
    pure: {
      id: 'yellow-pure',
      colorId: 'yellow',
      backgroundVariantId: 'pure',
      image: createAssetPath('yellow-pure.jpg'),
      textColor: '#5f4523',
      linkColor: '#b45309',
      surfaceOverlay: 'rgba(255,247,232,0.7)',
      borderColor: 'rgba(169,113,42,0.2)',
      isDarkScheme: false,
      fallbackColor: '#f8ead7',
      pageScrim: 'rgba(255,248,240,0.08)',
      previewPosition: 'center center',
      pagePosition: 'center top',
    },
    moon: {
      id: 'yellow-moon',
      colorId: 'yellow',
      backgroundVariantId: 'moon',
      image: createAssetPath('yellow-moon.jpg'),
      textColor: '#5f4523',
      linkColor: '#c26d12',
      surfaceOverlay: 'rgba(255,245,235,0.56)',
      borderColor: 'rgba(169,113,42,0.2)',
      isDarkScheme: false,
      fallbackColor: '#f6eadf',
      pageScrim: 'rgba(255,244,236,0.08)',
      previewPosition: 'center top',
      pagePosition: 'center top',
    },
    scene: {
      id: 'yellow-scene',
      colorId: 'yellow',
      backgroundVariantId: 'scene',
      image: createAssetPath('yellow-scene.jpg'),
      textColor: '#5f4523',
      linkColor: '#b45309',
      surfaceOverlay: 'rgba(255,246,232,0.56)',
      borderColor: 'rgba(169,113,42,0.2)',
      isDarkScheme: false,
      fallbackColor: '#f7e7d5',
      pageScrim: 'rgba(255,244,236,0.08)',
      previewPosition: 'center top',
      pagePosition: 'center bottom',
    },
  },
  green: {
    pure: {
      id: 'green-pure',
      colorId: 'green',
      backgroundVariantId: 'pure',
      image: createAssetPath('green-pure.jpg'),
      textColor: '#1c4d2c',
      linkColor: '#15803d',
      surfaceOverlay: 'rgba(240,255,240,0.68)',
      borderColor: 'rgba(32,104,52,0.2)',
      isDarkScheme: false,
      fallbackColor: '#dbf4d5',
      pageScrim: 'rgba(248,255,248,0.08)',
      previewPosition: 'center center',
      pagePosition: 'center top',
    },
    moon: {
      id: 'green-moon',
      colorId: 'green',
      backgroundVariantId: 'moon',
      image: createAssetPath('green-moon.jpg'),
      textColor: '#18442f',
      linkColor: '#0f8b8d',
      surfaceOverlay: 'rgba(241,255,243,0.48)',
      borderColor: 'rgba(32,104,52,0.2)',
      isDarkScheme: false,
      fallbackColor: '#d8f9d4',
      pageScrim: 'rgba(250,255,250,0.08)',
      previewPosition: 'center top',
      pagePosition: 'center top',
    },
    scene: {
      id: 'green-scene',
      colorId: 'green',
      backgroundVariantId: 'scene',
      image: createAssetPath('green-scene.jpg'),
      textColor: '#18442f',
      linkColor: '#15803d',
      surfaceOverlay: 'rgba(245,255,245,0.46)',
      borderColor: 'rgba(32,104,52,0.2)',
      isDarkScheme: false,
      fallbackColor: '#d7f5d8',
      pageScrim: 'rgba(250,255,250,0.08)',
      previewPosition: 'center bottom',
      pagePosition: 'center bottom',
    },
  },
  dark: {
    pure: {
      id: 'dark-pure',
      colorId: 'dark',
      backgroundVariantId: 'pure',
      image: createAssetPath('dark-pure.jpg'),
      textColor: '#e5edf7',
      linkColor: '#7dd3fc',
      surfaceOverlay: 'rgba(8,12,20,0.72)',
      borderColor: 'rgba(206,227,255,0.18)',
      isDarkScheme: true,
      fallbackColor: '#0a0f1c',
      pageScrim: 'rgba(5,10,18,0.28)',
      previewPosition: 'center center',
      pagePosition: 'center top',
    },
    moon: {
      id: 'dark-moon',
      colorId: 'dark',
      backgroundVariantId: 'moon',
      image: createAssetPath('dark-moon.jpg'),
      textColor: '#eff6ff',
      linkColor: '#7dd3fc',
      surfaceOverlay: 'rgba(5,10,18,0.56)',
      borderColor: 'rgba(206,227,255,0.18)',
      isDarkScheme: true,
      fallbackColor: '#09111f',
      pageScrim: 'rgba(2,6,12,0.3)',
      previewPosition: 'center top',
      pagePosition: 'center top',
    },
    scene: {
      id: 'dark-scene',
      colorId: 'dark',
      backgroundVariantId: 'scene',
      image: createAssetPath('dark-scene.jpg'),
      textColor: '#eff6ff',
      linkColor: '#7dd3fc',
      surfaceOverlay: 'rgba(5,10,18,0.58)',
      borderColor: 'rgba(206,227,255,0.18)',
      isDarkScheme: true,
      fallbackColor: '#0a1120',
      pageScrim: 'rgba(3,7,12,0.28)',
      previewPosition: 'center top',
      pagePosition: 'center bottom',
    },
  },
}

export function isReaderColorId(value: unknown): value is ReaderColorId {
  return typeof value === 'string' && value in BACKGROUND_MAP
}

export function isReaderBackgroundVariantId(value: unknown): value is ReaderBackgroundVariantId {
  return typeof value === 'string' && value in BACKGROUND_MAP.white
}

export function resolveLegacyBackgroundId(bgId?: string | null): {
  colorId: ReaderColorId
  backgroundVariantId: ReaderBackgroundVariantId
} {
  if (bgId === 'yellow') return { colorId: 'yellow', backgroundVariantId: 'pure' }
  if (bgId === 'green') return { colorId: 'green', backgroundVariantId: 'pure' }
  if (bgId === 'dark') return { colorId: 'dark', backgroundVariantId: 'pure' }
  return { colorId: 'white', backgroundVariantId: 'pure' }
}

export function getReaderBackground(
  colorId: ReaderColorId,
  backgroundVariantId: ReaderBackgroundVariantId
): ReaderBackground {
  return BACKGROUND_MAP[colorId][backgroundVariantId]
}
