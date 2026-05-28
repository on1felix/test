import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Trophy, Coins, BarChart3, CalendarDays, Flame, TrendingUp, TrendingDown } from 'lucide-react';

const currencySymbols = { RUB: '₽', USD: '$', EUR: '€', KGS: 'с' };

const monthsShortRu = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

const pluralWeeks = (n) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'неделя';
  if ([2, 3, 4].includes(m10) && ![12, 13, 14].includes(m100)) return 'недели';
  return 'недель';
};

const fmtNum = (n) => n.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
const fmtNum2 = (n) => n.toLocaleString('ru-RU', { maximumFractionDigits: 2 });

function startOfWeek(d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

const formatWeekLabel = (d) => `${d.getDate()} ${monthsShortRu[d.getMonth()]}`;

const SVG_W = 600;
const SVG_H = 130;

// motion presets — вынесены, чтобы избежать двойных фигурных в JSX
const cardMotion = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: 0.25 },
};
const valueSwap = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.35 },
};
const chartFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.3 },
};

function makeBarMotion(i, targetY, targetHeight) {
  return {
    initial: { y: SVG_H, height: 0 },
    animate: { y: targetY, height: targetHeight },
    transition: { duration: 0.8, delay: 0.1 + i * 0.07, ease: [0.16, 1, 0.3, 1] },
  };
}

