import type { Channel, ChannelMessage } from '@zenith/shared';
import { SEED_CHANNELS } from '@zenith/shared';
import { mockDateTime } from '@/mocks/utils/date';

/** 频道消息（broadcast 公告 + targeted 工作流卡片示例） */
export const mockChannelMessages: ChannelMessage[] = [
  {
    id: 1,
    channelId: 1,
    audienceType: 'broadcast',
    type: 'text',
    title: '系统升级通知',
    content: '系统将于本周六凌晨 02:00 进行例行升级，预计耗时 30 分钟，请提前保存工作。',
    extra: null,
    publishedById: null,
    isRead: false,
    createdAt: mockDateTime(),
  },
  {
    id: 2,
    channelId: 1,
    audienceType: 'targeted',
    type: 'card',
    title: '待办审批提醒',
    content: '待办审批提醒',
    extra: {
      bot: { name: 'Zenith 助手', avatar: null },
      card: {
        title: '待办审批提醒',
        text: '流程「请假申请（LV-20260624）」需要你审批',
        fields: [{ label: '审批节点', value: '部门负责人审批' }],
        actions: [
          { key: 'approve', label: '同意', theme: 'primary', action: 'workflow:approve', taskId: 9001 },
          { key: 'reject', label: '驳回', theme: 'danger', action: 'workflow:reject', taskId: 9001, requireComment: true },
        ],
        source: '工作流',
        status: 'pending',
        instanceId: 8001,
      },
    },
    publishedById: null,
    isRead: false,
    createdAt: mockDateTime(),
  },
];

function buildChannel(seed: (typeof SEED_CHANNELS)[number]): Channel {
  const msgs = mockChannelMessages.filter((m) => m.channelId === seed.id);
  const last = msgs.length ? msgs[msgs.length - 1] : null;
  return {
    id: seed.id,
    code: seed.code,
    name: seed.name,
    avatar: seed.avatar,
    description: seed.description,
    type: seed.type,
    builtin: seed.builtin,
    status: 'enabled',
    unreadCount: msgs.filter((m) => !m.isRead).length,
    lastMessage: last,
    isMuted: false,
    isSubscribed: true,
    createdAt: mockDateTime(),
    updatedAt: mockDateTime(),
  };
}

export const mockChannels: Channel[] = [
  ...SEED_CHANNELS.map(buildChannel),
  {
    id: 2,
    code: 'product-updates',
    name: '产品动态',
    avatar: null,
    description: '产品更新与运营活动公告',
    type: 'business',
    builtin: false,
    status: 'enabled',
    unreadCount: 0,
    lastMessage: null,
    isMuted: false,
    isSubscribed: false,
    createdAt: mockDateTime(),
    updatedAt: mockDateTime(),
  },
];
