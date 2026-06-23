import { createHash } from 'node:crypto';

/**
 * 微信服务器配置校验签名。
 *
 * 微信公众平台「服务器配置」保存时，微信服务器会带 signature/timestamp/nonce/echostr
 * 发起 GET 请求。校验规则：将 token、timestamp、nonce 三个参数字典序排序后拼接，
 * 做一次 SHA1，结果与 signature 相等即校验通过。
 */
export function verifyWechatSignature(
  token: string,
  signature: string | undefined,
  timestamp: string | undefined,
  nonce: string | undefined,
): boolean {
  if (!token || !signature || !timestamp || !nonce) return false;
  const sorted = [token, timestamp, nonce].sort().join('');
  const hash = createHash('sha1').update(sorted).digest('hex');
  return hash === signature;
}
