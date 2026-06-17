import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, Toast, Select } from '@douyinfe/semi-ui';
import type { Member } from '@zenith/shared';
import { useMemberAuth } from '../../hooks/useMemberAuth';
import { memberRequest } from '../../utils/member-request';
import { MemberPage } from '../../components/MemberPage';

function Field({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--m-border)' }}>
      <div style={{ width: 64, fontSize: 14, color: 'var(--m-text-secondary)' }}>{label}</div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { member, updateMember } = useMemberAuth();
  const [nickname, setNickname] = useState(member?.nickname ?? '');
  const [email, setEmail] = useState(member?.email ?? '');
  const [gender, setGender] = useState<string>(member?.gender ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!nickname.trim()) {
      Toast.warning('请输入昵称');
      return;
    }
    setSaving(true);
    const res = await memberRequest.put<Member>('/api/member/auth/profile', {
      nickname: nickname.trim(),
      email: email || null,
      gender: gender || null,
    });
    setSaving(false);
    if (res.code === 0) {
      updateMember(res.data);
      Toast.success('已保存');
      navigate(-1);
    }
  };

  return (
    <MemberPage title="编辑资料" showBack noTabbar>
      <div className="m-card">
        <Field label="昵称">
          <Input value={nickname} onChange={setNickname} placeholder="请输入昵称" borderless />
        </Field>
        <Field label="性别">
          <Select value={gender} onChange={(v) => setGender(v as string)} style={{ width: '100%' }} placeholder="请选择">
            <Select.Option value="male">男</Select.Option>
            <Select.Option value="female">女</Select.Option>
            <Select.Option value="">保密</Select.Option>
          </Select>
        </Field>
        <Field label="邮箱">
          <Input value={email} onChange={setEmail} placeholder="请输入邮箱" borderless />
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
        保存
      </Button>
    </MemberPage>
  );
}
