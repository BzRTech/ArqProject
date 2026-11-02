/**
 * Cores da INTERFACE sobre o desenho (seleção, guias, grade), do design system. O desenho técnico
 * em si (penas, hachuras, cotas) não usa estas cores: segue a norma, igual ao PDF.
 */
export const UI = {
  clay: '#a65f45', // seleção e foco
  claySoft: 'rgba(166, 95, 69, 0.08)',
  sage: '#6f7b66', // alinhado / cruzamento
  sageSoft: 'rgba(111, 123, 102, 0.1)',
  ink: '#1c1b19',
  muted: '#8a857c',
  brick: '#a8473a',
  white: '#ffffff',
  canvas: '#f8f6f2',
  gridMinor: 'rgba(28, 27, 25, 0.05)',
  gridMajor: 'rgba(28, 27, 25, 0.1)',
} as const
