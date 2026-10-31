import boldUrl from '@expo-google-fonts/roboto/700Bold/Roboto_700Bold.ttf?url'
import regularUrl from '@expo-google-fonts/roboto/400Regular/Roboto_400Regular.ttf?url'
import { arrayBufferToBase64, type EmbeddedFont } from './exportPdf'

let cache: Promise<EmbeddedFont[]> | null = null

async function load(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Falha ao carregar fonte ${url}`)
  return arrayBufferToBase64(await res.arrayBuffer())
}

/** Roboto (Apache 2.0) regular e negrito, para embutir no PDF. */
export function loadPdfFonts(): Promise<EmbeddedFont[]> {
  cache ??= Promise.all([load(regularUrl), load(boldUrl)]).then(([regular, bold]) => [
    { family: 'Roboto', style: 'normal', fileName: 'Roboto-Regular.ttf', base64: regular },
    { family: 'Roboto', style: 'bold', fileName: 'Roboto-Bold.ttf', base64: bold },
  ])
  return cache
}

let registered: Promise<void> | null = null

/**
 * Registra a mesma Roboto como webfont, para o preview na tela e a medição de
 * texto do svg2pdf (getBBox) usarem exatamente a fonte embutida no PDF.
 */
export function registerWebFonts(): Promise<void> {
  registered ??= Promise.all([
    new FontFace('Roboto', `url(${regularUrl})`, { weight: '400' }).load(),
    new FontFace('Roboto', `url(${boldUrl})`, { weight: '700' }).load(),
  ]).then((faces) => faces.forEach((f) => document.fonts.add(f)))
  return registered
}
