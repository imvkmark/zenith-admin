import { http, HttpResponse } from 'msw';
import { mockChannels, mockChannelMessages } from '@/mocks/data/channels';

export const channelsHandlers = [
  // 我的频道列表（含未读数）
  http.get('/api/channels/mine', () => {
    const list = mockChannels.map((ch) => {
      const msgs = mockChannelMessages.filter((m) => m.channelId === ch.id);
      const last = msgs.length ? [...msgs].sort((a, b) => b.id - a.id)[0] : null;
      return { ...ch, unreadCount: msgs.filter((m) => !m.isRead).length, lastMessage: last };
    });
    return HttpResponse.json({ code: 0, message: 'ok', data: list });
  }),

  // 频道消息流（分页，按时间倒序）
  http.get('/api/channels/:id/messages', ({ params, request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20');
    const channelId = Number(params.id);
    const all = mockChannelMessages.filter((m) => m.channelId === channelId).sort((a, b) => b.id - a.id);
    const total = all.length;
    const list = all.slice((page - 1) * pageSize, page * pageSize);
    return HttpResponse.json({ code: 0, message: 'ok', data: { list, total, page, pageSize } });
  }),

  // 标记频道已读
  http.post('/api/channels/:id/read', ({ params }) => {
    const channelId = Number(params.id);
    mockChannelMessages.forEach((m) => {
      if (m.channelId === channelId) m.isRead = true;
    });
    return HttpResponse.json({ code: 0, message: '已标记已读', data: null });
  }),
];
