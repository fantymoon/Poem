import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { CardSVG } from '../components/CardSVG'
import type { Card, Poem } from './types'
import { paperDims } from './cardStyle'

export function cardSVGString(card: Card): string {
  return renderToStaticMarkup(createElement(CardSVG, { poem: card.poem, style: card.style }))
}

function withSize(svgStr: string, w: number, h: number): string {
  const doc = new DOMParser().parseFromString(svgStr, 'image/svg+xml')
  const svg = doc.documentElement
  svg.setAttribute('width', String(w))
  svg.setAttribute('height', String(h))
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  return new XMLSerializer().serializeToString(svg)
}

export async function rasterize(svgStr: string, w: number, h: number, scale: number, bg?: string): Promise<Blob> {
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready } catch { /* ignore */ }
  }
  const sized = withSize(svgStr, Math.round(w * scale), Math.round(h * scale))
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized)
  const img = new Image()
  img.decoding = 'async'
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('SVG 渲染失败'))
    img.src = url
  })
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  const ctx = canvas.getContext('2d')!
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height) }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('导出失败'))), 'image/png')
  })
}

export function cardFilename(poem: Poem, ext = 'png'): string {
  const title = (poem.title || '无题').replace(/[\\/:*?"<>|]/g, '').slice(0, 24)
  return `${title}_${poem.date || ''}.${ext}`
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function downloadText(text: string, filename: string, mime = 'application/json') {
  downloadBlob(new Blob([text], { type: mime }), filename)
}

export async function exportCardPNG(card: Card, scale: number) {
  const { w, h } = paperDims(card.style.paper)
  const blob = await rasterize(cardSVGString(card), w, h, scale)
  downloadBlob(blob, cardFilename(card.poem))
}

// A4 一拼四 with white margin + crop marks (spec 3.2 导出)
export async function exportPrintSheet(card: Card) {
  const { w, h } = paperDims(card.style.paper)
  const A4W = 2480
  const A4H = 3508
  const margin = 160
  const gap = 80
  const cellW = (A4W - margin * 2 - gap) / 2
  const cellH = (A4H - margin * 2 - gap) / 2
  const fit = Math.min(cellW / w, cellH / h)
  const cw = w * fit
  const ch = h * fit
  const cardBlob = await rasterize(cardSVGString(card), w, h, fit)
  const cardUrl = URL.createObjectURL(cardBlob)
  const img = new Image()
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('渲染失败')); img.src = cardUrl })

  const canvas = document.createElement('canvas')
  canvas.width = A4W
  canvas.height = A4H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, A4W, A4H)
  const positions = [
    [margin, margin], [margin + cellW + gap, margin],
    [margin, margin + cellH + gap], [margin + cellW + gap, margin + cellH + gap],
  ]
  ctx.strokeStyle = '#999'
  ctx.lineWidth = 1.5
  for (const [px, py] of positions) {
    const ox = px + (cellW - cw) / 2
    const oy = py + (cellH - ch) / 2
    ctx.drawImage(img, ox, oy, cw, ch)
    // crop marks
    const m = 24
    ctx.beginPath()
    ctx.moveTo(ox - m, oy); ctx.lineTo(ox - 6, oy)
    ctx.moveTo(ox, oy - m); ctx.lineTo(ox, oy - 6)
    ctx.moveTo(ox + cw + 6, oy); ctx.lineTo(ox + cw + m, oy)
    ctx.moveTo(ox + cw, oy - m); ctx.lineTo(ox + cw, oy - 6)
    ctx.moveTo(ox - m, oy + ch); ctx.lineTo(ox - 6, oy + ch)
    ctx.moveTo(ox, oy + ch + 6); ctx.lineTo(ox, oy + ch + m)
    ctx.moveTo(ox + cw + 6, oy + ch); ctx.lineTo(ox + cw + m, oy + ch)
    ctx.moveTo(ox + cw, oy + ch + 6); ctx.lineTo(ox + cw, oy + ch + m)
    ctx.stroke()
  }
  URL.revokeObjectURL(cardUrl)
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('导出失败'))), 'image/png'))
  downloadBlob(blob, cardFilename(card.poem).replace('.png', '_打印版A4.png'))
}

export async function cardToDataURL(card: Card, scale = 1): Promise<string> {
  const { w, h } = paperDims(card.style.paper)
  const blob = await rasterize(cardSVGString(card), w, h, scale)
  return await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(blob) })
}