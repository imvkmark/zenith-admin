import { wechatApiGet, wechatApiPost } from './api';
import type { MpCredential } from './api';
import type { MpMenuButton } from '@zenith/shared';

interface MenuMutateResponse {
  errcode?: number;
  errmsg?: string;
}

interface MenuGetResponse {
  errcode?: number;
  errmsg?: string;
  menu?: { button: MpMenuButton[] };
}

/** 创建/覆盖自定义菜单 */
export async function createWechatMenu(account: MpCredential, buttons: MpMenuButton[]): Promise<void> {
  await wechatApiPost<MenuMutateResponse>(account, '/cgi-bin/menu/create', { button: buttons });
}

/** 拉取当前生效的自定义菜单 */
export async function getWechatMenu(account: MpCredential): Promise<MpMenuButton[]> {
  const data = await wechatApiGet<MenuGetResponse>(account, '/cgi-bin/menu/get');
  return data.menu?.button ?? [];
}

/** 删除自定义菜单 */
export async function deleteWechatMenu(account: MpCredential): Promise<void> {
  await wechatApiGet<MenuMutateResponse>(account, '/cgi-bin/menu/delete');
}
