import { useEffect, useState } from 'react';
import { Modal, Button, Toast, RadioGroup, Radio, InputNumber } from '@douyinfe/semi-ui';
import { Plus, RefreshCw } from 'lucide-react';
import type { MemberWallet } from '@zenith/shared';
import { WALLET_TX_TYPE_LABELS } from '@zenith/shared';
import { memberRequest } from '../../utils/member-request';
import { MemberPage } from '../../components/MemberPage';
import { TransactionList } from '../../components/TransactionList';
import { formatYuan } from '../../utils/format';

const QUICK_AMOUNTS = [10, 50, 100, 200, 500];
const PAY_METHODS = [
  { value: 'wechat_h5', label: '微信支付' },
  { value: 'alipay_wap', label: '支付宝' },
];

interface RechargeResult {
  orderNo: string;
  payMethod: string;
  channel: string;
  codeUrl?: string;
  payUrl?: string;
  formHtml?: string;
  expiredAt?: string;
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<MemberWallet | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState<number>(100);
  const [payMethod, setPayMethod] = useState('wechat_h5');
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    memberRequest.get<MemberWallet>('/api/member/wallet', { silent: true }).then((r) => {
      if (r.code === 0) setWallet(r.data);
    });
  }, [refreshKey]);

  const handleRecharge = async () => {
    if (!amount || amount <= 0) {
      Toast.warning('请输入充值金额');
      return;
    }
    setSubmitting(true);
    const res = await memberRequest.post<RechargeResult>('/api/member/wallet/recharge', {
      amount: Math.round(amount * 100),
      payMethod,
    });
    setSubmitting(false);
    if (res.code === 0) {
      setModalOpen(false);
      const r = res.data;
      if (r.payUrl) {
        globalThis.location.href = r.payUrl;
        return;
      }
      if (r.formHtml) {
        globalThis.document.open();
        globalThis.document.write(r.formHtml);
        globalThis.document.close();
        return;
      }
      Modal.info({
        title: '充值订单已创建',
        content: `订单号：${r.orderNo}，支付完成后余额将自动到账。`,
      });
    }
  };

  return (
    <MemberPage
      title="我的钱包"
      rightSlot={<RefreshCw size={18} onClick={() => setRefreshKey((k) => k + 1)} />}
    >
      <div className="m-asset-card">
        <div style={{ textAlign: 'center', fontSize: 13, opacity: 0.85 }}>账户余额（元）</div>
        <div style={{ textAlign: 'center', fontSize: 36, fontWeight: 700, lineHeight: 1.3 }}>
          {wallet === null ? '—' : fenToYuanPlain(wallet.balance)}
        </div>
        <div className="m-asset-row" style={{ marginTop: 8 }}>
          <div className="m-asset-item">
            <div className="m-asset-value" style={{ fontSize: 18 }}>
              {wallet === null ? '—' : fenToYuanPlain(wallet.totalRecharge)}
            </div>
            <div className="m-asset-label">累计充值</div>
          </div>
          <div className="m-asset-item">
            <div className="m-asset-value" style={{ fontSize: 18 }}>
              {wallet === null ? '—' : fenToYuanPlain(wallet.totalConsume)}
            </div>
            <div className="m-asset-label">累计消费</div>
          </div>
        </div>
      </div>

      <Button
        size="large"
        theme="solid"
        block
        icon={<Plus size={18} />}
        onClick={() => setModalOpen(true)}
        style={{ background: 'var(--m-primary)', marginBottom: 12 }}
      >
        充值
      </Button>

      <div className="m-card-title" style={{ padding: '0 4px' }}>收支明细</div>
      <TransactionList
        key={refreshKey}
        fetchUrl="/api/member/wallet/transactions"
        typeLabels={WALLET_TX_TYPE_LABELS}
        formatAmount={(n) => formatYuan(n)}
      />

      <Modal
        title="账户充值"
        visible={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={
          <Button theme="solid" loading={submitting} onClick={handleRecharge} style={{ background: 'var(--m-primary)' }}>
            确认充值 ¥{amount || 0}
          </Button>
        }
        closeOnEsc
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {QUICK_AMOUNTS.map((a) => (
            <Button
              key={a}
              theme={amount === a ? 'solid' : 'light'}
              onClick={() => setAmount(a)}
              style={amount === a ? { background: 'var(--m-primary)' } : undefined}
            >
              ¥{a}
            </Button>
          ))}
        </div>
        <InputNumber
          prefix="¥"
          min={1}
          max={50000}
          value={amount}
          onChange={(v) => setAmount(Number(v) || 0)}
          style={{ width: '100%', marginBottom: 16 }}
        />
        <RadioGroup value={payMethod} onChange={(e) => setPayMethod(e.target.value)} type="button">
          {PAY_METHODS.map((p) => (
            <Radio key={p.value} value={p.value}>
              {p.label}
            </Radio>
          ))}
        </RadioGroup>
      </Modal>
    </MemberPage>
  );
}

/** 分 → 元（不带货币符号，卡片内已有“元”标注） */
function fenToYuanPlain(fen: number): string {
  return (fen / 100).toFixed(2);
}