export default function SavingsStats({ transactions = [], currency = 'RUB' }) {
  const symbol = currencySymbols[currency] || '₽';

  const stats = useMemo(() => {
    if (!transactions.length) {
      return {
        total: 0,
        count: 0,
        biggest: 0,
        avgDeposit: 0,
        thisMonth: 0,
        prevMonth: 0,
        weeks: [],
        maxWeek: 0,
        streak: 0,
      };
    }

    const txs = transactions
      .map((t) => ({ amount: parseFloat(t.amount), date: new Date(t.created_at) }))
      .sort((a, b) => a.date - b.date);

    const total = txs.reduce((s, t) => s + t.amount, 0);
    const count = txs.length;
    const biggest = Math.max(...txs.map((t) => t.amount));
    const avgDeposit = total / count;

    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();
    const prevDate = new Date(curYear, curMonth - 1, 1);
    const prevMonth = prevDate.getMonth();
    const prevYear = prevDate.getFullYear();

    const thisMonthTotal = txs
      .filter((t) => t.date.getMonth() === curMonth && t.date.getFullYear() === curYear)
      .reduce((s, t) => s + t.amount, 0);
    const prevMonthTotal = txs
      .filter((t) => t.date.getMonth() === prevMonth && t.date.getFullYear() === prevYear)
      .reduce((s, t) => s + t.amount, 0);

    const WEEKS = 8;
    const weeks = [];
    const startThisWeek = startOfWeek(now);
    for (let i = WEEKS - 1; i >= 0; i--) {
      const ws = new Date(startThisWeek);
      ws.setDate(ws.getDate() - i * 7);
      const we = new Date(ws);
      we.setDate(we.getDate() + 7);
      const sum = txs
        .filter((t) => t.date >= ws && t.date < we)
        .reduce((s, t) => s + t.amount, 0);
      weeks.push({ start: ws, amount: sum });
    }
    const maxWeek = Math.max(...weeks.map((w) => w.amount), 1);

    let streak = 0;
    for (let i = weeks.length - 1; i >= 0; i--) {
      if (weeks[i].amount > 0) streak++;
      else break;
    }

    return {
      total,
      count,
      biggest,
      avgDeposit,
      thisMonth: thisMonthTotal,
      prevMonth: prevMonthTotal,
      weeks,
      maxWeek,
      streak,
    };
  }, [transactions]);

  const monthDelta = stats.thisMonth - stats.prevMonth;
  const chartKey = `${transactions.length}-${stats.total}-${stats.thisMonth}`;

  // SVG-бары: предвычисляем геометрию
  const bars = useMemo(() => {
    if (!stats.weeks.length || stats.maxWeek <= 0) return [];
    const slotW = SVG_W / stats.weeks.length;
    const barWidth = slotW * 0.62;
    return stats.weeks.map((w, i) => {
      const rawH = (w.amount / stats.maxWeek) * (SVG_H - 6);
      const barHeight = w.amount > 0 ? Math.max(6, rawH) : 4;
      const barY = SVG_H - barHeight;
      const barX = i * slotW + (slotW - barWidth) / 2;
      return {
        x: barX,
        y: barY,
        width: barWidth,
        height: barHeight,
        amount: w.amount,
        isActive: w.amount > 0,
      };
    });
  }, [stats.weeks, stats.maxWeek]);

  // Сетка для дат под графиком
  const dateGridStyle = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${stats.weeks.length || 8}, minmax(0, 1fr))`,
    }),
    [stats.weeks.length],
  );

  return (
    <motion.div
      {...cardMotion}
      className="relative overflow-hidden backdrop-blur-sm bg-dark-light/30 border-2 border-primary/20 rounded-3xl p-5 md:p-6"
    >
      <div className="pointer-events-none absolute -top-32 -left-32 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-72 h-72 bg-accent/15 rounded-full blur-3xl" />

      <div className="relative flex items-center gap-3 mb-5">
        <div className="p-2 border border-accent/20 rounded-xl bg-accent/5">
          <Activity className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-display font-bold">Активность</h2>
          <p className="text-sm text-gray-400">Динамика по неделям и личные рекорды</p>
        </div>
      </div>

      <div className="relative grid grid-cols-2 gap-3 mb-5">
        <MiniStat
          icon={<Coins className="w-4 h-4 text-success" />}
          label="Этот месяц"
          value={`${fmtNum(stats.thisMonth)} ${symbol}`}
          delta={stats.count > 0 ? monthDelta : null}
          deltaSymbol={symbol}
          swapKey={`m-${stats.thisMonth}`}
        />
        <MiniStat
          icon={<Trophy className="w-4 h-4 text-secondary" />}
          label="Самое крупное"
          value={stats.biggest > 0 ? `${fmtNum2(stats.biggest)} ${symbol}` : '—'}
          swapKey={`b-${stats.biggest}`}
        />
        <MiniStat
          icon={<BarChart3 className="w-4 h-4 text-primary" />}
          label="Всего пополнений"
          value={`${stats.count}`}
          sub={stats.avgDeposit > 0 ? `~${fmtNum2(stats.avgDeposit)} ${symbol} в среднем` : null}
          swapKey={`c-${stats.count}`}
        />
        <MiniStat
          icon={<Flame className="w-4 h-4 text-secondary" />}
          label="Серия"
          value={stats.streak > 0 ? `${stats.streak} ${pluralWeeks(stats.streak)}` : '—'}
          sub="подряд с пополнением"
          swapKey={`s-${stats.streak}`}
        />
      </div>

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-accent" />
            Последние 8 недель
          </span>
          {stats.maxWeek > 0 && (
            <span className="text-xs text-gray-500">
              Макс: {fmtNum(stats.maxWeek)} {symbol}
            </span>
          )}
        </div>

        {bars.length > 0 ? (
          <>
            <motion.svg
              key={chartKey}
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              className="w-full h-28"
              preserveAspectRatio="none"
              {...chartFade}
            >
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF6584" />
                  <stop offset="50%" stopColor="#00D9FF" />
                  <stop offset="100%" stopColor="#6C63FF" />
                </linearGradient>
                <filter id="barGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {bars.map((b, i) => (
                <motion.rect
                  key={`bar-${i}`}
                  x={b.x}
                  width={b.width}
                  rx="4"
                  fill={b.isActive ? 'url(#barGrad)' : 'rgba(108,99,255,0.12)'}
                  filter={b.isActive ? 'url(#barGlow)' : undefined}
                  {...makeBarMotion(i, b.y, b.height)}
                >
                  <title>{`${formatWeekLabel(stats.weeks[i].start)}: ${fmtNum2(b.amount)} ${symbol}`}</title>
                </motion.rect>
              ))}
            </motion.svg>

            <div className="grid mt-1.5" style={dateGridStyle}>
              {stats.weeks.map((w, i) => (
                <span
                  key={`lbl-${i}`}
                  className="text-[10px] text-gray-500 text-center truncate"
                >
                  {formatWeekLabel(w.start)}
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="h-28 flex items-center justify-center text-gray-500 text-sm border border-primary/10 rounded-2xl">
            Пополни копилку — появится график по неделям
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MiniStat({ icon, label, value, sub, delta, deltaSymbol, swapKey }) {
  return (
    <div className="bg-dark-light/40 backdrop-blur-sm border border-primary/10 rounded-2xl p-3 hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-1">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={swapKey || value}
          {...valueSwap}
          className="text-base md:text-lg font-display font-semibold text-white"
        >
          {value}
        </motion.div>
      </AnimatePresence>
      {delta != null && delta !== 0 && (
        <div
          className={`flex items-center gap-1 text-[11px] mt-0.5 ${
            delta >= 0 ? 'text-success' : 'text-secondary'
          }`}
        >
          {delta >= 0 ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span>
            {delta >= 0 ? '+' : '−'}
            {fmtNum(Math.abs(delta))} {deltaSymbol} к прош. мес.
          </span>
        </div>
      )}
      {sub && <div className="text-[11px] text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}
