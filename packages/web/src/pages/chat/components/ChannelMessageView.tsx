/**
 * 频道（站内公众号 / 系统号）只读消息视图
 *
 * 复用 MessageBubble 渲染卡片/文本，订阅 WS channel:message 实时追加，
 * 纯单向无输入框（第一期）。频道消息 senderId 视为 null，展示身份取频道名/头像或 extra.bot。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Empty, Spin, Typography } from '@douyinfe/semi-ui';
import { ArrowLeft } from 'lucide-react';
import type { Channel, ChannelMessage, ChatMessage, ChatCardAction, WsMessage } from '@zenith/shared';
import { request } from '@/utils/request';
import { useWebSocket } from '@/hooks/useWebSocket';
import { UserAvatar } from '@/components/UserAvatar';
import { MessageBubble } from './MessageBubble';

const { Text } = Typography;

interface Props {
  channel: Channel;
  currentUserId: number | null;
  onBack: () => void;
  onCardAction: (msg: ChatMessage, action: ChatCardAction) => void;
  onOpenWorkflow: (instanceId: number, taskId: number | null) => void;
}

function toChatMessage(m: ChannelMessage, channel: Channel): ChatMessage {
  return {
    id: m.id,
    conversationId: 0,
    senderId: null,
    senderName: channel.name,
    senderAvatar: channel.avatar,
    type: m.type,
    content: m.content,
    replyToId: null,
    replyToMessage: null,
    isRecalled: false,
    isEdited: false,
    extra: m.extra,
    reactions: [],
    createdAt: m.createdAt,
    updatedAt: m.createdAt,
  };
}

const noop = () => { /* 只读频道：禁用交互 */ };

export function ChannelMessageView({ channel, currentUserId, onBack, onCardAction, onOpenWorkflow }: Readonly<Props>) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMessages([]);
    void (async () => {
      const res = await request.get<{ list: ChannelMessage[]; total: number }>(
        `/api/channels/${channel.id}/messages?page=1&pageSize=50`,
        { silent: true },
      );
      if (cancelled) return;
      setLoading(false);
      if (res.code === 0 && res.data) {
        const ordered = [...res.data.list].reverse().map((m) => toChatMessage(m, channel));
        setMessages(ordered);
        scrollToBottom();
      }
      void request.post(`/api/channels/${channel.id}/read`, {}, { silent: true });
    })();
    return () => { cancelled = true; };
  }, [channel, scrollToBottom]);

  const handleWs = useCallback((wsMsg: WsMessage) => {
    if (wsMsg.type !== 'channel:message') return;
    const m = wsMsg.payload;
    if (m.channelId !== channel.id) return;
    setMessages((prev) => {
      const mapped = toChatMessage(m, channel);
      const idx = prev.findIndex((x) => x.id === m.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = mapped;
        return next;
      }
      return [...prev, mapped];
    });
    scrollToBottom();
    void request.post(`/api/channels/${channel.id}/read`, {}, { silent: true });
  }, [channel, scrollToBottom]);

  useWebSocket(handleWs);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--semi-color-border)' }}>
        <Button icon={<ArrowLeft size={16} />} theme="borderless" type="tertiary" onClick={onBack} />
        <UserAvatar name={channel.name} avatar={channel.avatar} size={32} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <Text strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{channel.name}</Text>
          {channel.description && (
            <Text type="tertiary" style={{ display: 'block', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{channel.description}</Text>
          )}
        </div>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 0', minHeight: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : messages.length === 0 ? (
          <Empty description="暂无消息" style={{ padding: 40 }} />
        ) : (
          messages.map((msg) => (
            <div key={msg.id} style={{ padding: '0 20px 16px' }}>
              <MessageBubble
                msg={msg}
                isSelf={false}
                shouldShowTime
                currentUserId={currentUserId}
                onReply={noop}
                onRecall={noop}
                onOpenImage={noop}
                getReplyMessage={() => undefined}
                onScrollToMessage={noop}
                onToggleFavorite={noop}
                onTogglePin={noop}
                onEditRecalled={noop}
                onCardAction={onCardAction}
                onOpenWorkflow={onOpenWorkflow}
              />
            </div>
          ))
        )}
      </div>

      <div style={{ flexShrink: 0, textAlign: 'center', padding: '10px 16px', borderTop: '1px solid var(--semi-color-border)', color: 'var(--semi-color-text-2)', fontSize: 12 }}>
        该频道仅用于接收系统通知，不支持回复
      </div>
    </div>
  );
}

export default ChannelMessageView;
