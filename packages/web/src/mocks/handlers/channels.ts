import { http, HttpResponse } from 'msw';
import type { Channel, ChannelMessage } from '@zenith/shared';
import { mockChannels, mockChannelMessages } from '@/mocks/data/channels';
import { mockDateTime } from '@/mocks/utils/date';

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

  // ── 管理后台 ──────────────────────────────────────────────
  http.get('/api/channels/admin', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '10');
    const keyword = url.searchParams.get('keyword') ?? '';
    const filtered = mockChannels.filter((c) => !keyword || c.name.includes(keyword) || c.code.includes(keyword));
    const list = filtered.slice((page - 1) * pageSize, page * pageSize).map((c) => ({
      id: c.id, code: c.code, name: c.name, avatar: c.avatar, description: c.description,
      type: c.type, builtin: c.builtin, status: c.status,
      subscriberCount: c.type === 'system' ? 4 : 0,
      messageCount: mockChannelMessages.filter((m) => m.channelId === c.id).length,
      createdAt: c.createdAt, updatedAt: c.updatedAt,
    }));
    return HttpResponse.json({ code: 0, message: 'ok', data: { list, total: filtered.length, page, pageSize } });
  }),

  http.post('/api/channels', async ({ request }) => {
    const body = await request.json() as { code: string; name: string; avatar?: string | null; description?: string | null };
    const id = Math.max(0, ...mockChannels.map((c) => c.id)) + 1;
    const now = mockDateTime();
    const ch: Channel = {
      id, code: body.code, name: body.name, avatar: body.avatar ?? null, description: body.description ?? null,
      type: 'business', builtin: false, status: 'enabled', unreadCount: 0, lastMessage: null, isMuted: false,
      createdAt: now, updatedAt: now,
    };
    mockChannels.push(ch);
    return HttpResponse.json({ code: 0, message: '创建成功', data: { ...ch, subscriberCount: 0, messageCount: 0 } });
  }),

  http.put('/api/channels/:id', async ({ params, request }) => {
    const body = await request.json() as Partial<{ name: string; avatar: string | null; description: string | null; status: 'enabled' | 'disabled' }>;
    const ch = mockChannels.find((c) => c.id === Number(params.id));
    if (!ch) return HttpResponse.json({ code: 404, message: '频道不存在', data: null }, { status: 404 });
    if (body.name !== undefined) ch.name = body.name;
    if (body.avatar !== undefined) ch.avatar = body.avatar;
    if (body.description !== undefined) ch.description = body.description;
    if (body.status !== undefined) ch.status = body.status;
    ch.updatedAt = mockDateTime();
    return HttpResponse.json({
      code: 0, message: '更新成功',
      data: { ...ch, subscriberCount: ch.type === 'system' ? 4 : 0, messageCount: mockChannelMessages.filter((m) => m.channelId === ch.id).length },
    });
  }),

  http.delete('/api/channels/:id', ({ params }) => {
    const idx = mockChannels.findIndex((c) => c.id === Number(params.id));
    if (idx === -1) return HttpResponse.json({ code: 404, message: '频道不存在', data: null }, { status: 404 });
    if (mockChannels[idx].builtin) return HttpResponse.json({ code: 400, message: '内置系统号不可删除', data: null }, { status: 400 });
    mockChannels.splice(idx, 1);
    return HttpResponse.json({ code: 0, message: '删除成功', data: null });
  }),

  http.post('/api/channels/:id/publish', async ({ params, request }) => {
    const body = await request.json() as { title?: string | null; content: string };
    const channelId = Number(params.id);
    const id = Math.max(0, ...mockChannelMessages.map((m) => m.id)) + 1;
    const msg: ChannelMessage = {
      id, channelId, audienceType: 'broadcast', type: 'text', title: body.title ?? null, content: body.content,
      extra: null, publishedById: 1, isRead: false, createdAt: mockDateTime(),
    };
    mockChannelMessages.unshift(msg);
    return HttpResponse.json({ code: 0, message: '已发布', data: msg });
  }),
];
