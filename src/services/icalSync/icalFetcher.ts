// Booking.com 등 특정 플랫폼은 단일 프록시 차단 시 실패할 수 있으므로
// 여러 프록시를 순서대로 시도한다.
const PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

async function tryFetch(url: string, timeoutMs: number): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function fetchICalWithProxy(icalUrl: string): Promise<string> {
  // 1차: 직접 요청 (CORS 허용 서버이거나 같은 origin일 경우)
  const direct = await tryFetch(icalUrl, 6000);
  if (direct?.includes('BEGIN:VCALENDAR')) return direct;

  // 2차: 프록시 순차 시도
  for (const buildProxy of PROXIES) {
    const text = await tryFetch(buildProxy(icalUrl), 10000);
    if (text?.includes('BEGIN:VCALENDAR')) return text;
  }

  throw new Error(
    'iCal URL에 접근할 수 없습니다. ' +
    'URL이 올바른지 확인하거나, 저장 후 동기화를 시도해 주세요.',
  );
}

export async function validateICalUrl(url: string): Promise<{ valid: boolean; error?: string }> {
  try {
    await fetchICalWithProxy(url);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : String(e) };
  }
}
