export async function handler(event) {
  const ticker = (event.queryStringParameters?.ticker || "").trim().toUpperCase();
  if (!ticker) return json(400, { error: "Ticker missing" });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1y`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    if (!res.ok) return json(res.status, { error: `Yahoo HTTP ${res.status}` });

    const body = await res.json();
    if (body.chart?.error) {
      return json(502, { error: body.chart.error.description || "Yahoo chart error" });
    }

    const result = body.chart?.result?.[0];
    if (!result) return json(404, { error: "No market result" });

    const meta = result.meta || {};
    const quote = result.indicators?.quote?.[0] || {};
    const closes = (quote.close || []).filter(x => typeof x === "number" && Number.isFinite(x));
    const volumes = (quote.volume || []).filter(x => typeof x === "number" && Number.isFinite(x));

    const price = num(meta.regularMarketPrice ?? closes.at(-1));
    const previousClose = num(meta.chartPreviousClose ?? closes.at(-2) ?? price);
    const change = price - previousClose;
    const changePercent = previousClose ? (change / previousClose) * 100 : 0;

    return json(200, {
      ticker,
      price,
      previousClose,
      change,
      changePercent,
      fiftyTwoWeekHigh: num(meta.fiftyTwoWeekHigh),
      fiftyTwoWeekLow: num(meta.fiftyTwoWeekLow),
      marketCap: num(meta.marketCap),
      trailingPE: num(meta.trailingPE),
      avgVolume: volumes.length ? volumes.reduce((a, b) => a + b, 0) / volumes.length : null,
      currency: meta.currency || "USD",
      exchange: meta.exchangeName || meta.fullExchangeName || "-",
      source: "Yahoo Finance chart endpoint"
    });
  } catch (err) {
    return json(500, { error: err.name === "AbortError" ? "Yahoo timeout" : err.message });
  } finally {
    clearTimeout(timer);
  }
}

function num(x) {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*"
    },
    body: JSON.stringify(body)
  };
}
