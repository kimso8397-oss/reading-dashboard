import { useEffect, useState } from 'react';
import Head from 'next/head';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// 스택 막대 합계 표시 플러그인
const stackedTotalPlugin = {
  id: 'stackedTotal',
  afterDatasetsDraw(chart) {
    const { ctx, scales: { x, y } } = chart;
    const totals = {};
    chart.data.datasets.forEach((dataset) => {
      dataset.data.forEach((val, i) => {
        totals[i] = (totals[i] || 0) + (val || 0);
      });
    });
    ctx.save();
    ctx.font = '600 11px sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    Object.entries(totals).forEach(([i, total]) => {
      if (total > 0) {
        const xPos = x.getPixelForValue(Number(i));
        const yPos = y.getPixelForValue(total);
        ctx.fillText(total, xPos, yPos - 4);
      }
    });
    ctx.restore();
  },
};

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, stackedTotalPlugin);

const GENRE_COLORS = ['#7F77DD','#1D9E75','#D85A30','#BA7517','#378ADD','#639922','#D4537E','#888780'];

const RESPONSIVE_CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; background: #111; color: #eee; font-family: 'Apple SD Gothic Neo', 'Pretendard', sans-serif; }
  .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .chart-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .recent-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px; }
  .rating-books-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px; }
  .donut-wrap { display: flex; align-items: center; gap: 20px; margin-top: 12px; }
  .donut-legend { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0; }
  .donut-legend-item { display: flex; align-items: center; gap: 6px; }
  .donut-label { font-size: 12px; color: #888; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .donut-pct { font-size: 12px; font-weight: 500; color: #ccc; min-width: 36px; text-align: right; }
  .stat-val { font-size: 22px; font-weight: 600; color: #eee; margin: 0 0 4px; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .stat-val-sm { font-size: 16px; font-weight: 600; color: #eee; margin: 0 0 4px; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rating-row-btn { display: flex; align-items: center; gap: 10px; width: 100%; background: none; border: none; cursor: pointer; padding: 4px 6px; border-radius: 8px; transition: background 0.15s; }
  .rating-row-btn:hover { background: #222; }
  .rating-row-btn.active { background: #1e1b33; }
  @media (max-width: 640px) {
    .stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
    .chart-row { grid-template-columns: 1fr !important; }
    .recent-grid { grid-template-columns: 1fr !important; }
    .rating-books-grid { grid-template-columns: 1fr !important; }
    .donut-wrap { flex-direction: column !important; align-items: flex-start !important; }
    .donut-legend { width: 100%; }
    .stat-val { font-size: 20px; }
    .stat-val-sm { font-size: 15px; }
  }
`;

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [selectedRating, setSelectedRating] = useState(null);

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

  if (error) return (
    <div style={s.center}>
      <p style={{ color: '#e24b4a', textAlign: 'center', padding: '0 1rem' }}>{error}</p>
    </div>
  );
  if (!data) return (
    <div style={s.center}>
      <p style={{ color: '#888' }}>불러오는 중...</p>
    </div>
  );

  const { stats, yearData, yearOrder, genreData, ratingDist, ratingBooks, recent, quotes } = data;
  const quote = quotes?.[quoteIdx];

  const activeYears = yearOrder.filter((y) => yearData[y].domestic + yearData[y].foreign > 0);
  const barData = {
    labels: activeYears.map((y) => y.replace('년', '')),
    datasets: [
      { label: '국내', data: activeYears.map((y) => yearData[y].domestic), backgroundColor: '#5DCAA5', borderRadius: 4, stack: 'a' },
      { label: '외국', data: activeYears.map((y) => yearData[y].foreign), backgroundColor: '#AFA9EC', borderRadius: 4, stack: 'a' },
    ],
  };
  const barOptions = {
    responsive: true, maintainAspectRatio: false,
    layout: { padding: { top: 20 } },
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false },
      stackedTotal: {},
    },
    scales: {
      x: { stacked: true, grid: { display: false }, border: { display: false }, ticks: { color: '#888', font: { size: 11 } } },
      y: { stacked: true, border: { display: false }, ticks: { color: '#888', font: { size: 11 } } },
    },
  };

  const donutData = {
    labels: genreData.map(([name]) => name),
    datasets: [{ data: genreData.map(([, cnt]) => cnt), backgroundColor: GENRE_COLORS, borderWidth: 0, hoverOffset: 6 }],
  };
  const donutOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '68%',
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed}권` } } },
  };

  const totalRated = Object.values(ratingDist).reduce((a, b) => a + b, 0);
  const filteredBooks = selectedRating ? (ratingBooks?.[selectedRating] || []) : [];

  const handleRatingClick = (star) => {
    setSelectedRating((prev) => (prev === star ? null : star));
  };

  return (
    <>
      <Head>
        <title>소이의 독서 기록</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style dangerouslySetInnerHTML={{ __html: RESPONSIVE_CSS }} />
      </Head>

      <div style={s.page}>
        <div style={s.wrap}>

          {/* 헤더 */}
          <div style={s.header}>
            <div>
              <p style={s.headerSub}>독서 대시보드</p>
              <h1 style={s.headerTitle}>📕 소이의 독서 기록</h1>
            </div>
            <a href="https://www.notion.so/ae6917a4b4224321908146de69170f40"
               target="_blank" rel="noreferrer" style={s.notionBtn}>
              Notion에서 열기 ↗
            </a>
          </div>

          {/* 통계 카드 */}
          <div className="stat-grid">
            <StatCard icon="📚" label="총 독서량" value={stats.total} sub="2019년 ~ 현재" />
            <StatCard icon="📅" label="올해 읽은 책" value={`${stats.thisYear}권`} sub={`${new Date().getFullYear()}년 기준`} />
            <StatCard icon="⭐" label="평균 별점" value={stats.avgStars || '—'} sub={`${stats.avgRating} / 5.0`} />
            <StatCard icon="📌" label="가장 많이 읽은 분야" value={stats.topGenre} sub={`전체의 ${stats.topGenrePct}%`} small />
          </div>

          {/* 하이라이트 문장 */}
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

          {/* 차트 2열 */}
          <div className="chart-row">
            <div style={s.card}>
              <p style={s.cardTitle}>연도별 독서량</p>
              <div style={s.legend}>
                <span style={s.legendItem}><span style={{...s.dot, background:'#5DCAA5'}}/>국내</span>
                <span style={s.legendItem}><span style={{...s.dot, background:'#AFA9EC'}}/>외국</span>
              </div>
              <div style={{ position: 'relative', height: 220 }}>
                <Bar data={barData} options={barOptions} />
              </div>
            </div>

            <div style={s.card}>
              <p style={s.cardTitle}>분야별 분포</p>
              <div className="donut-wrap">
                <div style={{ position: 'relative', height: 180, width: 180, flexShrink: 0 }}>
                  <Doughnut data={donutData} options={donutOptions} />
                </div>
                <div className="donut-legend">
                  {genreData.map(([name, cnt], i) => (
                    <div key={name} className="donut-legend-item">
                      <span style={{...s.dot, background: GENRE_COLORS[i]}}/>
                      <span className="donut-label">{name}</span>
                      <span className="donut-pct">{Math.round((cnt / stats.total) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 별점 분포 */}
          <div style={s.card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <p style={s.cardTitle}>별점 분포</p>
              {selectedRating && (
                <span style={s.filterLabel}>
                  {selectedRating} {filteredBooks.length}권
                  <button style={s.clearBtn} onClick={() => setSelectedRating(null)}>✕</button>
                </span>
              )}
            </div>
            <p style={s.cardHint}>별점을 클릭하면 해당 책 목록을 볼 수 있어요</p>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {['★★★★★','★★★★','★★★','★★','★'].map((star) => {
                const cnt = ratingDist[star] || 0;
                const pct = totalRated > 0 ? Math.round((cnt / totalRated) * 100) : 0;
                const isActive = selectedRating === star;
                return (
                  <button
                    key={star}
                    className={`rating-row-btn${isActive ? ' active' : ''}`}
                    onClick={() => handleRatingClick(star)}
                  >
                    <span style={s.starLabel}>{star}</span>
                    <div style={s.barBg}>
                      <div style={{...s.barFill, width: `${pct}%`, background: isActive ? '#9F77DD' : '#BA7517'}}/>
                    </div>
                    <span style={s.pctLabel}>{pct}%</span>
                  </button>
                );
              })}
            </div>

            {/* 별점 필터 책 목록 */}
            {selectedRating && filteredBooks.length > 0 && (
              <div className="rating-books-grid">
                {filteredBooks.map((book) => (
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
                      {book.date && <span style={s.dateTag}>{book.date.slice(0, 7)}</span>}
                    </div>
                    {book.review && (
                      <p style={s.bookReview}>"{book.review}"</p>
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* 최근 읽은 책 */}
          <div style={s.card}>
            <p style={s.cardTitle}>최근에 읽은 책</p>
            <div className="recent-grid">
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
    </>
  );
}

function StatCard({ icon, label, value, sub, small }) {
  return (
    <div style={s.statCard}>
      <p style={s.statLabel}>{icon} {label}</p>
      <p className={small ? 'stat-val-sm' : 'stat-val'}>{value}</p>
      <p style={s.statSub}>{sub}</p>
    </div>
  );
}

const s = {
  page: { background: '#111', minHeight: '100vh', padding: '1.5rem 1rem' },
  wrap: { maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#111' },

  header: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 8 },
  headerSub: { fontSize: 11, color: '#555', margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase' },
  headerTitle: { fontSize: 20, fontWeight: 600, color: '#eee', margin: '4px 0 0' },
  notionBtn: { fontSize: 12, color: '#888', textDecoration: 'none', border: '0.5px solid #333', padding: '6px 12px', borderRadius: 8, whiteSpace: 'nowrap' },

  statCard: { background: '#1a1a1a', borderRadius: 12, padding: '0.9rem 1rem', minWidth: 0 },
  statLabel: { fontSize: 11, color: '#666', margin: '0 0 6px' },
  statSub: { fontSize: 11, color: '#555', margin: 0 },

  quoteCard: { background: '#1a1a1a', borderRadius: 12, padding: '1.1rem 1.25rem' },
  quoteHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem', gap: 8 },
  quoteTitle: { fontSize: 13, fontWeight: 500, color: '#ccc' },
  quoteBtn: { fontSize: 12, color: '#888', background: 'transparent', border: '0.5px solid #333', padding: '5px 12px', borderRadius: 8, cursor: 'pointer', flexShrink: 0 },
  blockquote: { margin: 0, padding: '0 0 0 1rem', borderLeft: '2px solid #7F77DD' },
  quoteText: { fontSize: 14, color: '#ddd', margin: '0 0 10px', lineHeight: 1.8 },
  quoteFooter: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  quoteBook: { fontSize: 12, color: '#aaa', fontWeight: 500 },
  quoteDot: { fontSize: 11, color: '#555' },
  quoteAuthor: { fontSize: 12, color: '#666' },
  quoteRating: { fontSize: 11, color: '#BA7517' },

  card: { background: '#1a1a1a', borderRadius: 12, padding: '1.1rem 1.25rem' },
  cardTitle: { fontSize: 13, fontWeight: 500, color: '#ccc', margin: 0 },
  cardHint: { fontSize: 11, color: '#444', margin: '3px 0 0' },
  filterLabel: { fontSize: 12, color: '#AFA9EC', display: 'flex', alignItems: 'center', gap: 6 },
  clearBtn: { background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 12, padding: '0 2px' },
  legend: { display: 'flex', gap: 12, marginBottom: 10 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#777' },
  dot: { display: 'inline-block', width: 8, height: 8, borderRadius: 2, flexShrink: 0 },

  starLabel: { width: 58, fontSize: 12, color: '#777', flexShrink: 0, textAlign: 'left' },
  barBg: { flex: 1, background: '#2a2a2a', borderRadius: 4, height: 10, overflow: 'hidden' },
  barFill: { height: '100%', background: '#BA7517', borderRadius: 4, transition: 'width 0.3s ease' },
  pctLabel: { width: 32, fontSize: 11, color: '#666', textAlign: 'right', flexShrink: 0 },

  bookCard: { background: '#222', borderRadius: 10, padding: 12, textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 8 },
  bookTop: { display: 'flex', gap: 10, alignItems: 'flex-start' },
  bookEmoji: { fontSize: 18, flexShrink: 0, lineHeight: 1 },
  bookMeta: { minWidth: 0 },
  bookTitle: { fontSize: 13, fontWeight: 500, color: '#ddd', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  bookAuthor: { fontSize: 11, color: '#666', margin: '3px 0 0' },
  bookTags: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  genreTag: { fontSize: 11, background: '#2d2b4a', color: '#AFA9EC', borderRadius: 4, padding: '1px 7px' },
  starSmall: { fontSize: 11, color: '#BA7517' },
  dateTag: { fontSize: 11, color: '#555', marginLeft: 'auto' },
  bookReview: { fontSize: 12, color: '#777', margin: 0, lineHeight: 1.6, borderTop: '0.5px solid #2a2a2a', paddingTop: 8 },
};
