import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { Tabs, TabPane, Button, Toast, Spin, Tag } from '@douyinfe/semi-ui';
import type { MemberCoupon, Coupon, PaginatedResponse } from '@zenith/shared';
import { memberRequest } from '../../utils/member-request';
import { MemberPage } from '../../components/MemberPage';

const STATUS_TAG: Record<string, ReactNode> = {
  unused: <Tag color="green">可用</Tag>,
  used: <Tag color="grey">已使用</Tag>,
  expired: <Tag color="grey">已过期</Tag>,
  frozen: <Tag color="orange">已冻结</Tag>,
};

function couponValue(coupon: Coupon) {
  if (coupon.type === 'amount') {
    return (
      <span className="m-coupon-value">
        ¥{coupon.faceValue / 100}
      </span>
    );
  }
  return (
    <span className="m-coupon-value">
      {coupon.faceValue / 10}
      <small>折</small>
    </span>
  );
}

function validityText(coupon: Coupon): string {
  if (coupon.validType === 'relative') {
    return `领取后 ${coupon.validDays ?? 0} 天内有效`;
  }
  const start = coupon.validStart?.slice(0, 10) ?? '';
  const end = coupon.validEnd?.slice(0, 10) ?? '';
  return start || end ? `${start} 至 ${end}` : '长期有效';
}

interface CouponCardProps {
  coupon: Coupon;
  disabled?: boolean;
  extra?: ReactNode;
  subDate?: string;
}

function CouponCard({ coupon, disabled, extra, subDate }: Readonly<CouponCardProps>) {
  return (
    <div className="m-coupon">
      <div className={`m-coupon-left${disabled ? ' disabled' : ''}`}>
        {couponValue(coupon)}
        <span className="m-coupon-threshold">
          {coupon.threshold > 0 ? `满${coupon.threshold / 100}元可用` : '无门槛'}
        </span>
      </div>
      <div className="m-coupon-right">
        <div className="m-coupon-name">{coupon.name}</div>
        <div className="m-coupon-date">{subDate ?? validityText(coupon)}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>{extra}</div>
      </div>
    </div>
  );
}

function MyCoupons() {
  const [list, setList] = useState<MemberCoupon[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    const res = await memberRequest.get<PaginatedResponse<MemberCoupon>>(
      `/api/member/coupons?page=${p}&pageSize=10`,
      { silent: true },
    );
    setLoading(false);
    if (res.code === 0) {
      setList((prev) => (p === 1 ? res.data.list : [...prev, ...res.data.list]));
      setTotal(res.data.total);
      setPage(p);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  if (loading && list.length === 0) {
    return <div className="m-loading-wrap"><Spin /></div>;
  }
  if (list.length === 0) {
    return <div className="m-empty">暂无优惠券，去领券中心看看吧</div>;
  }

  return (
    <div style={{ paddingTop: 12 }}>
      {list.map((mc) =>
        mc.coupon ? (
          <CouponCard
            key={mc.id}
            coupon={mc.coupon}
            disabled={mc.status !== 'unused'}
            subDate={mc.expireAt ? `有效期至 ${mc.expireAt.slice(0, 10)}` : undefined}
            extra={STATUS_TAG[mc.status]}
          />
        ) : null,
      )}
      {list.length < total && (
        <div style={{ textAlign: 'center', paddingTop: 8 }}>
          <Button theme="borderless" loading={loading} onClick={() => load(page + 1)}>
            加载更多
          </Button>
        </div>
      )}
    </div>
  );
}

function AvailableCoupons() {
  const [list, setList] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [receiving, setReceiving] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await memberRequest.get<Coupon[]>('/api/member/coupons/available', { silent: true });
    setLoading(false);
    if (res.code === 0) setList(res.data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const receive = async (couponId: number) => {
    setReceiving(couponId);
    const res = await memberRequest.post<MemberCoupon>('/api/member/coupons/receive', { couponId });
    setReceiving(null);
    if (res.code === 0) {
      Toast.success('领取成功');
      load();
    }
  };

  if (loading) {
    return <div className="m-loading-wrap"><Spin /></div>;
  }
  if (list.length === 0) {
    return <div className="m-empty">暂无可领取的优惠券</div>;
  }

  return (
    <div style={{ paddingTop: 12 }}>
      {list.map((c) => (
        <CouponCard
          key={c.id}
          coupon={c}
          extra={
            <Button
              size="small"
              theme="solid"
              loading={receiving === c.id}
              onClick={() => receive(c.id)}
              style={{ background: 'var(--m-primary)' }}
            >
              立即领取
            </Button>
          }
        />
      ))}
    </div>
  );
}

export default function CouponsPage() {
  return (
    <MemberPage title="我的卡券">
      <Tabs type="line">
        <TabPane tab="我的卡券" itemKey="mine">
          <MyCoupons />
        </TabPane>
        <TabPane tab="领券中心" itemKey="available">
          <AvailableCoupons />
        </TabPane>
      </Tabs>
    </MemberPage>
  );
}
