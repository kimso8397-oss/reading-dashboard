import { useEffect, useState, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const GENRE_COLORS = ['#7F77DD','#1D9E75','#D85A30','#BA7517','#378ADD','#639922','#D4537E','#888780'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [quoteIdx, setQuoteIdx] = useState(0);

  useEffect(() => {
    fetch('/api/data')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setData(d);
        setQuoteIdx(Math.floor(Math.random() * (d.quotes?.length || 1)));
      })
      .catch(() => setError('데이터를 불러오지 못했습니다.'));
  }, []);

  if (error) return <div style={s.center}><p style={{ color: '#e24b4a' }}>{error}</p></div>;
  if (!data) return <div style={s.center}><p style={{ color: '#888' }}>불러오는 중...</p></div>;

  const { stats, yearData, yearOrder, genreData, ratingDist, recent, quotes } = data;
  const quote = quotes?.[quoteIdx];

  // ── 연도별 차트 데이터
  const activeYears = yearOrder.filter((y) => yearData[y].domestic + yearData[y].foreign > 0);
  const barData = {
    labels: activeYears.map((y) => y.replace('년', '')),
    datasets: [
      {
        label: '국내',
        data: activeYears.map((y) => yearData[y].domestic),
        backgroundColor: '#5DCAA5',
        borderRadius: 4,
        stack: 'a',
      },
      {
        label: '외국',
        data: activeYears.map((y) => yearData[y].foreign),
        backgroundColor: '#AFA9EC',
        borderRadius: 4,
        stack: 'a',
      },
    ],
  };
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
    scales: {
      x: { stacked: true, grid: { display: false }, border: { display: false }, ticks: { color: '#888', font: { size: 11 } } },
      y: { stacked: true, border: { display: false }, ticks: { color: '#888', font: { size: 11 }, stepSize: 10 } },
    },
  };

  // ── 분야별 도넛 차트
  const donutData = {
    labels: genreData.map(([name]) => name),
    datasets: [{
      data: genreData.map(([, cnt]) => cnt),
      backgroundColor: GENRE_COLORS,
      borderWidth: 0,
      hoverOffset: 6,
    }],
  };
  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed}권` } } },
  };

  // ── 별점 최대값 (진행바 계산용)
  const ratingMax = Math.max(...Object.values(ratingDist), 1);
  const totalRated = Object.values(ratingDist).reduce((a, b) => a + b, 0);

  return (
    <div style={s.page}>
      <div style={s.wrap}>

        {/* ── 헤더 */}
        <div style={s.header}>
          <div>
            <p style={s.headerSub}>독서 대시보드</p>
            <h1 style={s.headerTitle}>📕 소이의 독서 기록</h1>
          </div>
          <a href="https://www.notion.so/ae6917a4b4224321908146de69170f40" target="_blank" rel="noreferrer" style={s.notionBtn}>
            Notion에서 열기 ↗
          </a>
        </div>

        {/* ── 통계 카드 */}
        <div style={s.statGrid}>
          <StatCard icon="📚" label="총 독서량" value={stats.total} sub="2019년 ~ 현재" />
          <StatCard icon="📅" label="올해 읽은 책" value={`${stats.thisYear}권`} sub={`${new Date().getFullYear()}년 기준`} />
          <StatCard icon="⭐" label="평균 별점" value={stats.avgStars || '—'} sub={`${stats.avgRating} / 5.0`} />
          <StatCard icon="📌" label="가장 많이 읽은 분야" value={stats.topGenre} sub={`전체의 ${stats.topGenrePct}%`} />
        </div>

        {/* ── 하이라이트 문장 */}
        {quote && (
          <div style={s.quoteCard}>
            <div style={s.quoteHeader}>
              <span style={s.quoteTitle}>오늘의 하이라이트 문장</span>
              <button style={s.quoteBtn} onClick={() => setQuoteIdx((quoteIdx + 1) % quotes.length)}>
                🔄 다른 문장
              </button>
            </div>
            <blockquote style={s.blockquote}>
              <p style={s.quoteText}>"{quote.text}"</p>
              <footer style={s.quoteFooter}>
                <strong style={s.quoteBook}>{quote.book}</strong>
                {quote.author && <><span style={s.quoteDot}>·</span><span style={s.quoteAuthor}>{quote.author}</span></>}
                {quote.genre && <span style={s.genreTag}>{quote.genre}</span>}
                {quote.rating && <span style={s.quoteRating}>{quote.rating}</span>}
              </footer>
            </blockquote>
          </div>
        )}

        {/* ── 차트 2열 */}
        <div style={s.chartRow}>
          <div style={s.chartCard}>
            <p style={s.cardTitle}>연도별 독서량</p>
            <div style={s.legend}>
              <span style={s.legendItem}><span style={{...s.dot, background:'#5DCAA5'}}/>국내</span>
              <span style={s.legendItem}><span style={{...s.dot, background:'#AFA9EC'}}/>외국</span>
            </div>
            <div style={{ position: 'relative', height: 220 }}>
              <Bar data={barData} options={barOptions} />
            </div>
          </div>

          <div style={s.chartCard}>
            <p style={s.cardTitle}>분야별 분포</p>
            <div style={s.donutWrap}>
              <div style={{ position: 'relative', height: 180, width: 180, flexShrink: 0 }}>
                <Doughnut data={donutData} options={donutOptions} />
              </div>
              <div style={s.donutLegend}>
                {genreData.map(([name, cnt], i) => (
                  <div key={name} style={s.donutLegendItem}>
                    <span style={{...s.dot, background: GENRE_COLORS[i]}}/>
                    <span style={s.donutLabel}>{name}</span>
                    <span style={s.donutPct}>{Math.round((cnt / stats.total) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── 별점 분포 */}
        <div style={s.ratingCard}>
          <p style={s.cardTitle}>별점 분포</p>
          <div style={s.ratingGrid}>
            {['★★★★★','★★★★','★★★','★★','★'].map((star) => {
              const cnt = ratingDist[star] || 0;
              const pct = totalRated > 0 ? Math.round((cnt / totalRated) * 100) : 0;
              return (
                <div key={star} style={s.ratingRow}>
                  <span style={s.starLabel}>{star}</span>
                  <div style={s.barBg}>
                    <div style={{...s.barFill, width: `${pct}%`}}/>
                  </div>
                  <span style={s.pctLabel}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 최근 읽은 책 */}
        <div style={s.recentSection}>
          <p style={s.cardTitle}>최근에 읽은 책</p>
          <div style={s.recentGrid}>
            {recent.map((book) => (
              <a key={book.id} href={book.url} target="_blank" rel="noreferrer" style={s.bookCard}>
                <div style={s.bookTop}>
                  <div style={s.bookEmoji}>📗</div>
                  <div style={s.bookMeta}>
                    <p style={s.bookTitle}>{book.title}</p>
                    <p style={s.bookAuthor}>{book.author}</p>
                  </div>
                </div>
                <div style={s.bookTags}>
                  {book.genre[0] && <span style={s.genreTag}>{book.genre[0]}</span>}
                  {book.rating && <span style={s.starSmall}>{book.rating}</span>}
                  {book.date && <span style={s.dateTag}>{book.date.slice(0, 7)}</span>}
                </div>
                {book.review && (
                  <p style={s.bookReview}>"{book.review}"</p>
                )}
              </a>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub }) {
  return (
    <div style={s.statCard}>
      <p style={s.statLabel}>{icon} {label}</p>
      <p style={s.statValue}>{value}</p>
      <p style={s.statSub}>{sub}</p>
    </div>
  );
}

// ── 스타일
const s = {
  page: { background: '#111', minHeight: '100vh', padding: '2rem 1rem', fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif" },
  wrap: { maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#111' },

  header: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 8 },
  headerSub: { fontSize: 11, color: '#555', margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase' },
  headerTitle: { fontSize: 22, fontWeight: 600, color: '#eee', margin: '4px 0 0' },
  notionBtn: { fontSize: 12, color: '#888', textDecoration: 'none', border: '0.5px solid #333', padding: '6px 12px', borderRadius: 8 },

  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 },
  statCard: { background: '#1a1a1a', borderRadius: 12, padding: '1rem 1.1rem' },
  statLabel: { fontSize: 12, color: '#666', margin: '0 0 8px' },
  statValue: { fontSize: 26, fontWeight: 600, color: '#eee', margin: '0 0 4px', lineHeight: 1.1 },
  statSub: { fontSize: 11, color: '#555', margin: 0 },

  quoteCard: { background: '#1a1a1a', borderRadius: 12, padding: '1.25rem 1.5rem' },
  quoteHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  quoteTitle: { fontSize: 13, fontWeight: 500, color: '#ccc' },
  quoteBtn: { fontSize: 12, color: '#888', background: 'transparent', border: '0.5px solid #333', padding: '5px 12px', borderRadius: 8, cursor: 'pointer' },
  blockquote: { margin: 0, padding: '0 0 0 1rem', borderLeft: '2px solid #7F77DD' },
  quoteText: { fontSize: 15, color: '#ddd', margin: '0 0 10px', lineHeight: 1.8, fontStyle: 'normal' },
  quoteFooter: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  quoteBook: { fontSize: 12, color: '#aaa', fontWeight: 500 },
  quoteDot: { fontSize: 11, color: '#555' },
  quoteAuthor: { fontSize: 12, color: '#666' },
  quoteRating: { fontSize: 11, color: '#BA7517' },

  chartRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  chartCard: { background: '#1a1a1a', borderRadius: 12, padding: '1.25rem' },
  cardTitle: { fontSize: 13, fontWeight: 500, color: '#ccc', margin: '0 0 4px' },
  legend: { display: 'flex', gap: 12, marginBottom: 12 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#777' },
  dot: { display: 'inline-block', width: 8, height: 8, borderRadius: 2, flexShrink: 0 },

  donutWrap: { display: 'flex', alignItems: 'center', gap: 20, marginTop: 12 },
  donutLegend: { display: 'flex', flexDirection: 'column', gap: 6 },
  donutLegendItem: { display: 'flex', alignItems: 'center', gap: 6 },
  donutLabel: { fontSize: 12, color: '#888', flex: 1 },
  donutPct: { fontSize: 12, fontWeight: 500, color: '#ccc', minWidth: 30, textAlign: 'right' },

  ratingCard: { background: '#1a1a1a', borderRadius: 12, padding: '1.25rem' },
  ratingGrid: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 },
  ratingRow: { display: 'flex', alignItems: 'center', gap: 10 },
  starLabel: { width: 60, fontSize: 12, color: '#777', flexShrink: 0 },
  barBg: { flex: 1, background: '#2a2a2a', borderRadius: 4, height: 10, overflow: 'hidden' },
  barFill: { height: '100%', background: '#BA7517', borderRadius: 4, transition: 'width 0.6s ease' },
  pctLabel: { width: 32, fontSize: 11, color: '#666', textAlign: 'right', flexShrink: 0 },

  recentSection: { background: '#1a1a1a', borderRadius: 12, padding: '1.25rem' },
  recentGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 12 },
  bookCard: { background: '#222', borderRadius: 10, padding: 12, textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 8, transition: 'background 0.15s' },
  bookTop: { display: 'flex', gap: 10, alignItems: 'flex-start' },
  bookEmoji: { fontSize: 20, flexShrink: 0, lineHeight: 1 },
  bookMeta: { minWidth: 0 },
  bookTitle: { fontSize: 13, fontWeight: 500, color: '#ddd', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  bookAuthor: { fontSize: 11, color: '#666', margin: '3px 0 0' },
  bookTags: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  genreTag: { fontSize: 11, background: '#2d2b4a', color: '#AFA9EC', borderRadius: 4, padding: '1px 7px' },
  starSmall: { fontSize: 11, color: '#BA7517' },
  dateTag: { fontSize: 11, color: '#555', marginLeft: 'auto' },
  bookReview: { fontSize: 12, color: '#777', margin: 0, lineHeight: 1.6, borderTop: '0.5px solid #2a2a2a', paddingTop: 8 },
};
