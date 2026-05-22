import { http, HttpResponse } from 'msw';
import { mockIpAccessLogs } from '@/mocks/data/logs';

export const ipAccessLogsHandlers = [
  http.get('/api/ip-access-logs', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page')) || 1;
    const pageSize = Number(url.searchParams.get('pageSize')) || 20;
    const ip = url.searchParams.get('ip') ?? '';
    const blockType = url.searchParams.get('blockType') ?? '';

    let list = mockIpAccessLogs.filter((log) => {
      if (ip && !log.ip.includes(ip)) return false;
      if (blockType && log.blockType !== blockType) return false;
      return true;
    });
    const total = list.length;
    list = list.slice((page - 1) * pageSize, page * pageSize);
    return HttpResponse.json({ code: 0, message: 'ok', data: { list, total, page, pageSize } });
  }),
];
