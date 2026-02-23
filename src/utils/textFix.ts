const SPACE_LIKE_PATTERN = '[\\s\\u00A0]'

export function fixBrokenEmDash(text: string): string {
  if (!text.includes('�')) return text
  const brokenDashBetweenSpaces = new RegExp(`(${SPACE_LIKE_PATTERN})�(${SPACE_LIKE_PATTERN})`, 'g')
  return text.replace(brokenDashBetweenSpaces, '$1—$2')
}

export async function readResponseTextWithEmDashFix(response: Response): Promise<string> {
  const raw = await response.text()
  return fixBrokenEmDash(raw)
}
