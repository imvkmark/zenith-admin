import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, Toast } from '@douyinfe/semi-ui';
import { useMemberAuth } from '../../hooks/useMemberAuth';
import { memberRequest } from '../../utils/member-request';
import { MemberPage } from '../../components/MemberPage';

function Field({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--m-border)' }}>
      <div style={{ width: 76, fontSize: 14, color: 'var(--m-text-secondary)' }}>{label}</div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { member } = useMemberAuth();
  const needOld = member?.hasPassword ?? true;
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (needOld && !oldPassword) {
      Toast.warning('请输入原密码');
      return;
    }
    if (newPassword.length < 6) {
      Toast.warning('新密码至少 6 位');
      return;
    }
    if (newPassword !== confirm) {
      Toast.warning('两次输入的密码不一致');
      return;
    }
    setSaving(true);
    const res = await memberRequest.put('/api/member/auth/password', {
      oldPassword: needOld ? oldPassword : undefined,
      newPassword,
    });
    setSaving(false);
    if (res.code === 0) {
      Toast.success('密码已修改');
      navigate(-1);
    }
  };

  return (
    <MemberPage title={needOld ? '修改密码' : '设置密码'} showBack noTabbar>
      <div className="m-card">
        {needOld && (
          <Field label="原密码">
            <Input mode="password" value={oldPassword} onChange={setOldPassword} placeholder="请输入原密码" borderless />
          </Field>
        )}
        <Field label="新密码">
          <Input mode="password" value={newPassword} onChange={setNewPassword} placeholder="至少 6 位" borderless />
        </Field>
        <Field label="确认密码">
          <Input mode="password" value={confirm} onChange={setConfirm} placeholder="再次输入新密码" borderless />
        </Field>
      </div>
      <Button
        block
        size="large"
        theme="solid"
        loading={saving}
        onClick={handleSave}
        style={{ background: 'var(--m-primary)', marginTop: 8 }}
      >
        确认
      </Button>
    </MemberPage>
  );
}
