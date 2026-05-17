const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DB_ID = process.env.NOTION_DB_ID || '1aa85981c02a8035a445d4242f3c9a50';

async function queryAll(sorts) {
  let results = [];
  let cursor = undefined;

  while (true) {
    const body = { page_size: 100 };
    if (sorts) body.sorts = sorts;
    if (cursor) body.start_cursor = cursor;

    const res = await fetch(`https://api.notion.com/v1/databases/${DB_ID}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Notion API error');
    }

    const data = await res.json();
    results = results.concat(data.results);
    if (!data.has_more) break;
    cursor = data.next_cursor;
  }

  return results;
}

// 페이지 본문 블록 가져오기
async function fetchPageBlocks(pageId) {
  try {
    const res = await fetch(
      `https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`,
      {
        headers: {
          Authorization: `Bearer ${NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28',
        },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}

// 블록에서 하이라이트 문장 추출 (bullet 포인트 + paragraph)
function extractHighlights(blocks) {
  return blocks
    .filter((b) => b.type === 'bulleted_list_item' || b.type === 'paragraph')
    .map((b) => {
      const rt = b[b.type]?.rich_text || [];
      return rt.map((r) => r.plain_text).join('').trim();
    })
    .filter((t) => t.length >= 15 && t.length <= 400);
}

const STAR_MAP = { '★': 1, '★★': 2, '★★★': 3, '★★★★': 4, '★★★★★': 5 };
const YEAR_ORDER = ['2019년','2020년','2021년','2022년','2023년','2024년','2025년','2026년'];

export default async function handler(req, res) {
  if (!NOTION_TOKEN) {
    return res.status(500).json({ error: 'NOTION_TOKEN이 설정되지 않았습니다.' });
  }

  try {
    const pages = await queryAll([{ property: '책 읽은 날짜', direction: 'descending' }]);

    // ── 총 독서량
    const total = pages.length;

    // ── 올해 읽은 책
    const currentYear = `${new Date().getFullYear()}년`;
    const thisYear = pages.filter(
      (p) => p.properties['연도']?.select?.name === currentYear
    ).length;

    // ── 평균 별점
    const rated = pages.filter((p) => p.properties['별점']?.select?.name);
    const avgRating =
      rated.length > 0
        ? rated.reduce((s, p) => s + (STAR_MAP[p.properties['별점'].select.name] || 0), 0) /
          rated.length
        : 0;
    const avgStars = '★'.repeat(Math.round(avgRating));

    // ── 분야 집계
    const genreCounts = {};
    const sourceCounts = { 국내: 0, 외국: 0 };

    pages.forEach((p) => {
      (p.properties['분야']?.multi_select || []).forEach((g) => {
        genreCounts[g.name] = (genreCounts[g.name] || 0) + 1;
      });
      (p.properties['출처']?.multi_select || []).forEach((s) => {
        if (sourceCounts[s.name] !== undefined) sourceCounts[s.name]++;
      });
    });

    const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
    const topGenrePct =
      total > 0 ? Math.round((genreCounts[topGenre] / total) * 100) : 0;

    const genreData = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    // ── 연도별 독서량 (국내/외국 분리)
    const yearData = {};
    YEAR_ORDER.forEach((y) => (yearData[y] = { domestic: 0, foreign: 0 }));

    pages.forEach((p) => {
      const year = p.properties['연도']?.select?.name;
      if (!year || !yearData[year]) return;
      const sources = (p.properties['출처']?.multi_select || []).map((s) => s.name);
      if (sources.includes('국내')) yearData[year].domestic++;
      if (sources.includes('외국')) yearData[year].foreign++;
      if (sources.length === 0) yearData[year].domestic++;
    });

    // ── 별점 분포
    const ratingDist = { '★': 0, '★★': 0, '★★★': 0, '★★★★': 0, '★★★★★': 0 };
    pages.forEach((p) => {
      const r = p.properties['별점']?.select?.name;
      if (r && ratingDist[r] !== undefined) ratingDist[r]++;
    });

    // ── 별점별 전체 책 목록
    const ratingBooks = { '★': [], '★★': [], '★★★': [], '★★★★': [], '★★★★★': [] };
    pages.forEach((p) => {
      const r = p.properties['별점']?.select?.name;
      if (r && ratingBooks[r]) {
        ratingBooks[r].push({
          id: p.id,
          title: p.properties['Name']?.title?.[0]?.plain_text || '제목 없음',
          author: p.properties['작가']?.rich_text?.[0]?.plain_text || '',
          genre: (p.properties['분야']?.multi_select || []).map((g) => g.name),
          rating: r,
          review: p.properties['한줄평']?.rich_text?.[0]?.plain_text || '',
          date: p.properties['책 읽은 날짜']?.date?.start || '',
          url: p.url,
        });
      }
    });

    // ── 최근 읽은 책 (최대 6권)
    const recent = pages.slice(0, 6).map((p) => ({
      id: p.id,
      title: p.properties['Name']?.title?.[0]?.plain_text || '제목 없음',
      author: p.properties['작가']?.rich_text?.[0]?.plain_text || '',
      genre: (p.properties['분야']?.multi_select || []).map((g) => g.name),
      rating: p.properties['별점']?.select?.name || '',
      review: p.properties['한줄평']?.rich_text?.[0]?.plain_text || '',
      date: p.properties['책 읽은 날짜']?.date?.start || '',
      year: p.properties['연도']?.select?.name || '',
      source: (p.properties['출처']?.multi_select || []).map((s) => s.name),
      url: p.url,
    }));

    // ── 하이라이트 문장: 책 페이지 본문 블록에서 추출
    // 전체 책에서 15권을 골고루 샘플링
    const SAMPLE_SIZE = 15;
    const step = Math.max(1, Math.floor(pages.length / SAMPLE_SIZE));
    const samplePages = [];
    for (let i = 0; i < pages.length && samplePages.length < SAMPLE_SIZE; i += step) {
      samplePages.push(pages[i]);
    }

    const blockResults = await Promise.allSettled(
      samplePages.map(async (p) => {
        const blocks = await fetchPageBlocks(p.id);
        const highlights = extractHighlights(blocks);
        return {
          book: p.properties['Name']?.title?.[0]?.plain_text || '',
          author: p.properties['작가']?.rich_text?.[0]?.plain_text || '',
          genre: p.properties['분야']?.multi_select?.[0]?.name || '',
          rating: p.properties['별점']?.select?.name || '',
          highlights,
        };
      })
    );

    // 블록에서 추출한 quotes
    const quotes = blockResults
      .filter((r) => r.status === 'fulfilled' && r.value.highlights.length > 0)
      .flatMap((r) =>
        r.value.highlights.map((text) => ({
          text,
          book: r.value.book,
          author: r.value.author,
          genre: r.value.genre,
          rating: r.value.rating,
        }))
      );

    // 블록에서 못 가져온 경우 한줄평 fallback
    if (quotes.length < 5) {
      const fallback = pages
        .filter((p) => p.properties['한줄평']?.rich_text?.[0]?.plain_text)
        .slice(0, 30)
        .map((p) => ({
          text: p.properties['한줄평'].rich_text[0].plain_text,
          book: p.properties['Name']?.title?.[0]?.plain_text || '',
          author: p.properties['작가']?.rich_text?.[0]?.plain_text || '',
          genre: p.properties['분야']?.multi_select?.[0]?.name || '',
          rating: p.properties['별점']?.select?.name || '',
        }));
      quotes.push(...fallback);
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    res.json({
      stats: { total, thisYear, avgRating: avgRating.toFixed(1), avgStars, topGenre, topGenrePct },
      yearData,
      yearOrder: YEAR_ORDER,
      genreData,
      ratingDist,
      ratingBooks,
      sourceCounts,
      recent,
      quotes,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
