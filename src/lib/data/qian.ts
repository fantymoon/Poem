import { seededRng, pick, pickInt } from '../rng'

// 今日一签 — original slip content. tone: serious 正经 / playful 不正经.
export interface QianLine {
  text: string
  tone: 'serious' | 'playful'
}

export const QIAN_LINES: QianLine[] = [
  { text: '把旧信摊在膝上，风替我读完了后半句', tone: 'serious' },
  { text: '渡口的灯还亮着，等一个不再来的人', tone: 'serious' },
  { text: '雪落进空碗，盛住了整个冬天的安静', tone: 'serious' },
  { text: '你说远方，我便把门留了一条缝', tone: 'serious' },
  { text: '潮水退去，礁石替海保管了秘密', tone: 'serious' },
  { text: '黄昏是一封没有署名的长信', tone: 'serious' },
  { text: '我把名字写在水上，看它慢慢学会离开', tone: 'serious' },
  { text: '灯芯结了花，夜就轻了一寸', tone: 'serious' },
  { text: '山寺的钟，替沉默的人数着心跳', tone: 'serious' },
  { text: '旧站台记得每一双迟到的鞋', tone: 'serious' },
  { text: '月光把庭院翻成一本旧书', tone: 'serious' },
  { text: '你走后，春天迟到了整整一个节气', tone: 'serious' },
  { text: '铜镜里的人，先我一步白了头', tone: 'serious' },
  { text: '风筝断线那刻，天空忽然辽阔得可怕', tone: 'serious' },
  { text: '我把归期折成纸船，放进檐下的雨', tone: 'serious' },
  { text: '荒园里的草，替谁守着空了的秋千', tone: 'serious' },
  { text: '霜降以后，连影子都学会了轻手轻脚', tone: 'serious' },
  { text: '灯塔转了一夜，只为照亮一次告别', tone: 'serious' },
  { text: '砚台干了，字却还在纸上呼吸', tone: 'serious' },
  { text: '候鸟南飞，把北方留给更耐寒的思念', tone: 'serious' },
  { text: '天井里那口缸，盛着半亩会动的天', tone: 'serious' },
  { text: '火柴擦亮的一瞬，我看见了整间屋子的从前', tone: 'serious' },
  { text: '雾把远山藏起来，像藏一句说不出口的话', tone: 'serious' },
  { text: '断桥不断，断的是来来往往的人', tone: 'serious' },
  { text: '我在旧信里夹了一片今年才落的叶', tone: 'serious' },
  { text: '晚风翻页，读到我们那章就停住了', tone: 'serious' },
  { text: '盐场晒着海，也晒着说不出口的咸', tone: 'serious' },
  { text: '怀表停在三点，那一刻你正好回头', tone: 'serious' },
  { text: '灯笼晃了晃，把影子交还给了墙', tone: 'serious' },
  { text: '初雪覆盖了脚印，却没覆盖来时的方向', tone: 'serious' },
  { text: '钥匙还在，锁却换了一扇门', tone: 'serious' },
  { text: '河堤上的草，绿得像是替谁着急', tone: 'serious' },
  { text: '把船票退了，远方就退回成一个词', tone: 'serious' },
  { text: '流星划过，我许愿的手还停在半空', tone: 'serious' },
  { text: '木梳断了一齿，梳不动的那段叫往事', tone: 'serious' },
  { text: '檐角的铃，替风说了整夜的话', tone: 'serious' },
  { text: '闹钟响了三遍，梦才肯放我出门', tone: 'playful' },
  { text: '今天的勇气，刚好够按下发送键', tone: 'playful' },
  { text: '冰箱里的灯，是深夜唯一肯等我的人', tone: 'playful' },
  { text: '把烦恼折好，塞进明天再拆', tone: 'playful' },
  { text: '咖啡因和灵感，今天只有一个上班', tone: 'playful' },
  { text: '体重秤沉默了，它比我更懂得分寸', tone: 'playful' },
  { text: '外卖到了，诗和远方先放一放', tone: 'playful' },
  { text: '我假装很忙，其实是在等一个消息', tone: 'playful' },
  { text: '周一是一封催稿信，我是一只会拖稿的猫', tone: 'playful' },
  { text: '存钱罐空了，梦想却胖了一圈', tone: 'playful' },
  { text: '今天宜发呆，忌把发呆写进周报', tone: 'playful' },
  { text: '手机剩百分之三，像我剩下的耐心', tone: 'playful' },
  { text: '被窝是结界，起床是破戒', tone: 'playful' },
  { text: '我把计划写得很满，好让明天有的忙', tone: 'playful' },
  { text: '减肥从明天开始，明天从后天开始', tone: 'playful' },
  { text: '今天的风很大，刚好吹散没必要的清醒', tone: 'playful' },
]

