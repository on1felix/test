import { useMemo } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, CalendarClock, Zap, Sparkles, Target } from 'lucide-react';

const currencySymbols = { RUB: '₽', USD: '$', EUR: '€', KGS: 'с' };

const monthsRu = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function formatDateRu(d) {
  return `${d.getDate()} ${monthsRu[d.getMonth()]} ${d.getFullYear()}`;
}

function pluralDays(n) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'день';
  if ([2, 3, 4].includes(m10) && ![12, 13, 14].includes(m100)) return 'дня';
  return 'дней';
}

const cardMotion = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: 0.15 },
};

const lineMotion = {
  initial: { pathLength: 0 },
  animate: { pathLength: 1 },
  transition: { duration: 1.2, ease: 'easeOut' },
};

const projMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.8, delay: 0.6 },
};

const hoverLift = { y: -2 };

const legendDashStyle = {
  backgroundImage:
    'repeating-linear-gradient(90deg, #00D9FF 0 4px, transparent 4px 8px)',
};

export default function SavingsForecast({
  transactions = [],
  currentAmount = 0,
  targetAmount = 0,
  currency = 'RUB',
}) {
  const symbol = currencySymbols[currency] || '₽';

  const { avgPerDay, daysLeft, eta, remaining, done } = useMemo(() => {
    const remaining = Math.max(0, targetAmount - currentAmount);
    const done = targetAmount > 0 && currentAmount >= targetAmount;

    if (!transactions.length || done) {
      return {
        avgPerDay: 0,
        daysLeft: done ? 0 : null,
        eta: done ? new Date() : null,
        remaining,
        done,
      };
    }

    const sorted = [...transactions]
      .map((t) => ({ amount: parseFloat(t.amount), date: new Date(t.created_at) }))
      .sort((a, b) => a.date - b.date);

    const total = sorted.reduce((s, t) => s + t.amount, 0);
    const firstDate = sorted[0].date;
    const days = Math.max(1, Math.round((Date.now() - firstDate.getTime()) / 86400000));
    const avg = total / days;

    if (avg <= 0) {
      return { avgPerDay: 0, daysLeft: null, eta: null, remaining, done };
    }

    const dLeft = Math.ceil(remaining / avg);
    const eta = new Date(Date.now() + dLeft * 86400000);

    return { avgPerDay: avg, daysLeft: dLeft, eta, remaining, done };
  }, [transactions, currentAmount, targetAmount]);

  const svg = useMemo(() => {
    const sorted = [...transactions]
      .map((t) => ({ amount: parseFloat(t.amount), time: new Date(t.created_at).getTime() }))
      .sort((a, b) => a.time - b.time);

    if (!sorted.length) return null;

    let cum = 0;
    const hist = [{ x: sorted[0].time, y: 0 }];
    sorted.forEach((t) => {
      cum += t.amount;
      hist.push({ x: t.time, y: cum });
    });

    if (Math.abs(hist[hist.length - 1].y - currentAmount) > 0.01) {
      hist.push({ x: Date.now(), y: currentAmount });
    }

    const proj =
      eta && !done
        ? [
            { x: Date.now(), y: currentAmount },
            { x: eta.getTime(), y: targetAmount },
          ]
        : [];

    const all = [...hist, ...proj];
    const minX = Math.min(...all.map((p) => p.x));
    const maxX = Math.max(...all.map((p) => p.x), minX + 86400000);
    const maxY = Math.max(targetAmount, ...all.map((p) => p.y), 1);

    const W = 600;
    const H = 160;
    const PAD = 10;

    const sx = (x) => PAD + ((x - minX) / (maxX - minX)) * (W - PAD * 2);
    const sy = (y) => H - PAD - (y / maxY) * (H - PAD * 2);

    const buildPath = (pts) =>
      pts.map((p, i) => `${i ? 'L' : 'M'} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ');

    const histPath = buildPath(hist);
    const projPath = proj.length ? buildPath(proj) : '';
    const areaPath =
      hist.length > 1
        ? `${histPath} L ${sx(hist[hist.length - 1].x).toFixed(1)} ${sy(0).toFixed(1)} L ${sx(hist[0].x).toFixed(1)} ${sy(0).toFixed(1)} Z`
        : '';

    return { W, H, histPath, projPath, areaPath, targetY: sy(targetAmount) };
  }, [transactions, currentAmount, targetAmount, eta, done]);

  return (
    <motion.div
      {...cardMotion}
      className="relative overflow-hidden backdrop-blur-sm border-2 border-primary/20 rounded-3xl p-5 md:p-7 mb-5"
    >
      <div className="pointer-events-none absolute -top-32 -right-32 w-72 h-72 bg-accent/20 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 w-72 h-72 bg-secondary/15 rounded-full blur-3xl" />

      <div className="relative flex items-center gap-3 mb-5">
        <div className="p-2 border border-primary/20 rounded-xl bg-primary/5">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-display font-bold">Прогноз цели</h2>
          <p className="text-sm text-gray-400">На основе истории твоих пополнений</p>
        </div>
      </div>

      <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <Stat
          icon={<CalendarClock className="w-4 h-4 text-accent" />}
          label="Цель будет достигнута"
          value={done ? 'Уже достигнута 🎉' : eta ? formatDateRu(eta) : 'Недостаточно данных'}
          highlight
        />
        <Stat
          icon={<Zap className="w-4 h-4 text-primary" />}
          label="В среднем за день"
          value={
            avgPerDay > 0
              ? `${avgPerDay.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${symbol}`
              : '—'
          }
        />
        <Stat
          icon={<Target className="w-4 h-4 text-success" />}
          label={done ? 'Поздравляю!' : 'Осталось накопить'}
          value={done ? '0' : daysLeft != null ? `${daysLeft} ${pluralDays(daysLeft)}` : '—'}
          sub={
            !done && remaining > 0
              ? `${remaining.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${symbol}`
              : null
          }
        />
      </div>

      <div className="relative">
        {svg ? (
          <svg viewBox={`0 0 ${svg.W} ${svg.H}`} className="w-full h-40" preserveAspectRatio="none">
            <defs>
              <linearGradient id="fcArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6C63FF" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#6C63FF" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="fcLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#6C63FF" />
                <stop offset="50%" stopColor="#00D9FF" />
                <stop offset="100%" stopColor="#FF6584" />
              </linearGradient>
            </defs>

            <line
              x1="0"
              x2={svg.W}
              y1={svg.targetY}
              y2={svg.targetY}
              stroke="rgba(255,255,255,0.18)"
              strokeDasharray="4 4"
            />
            <text
              x={svg.W - 6}
              y={svg.targetY - 4}
              fill="rgba(255,255,255,0.55)"
              fontSize="10"
              textAnchor="end"
            >
              Цель
            </text>

            {svg.areaPath && <path d={svg.areaPath} fill="url(#fcArea)" />}

            <motion.path
              d={svg.histPath}
              fill="none"
              stroke="url(#fcLine)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              {...lineMotion}
            />

            {svg.projPath && (
              <motion.path
                d={svg.projPath}
                fill="none"
                stroke="#00D9FF"
                strokeWidth="2"
                strokeDasharray="5 5"
                strokeLinecap="round"
                {...projMotion}
              />
            )}
          </svg>
        ) : (
          <div className="h-40 flex items-center justify-center gap-2 text-gray-500 text-sm border border-primary/10 rounded-2xl">
            <TrendingUp className="w-4 h-4 opacity-50" />
            Пополни копилку — и тут появится график
          </div>
        )}

        {svg && (
          <div className="flex items-center justify-center gap-5 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-6 h-[3px] rounded-full bg-gradient-to-r from-primary via-accent to-secondary" />
              Накопления
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-6 h-[3px]" style={legendDashStyle} />
              Прогноз
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Stat({ icon, label, value, sub, highlight }) {
  return (
    <motion.div
      whileHover={hoverLift}
      className={`relative bg-dark-light/40 backdrop-blur-sm border rounded-2xl p-4 transition-colors ${
        highlight ? 'border-primary/40' : 'border-primary/10 hover:border-primary/30'
      }`}
    >
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-1.5">
        {icon}
        <span>{label}</span>
      </div>
      <div
        className={`text-base md:text-lg font-display font-semibold ${
          highlight ? 'text-gradient' : 'text-white'
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </motion.div>
  );
}
