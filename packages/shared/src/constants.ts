export const API_PREFIX = '/api';
export const TOKEN_KEY = 'zenith_token';
export const REFRESH_TOKEN_KEY = 'zenith_refresh_token';
export const PREFERENCES_KEY = 'zenith_preferences';
export const TABS_STORAGE_KEY = 'zenith_tabs';
export const USER_ROLES = ['admin', 'user'] as const;
export const USER_STATUSES = ['enabled', 'disabled'] as const;
export const SUPER_ADMIN_CODE = 'super_admin';
export const TENANT_ADMIN_CODE = 'tenant_admin';
export const FILE_STORAGE_PROVIDERS = ['local', 'oss', 's3', 'cos'] as const;
export const CONFIG_TYPES = ['string', 'number', 'boolean', 'json'] as const;
export const CRON_JOB_STATUSES = ['enabled', 'disabled'] as const;
export const CRON_RUN_STATUSES = ['success', 'fail', 'running'] as const;
export const OAUTH_PROVIDERS = ['github', 'dingtalk', 'wechat_work'] as const;
export const BACKUP_TYPES = ['pg_dump', 'drizzle_export'] as const;
export const BACKUP_STATUSES = ['pending', 'running', 'success', 'failed'] as const;
export const BUSINESS_TYPES = ['announcement'] as const;
export type BusinessType = typeof BUSINESS_TYPES[number];
export const WORKFLOW_DEFINITION_STATUSES = ['draft', 'published', 'disabled'] as const;
export const WORKFLOW_INSTANCE_STATUSES = ['draft', 'running', 'approved', 'rejected', 'withdrawn'] as const;
export const WORKFLOW_TASK_STATUSES = ['pending', 'approved', 'rejected', 'skipped'] as const;
export const WORKFLOW_NODE_TYPES = ['start', 'approve', 'end', 'exclusiveGateway', 'parallelGateway', 'ccNode'] as const;
export const WORKFLOW_CONDITION_OPERATORS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'contains'] as const;

// OAuth2 服务端常量
export const OAUTH2_GRANT_TYPES = ['authorization_code', 'client_credentials', 'implicit', 'refresh_token'] as const;
export type OAuth2GrantType = typeof OAUTH2_GRANT_TYPES[number];

export const OAUTH2_SCOPES = ['openid', 'profile', 'email', 'offline_access'] as const;
export type OAuth2Scope = typeof OAUTH2_SCOPES[number];

export const OAUTH2_SCOPE_DESCRIPTIONS: Record<string, string> = {
  openid: '确认您的身份（用户 ID）',
  profile: '读取您的基本信息（昵称、头像）',
  email: '读取您的邮箱地址',
  offline_access: '允许在您离线时保持访问（续签令牌）',
};

export const OAUTH2_CODE_CHALLENGE_METHODS = ['S256', 'plain'] as const;
export type OAuth2CodeChallengeMethod = typeof OAUTH2_CODE_CHALLENGE_METHODS[number];

export const OAUTH2_TOKEN_EXPIRY = {
  accessToken: 2 * 60 * 60, // 2 小时（秒）
  refreshToken: 30 * 24 * 60 * 60, // 30 天（秒）
  authorizationCode: 10 * 60, // 10 分钟（秒）
} as const;

// ─── 支付中心 ────────────────────────────────────────────────────────
export const PAYMENT_CHANNELS = ['wechat', 'alipay'] as const;
export type PaymentChannel = typeof PAYMENT_CHANNELS[number];

export const PAYMENT_METHODS = [
  'wechat_native', 'wechat_jsapi', 'wechat_h5',
  'alipay_page', 'alipay_wap', 'alipay_app',
] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];

export const PAYMENT_ORDER_STATUSES = ['pending', 'paying', 'success', 'closed', 'refunding', 'refunded', 'failed'] as const;
export type PaymentOrderStatus = typeof PAYMENT_ORDER_STATUSES[number];

export const PAYMENT_REFUND_STATUSES = ['pending', 'processing', 'success', 'failed'] as const;
export type PaymentRefundStatus = typeof PAYMENT_REFUND_STATUSES[number];

