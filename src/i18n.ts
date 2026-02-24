let lang: string = localStorage.getItem('lang') || 'en'

export function getLang() {
  return lang
}

export function setLang(newLang: string) {
  lang = newLang
  localStorage.setItem('lang', newLang)
  window.dispatchEvent(new Event('langchange'))
}

export function t(zh: string, en: string) {
  return lang === 'zh' ? zh : en
}