export const YI_BANK: QianLine[] = [
  { text: '把话说完', tone: 'serious' }, { text: '给旧友写信', tone: 'serious' },
  { text: '早睡', tone: 'serious' }, { text: '整理抽屉', tone: 'serious' },
  { text: '走一段没走过的路', tone: 'serious' }, { text: '把伞借人', tone: 'serious' },
  { text: '读半本旧书', tone: 'serious' }, { text: '给植物浇水', tone: 'serious' },
  { text: '认真告别', tone: 'serious' }, { text: '留一盏灯', tone: 'serious' },
  { text: '慢一点', tone: 'serious' }, { text: '把窗打开', tone: 'serious' },
  { text: '承认想念', tone: 'serious' }, { text: '做一件小事', tone: 'serious' },
  { text: '晒被子', tone: 'playful' }, { text: '点一杯热的', tone: 'playful' },
  { text: '摸鱼十分钟', tone: 'playful' }, { text: '给妈妈打电话', tone: 'playful' },
  { text: '清空购物车', tone: 'playful' }, { text: '理直气壮地休息', tone: 'playful' },
  { text: '吃顿好的', tone: 'playful' }, { text: '把闹钟往后调', tone: 'playful' },
]

export const JI_BANK: QianLine[] = [
  { text: '翻旧账', tone: 'serious' }, { text: '深夜决定', tone: 'serious' },
  { text: '勉强自己', tone: 'serious' }, { text: '回头', tone: 'serious' },
  { text: '把话说满', tone: 'serious' }, { text: '独自远行', tone: 'serious' },
  { text: '轻信诺言', tone: 'serious' }, { text: '熬夜', tone: 'serious' },
  { text: '强留', tone: 'serious' }, { text: '在雨里等', tone: 'serious' },
  { text: '逞强', tone: 'serious' }, { text: '追问答案', tone: 'serious' },
  { text: '空腹开会', tone: 'playful' }, { text: '立flag', tone: 'playful' },
  { text: '称体重', tone: 'playful' }, { text: '看余额', tone: 'playful' },
  { text: '回复所有消息', tone: 'playful' }, { text: '跟杠精讲理', tone: 'playful' },
  { text: '深夜下单', tone: 'playful' }, { text: '假装不困', tone: 'playful' },
]

export const THEME_BANK = [
  '塔', '渡口', '旧信', '初雪', '黄昏', '灯', '潮', '钥匙', '风筝', '砚',
  '桥', '盐', '钟', '雾', '船', '窗', '霜', '火柴', '月台', '荒园',
  '铃', '镜', '雨', '候鸟', '灯塔', '纸船', '门槛', '回声', '余烬', '远山',
]

const CN_NUM = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
  '卅一', '卅二', '卅三', '卅四', '卅五', '卅六', '卅七', '卅八', '卅九', '四十',
  '卌一', '卌二', '卌三', '卌四', '卌五', '卌六', '卌七', '卌八', '卌九', '五十',
  '五一', '五二', '五三', '五四', '五五', '五六', '五七', '五八', '五九', '六十',
  '六一', '六二', '六三', '六四', '六五', '六六', '六七', '六八', '六九', '七十',
  '七一', '七二', '七三', '七四', '七五', '七六', '七七', '七八', '七九', '八十',
  '八一', '八二', '八三', '八四', '八五', '八六', '八七', '八八', '八九', '九十',
  '九一', '九二', '九三', '九四', '九五', '九六', '九七', '九八', '九九', '一百']

export interface QianResult {
  date: string
  number: number
  numberLabel: string
  poem: string
  yi: string
  ji: string
  theme: string
  tone: 'serious' | 'playful'
}

export function qianForDate(date: string, style: 'serious' | 'playful' | 'mixed'): QianResult {
  const rng = seededRng('yijian-qian-' + date)
  const filter = <T extends QianLine>(arr: T[]) =>
    style === 'mixed' ? arr : arr.filter((x) => x.tone === style)
  const line = pick(rng, filter(QIAN_LINES))
  const yi = pick(rng, filter(YI_BANK))
  const ji = pick(rng, filter(JI_BANK))
  const theme = pick(rng, THEME_BANK)
  const number = pickInt(rng, 100) + 1
  return {
    date,
    number,
    numberLabel: `第${CN_NUM[number] || number}签`,
    poem: line.text,
    yi: yi.text,
    ji: ji.text,
    theme,
    tone: line.tone,
  }
}