/** 各支付方式所属渠道映射 */
export const PAYMENT_METHOD_CHANNEL: Record<PaymentMethod, PaymentChannel> = {
  wechat_native: 'wechat',
  wechat_jsapi: 'wechat',
  wechat_h5: 'wechat',
  alipay_page: 'alipay',
  alipay_wap: 'alipay',
  alipay_app: 'alipay',
};

export const PAYMENT_CHANNEL_LABELS: Record<PaymentChannel, string> = {
  wechat: '微信支付',
  alipay: '支付宝',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  wechat_native: '微信扫码',
  wechat_jsapi: '微信 JSAPI',
  wechat_h5: '微信 H5',
  alipay_page: '支付宝电脑网站',
  alipay_wap: '支付宝手机网站',
  alipay_app: '支付宝 APP',
};

export const PAYMENT_ORDER_STATUS_LABELS: Record<PaymentOrderStatus, string> = {
  pending: '待支付',
  paying: '支付中',
  success: '支付成功',
  closed: '已关闭',
  refunding: '退款中',
  refunded: '已退款',
  failed: '支付失败',
};

export const PAYMENT_REFUND_STATUS_LABELS: Record<PaymentRefundStatus, string> = {
  pending: '待处理',
  processing: '退款中',
  success: '退款成功',
  failed: '退款失败',
};

// ─── 会员中心（Member Center）────────────────────────────────────────
/** 会员前台 token 的 localStorage key（与管理员 zenith_token 隔离）*/
export const MEMBER_TOKEN_KEY = 'zenith_member_token';
export const MEMBER_REFRESH_TOKEN_KEY = 'zenith_member_refresh_token';

export const MEMBER_STATUSES = ['active', 'inactive', 'banned'] as const;
export type MemberStatus = typeof MEMBER_STATUSES[number];

export const POINT_TX_TYPES = ['earn', 'redeem', 'expire', 'adjust', 'refund'] as const;
export type PointTxType = typeof POINT_TX_TYPES[number];

export const WALLET_TX_TYPES = ['recharge', 'consume', 'refund', 'adjust'] as const;
export type WalletTxType = typeof WALLET_TX_TYPES[number];

export const COUPON_TYPES = ['amount', 'percent'] as const;
export type CouponType = typeof COUPON_TYPES[number];

export const COUPON_VALID_TYPES = ['fixed', 'relative'] as const;
export type CouponValidType = typeof COUPON_VALID_TYPES[number];

export const COUPON_TEMPLATE_STATUSES = ['draft', 'active', 'paused', 'expired'] as const;
export type CouponTemplateStatus = typeof COUPON_TEMPLATE_STATUSES[number];

export const MEMBER_COUPON_STATUSES = ['unused', 'used', 'expired', 'frozen'] as const;
export type MemberCouponStatus = typeof MEMBER_COUPON_STATUSES[number];

export const MEMBER_REGISTER_SOURCES = ['web', 'h5', 'app', 'admin'] as const;
export type MemberRegisterSource = typeof MEMBER_REGISTER_SOURCES[number];

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  active: '正常',
  inactive: '未激活',
  banned: '已封禁',
};

export const POINT_TX_TYPE_LABELS: Record<PointTxType, string> = {
  earn: '获得',
  redeem: '兑换消耗',
  expire: '过期',
  adjust: '调整',
  refund: '退还',
};

export const WALLET_TX_TYPE_LABELS: Record<WalletTxType, string> = {
  recharge: '充值',
  consume: '消费',
  refund: '退款',
  adjust: '调整',
};

export const COUPON_TYPE_LABELS: Record<CouponType, string> = {
  amount: '满减券',
  percent: '折扣券',
};

export const COUPON_TEMPLATE_STATUS_LABELS: Record<CouponTemplateStatus, string> = {
  draft: '草稿',
  active: '生效中',
  paused: '已暂停',
  expired: '已过期',
};

export const MEMBER_COUPON_STATUS_LABELS: Record<MemberCouponStatus, string> = {
  unused: '未使用',
  used: '已使用',
  expired: '已过期',
  frozen: '已冻结',
};
