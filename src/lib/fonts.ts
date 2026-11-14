import type { FontDef } from './types'

// System CJK fonts so the whole thing runs offline (spec: 全部可离线运行).
export const FONTS: FontDef[] = [
  { id: 'song', name: '宋体', stack: '"Songti SC","STSong","SimSun","Noto Serif CJK SC",serif', vertical: true },
  { id: 'kai', name: '楷体', stack: '"STKaiti","KaiTi","SimKai","Kaiti SC",serif', vertical: true },
  { id: 'fang', name: '仿宋', stack: '"STFangsong","FangSong","SimFang","FangSong_GB2312",serif', vertical: true },
  { id: 'hei', name: '黑体', stack: '"PingFang SC","Microsoft YaHei","SimHei","Noto Sans CJK SC",sans-serif', vertical: true },
  { id: 'lishu', name: '隶书', stack: '"STLiti","LiSu","SimLi",serif', vertical: true },
]

export function fontStack(id: string | null | undefined): string {
  const f = FONTS.find((x) => x.id === id)
  return f ? f.stack : FONTS[0].stack
}

export function fontName(id: string | null | undefined): string {
  const f = FONTS.find((x) => x.id === id)
  return f ? f.name : '宋体'
}