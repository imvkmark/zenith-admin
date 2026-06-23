import { wechatApiGet } from './api';
import type { MpCredential } from './api';

export interface WechatTag {
  id: number;
  name: string;
  count: number;
}

interface TagsGetResponse {
  errcode?: number;
  errmsg?: string;
  tags?: WechatTag[];
}

/** 拉取公众号下所有标签（含微信侧标签 id、名称、粉丝数） */
export async function getWechatTags(account: MpCredential): Promise<WechatTag[]> {
  const data = await wechatApiGet<TagsGetResponse>(account, '/cgi-bin/tags/get');
  return data.tags ?? [];
}
