import { useCallback, useEffect, useRef, useState } from 'react';
import { Form } from '@douyinfe/semi-ui';
import type { MemberOption } from '@zenith/shared';
import { request } from '@/utils/request';

interface MemberSelectProps {
  /** 表单字段名（提交后为会员 id）*/
  field: string;
  label?: string;
  required?: boolean;
  placeholder?: string;
}

interface OptionItem {
  value: number;
  label: string;
}

function toLabel(m: MemberOption): string {
  const tail = m.phone || m.username;
  return tail ? `${m.nickname}（${tail}）` : m.nickname;
}

/**
 * 会员搜索下拉：按昵称/手机号/用户名远程搜索选择会员。
 * 用于积分调整、钱包调整/退款、发券等需要指定会员的场景。
 */
export function MemberSelect({ field, label = '会员', required, placeholder = '输入昵称/手机号搜索' }: Readonly<MemberSelectProps>) {
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOptions = useCallback(async (keyword?: string) => {
    setLoading(true);
    try {
      const q = keyword ? `?keyword=${encodeURIComponent(keyword)}` : '';
      const res = await request.get<MemberOption[]>(`/api/members/options${q}`);
      if (res.code === 0) setOptions(res.data.map((m) => ({ value: m.id, label: toLabel(m) })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOptions();
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [fetchOptions]);

  const handleSearch = (keyword: string) => {
    if (timer.current) clearTimeout(timer.current);
    const trimmed = keyword.trim();
    timer.current = setTimeout(() => { void fetchOptions(trimmed || undefined); }, 300);
  };

  return (
    <Form.Select
      field={field}
      label={label}
      placeholder={placeholder}
      style={{ width: '100%' }}
      filter
      remote
      showClear
      loading={loading}
      onSearch={handleSearch}
      optionList={options}
      rules={required ? [{ required: true, message: '请选择会员' }] : undefined}
    />
  );
}
