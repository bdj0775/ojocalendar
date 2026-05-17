import type { ICalEvent } from '../../types';

export function parseICS(icsText: string): ICalEvent[] {
  const events: ICalEvent[] = [];

  // iCal 줄바꿈 이어붙이기 처리 (RFC 5545: line folding)
  const unfolded = icsText.replace(/\r\n[ \t]/g, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = unfolded.split('\n');

  let inEvent = false;
  let current: Partial<ICalEvent & { dtstart_raw: string; dtend_raw: string }> = {};

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true;
      current = {};
      continue;
    }

    if (trimmed === 'END:VEVENT') {
      if (current.uid && current.dtstart_raw && current.dtend_raw) {
        events.push({
          uid: current.uid,
          summary: current.summary || '예약',
          dtstart: parseICalDate(current.dtstart_raw),
          dtend: parseICalDate(current.dtend_raw),
          status: (current.status || 'CONFIRMED').toUpperCase(),
          description: current.description,
        });
      }
      inEvent = false;
      continue;
    }

    if (!inEvent) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    // 파라미터 포함 키 처리 (예: DTSTART;VALUE=DATE:20251215)
    const keyWithParams = trimmed.substring(0, colonIdx);
    const key = keyWithParams.split(';')[0].toUpperCase();
    const value = trimmed.substring(colonIdx + 1);

    switch (key) {
      case 'UID':         current.uid = value; break;
      case 'SUMMARY':     current.summary = decodeICalText(value); break;
      case 'DTSTART':     current.dtstart_raw = value; break;
      case 'DTEND':       current.dtend_raw = value; break;
      case 'STATUS':      current.status = value; break;
      case 'DESCRIPTION': current.description = decodeICalText(value); break;
    }
  }

  return events;
}

function parseICalDate(dateStr: string): string {
  // YYYYMMDD 또는 YYYYMMDDTHHMMSSZ 형식을 YYYY-MM-DD로 변환
  const digits = dateStr.replace(/[^0-9]/g, '');
  const year  = digits.substring(0, 4);
  const month = digits.substring(4, 6);
  const day   = digits.substring(6, 8);
  return `${year}-${month}-${day}`;
}

function decodeICalText(text: string): string {
  return text
    .replace(/\\n/g, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}
