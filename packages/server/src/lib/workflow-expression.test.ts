import { describe, it, expect } from 'vitest';
import {
  evaluateExpression,
  validateExpression,
  parseExpression,
  collectReferences,
  ExpressionError,
} from './workflow-expression';

describe('workflow-expression · 安全求值', () => {
  const scope = {
    form: { amount: 1500, managerId: 7, vpId: 9, leadId: 3, tags: ['a', 'b'], owner: { id: 42 } },
    starter: { id: 11 },
  };

  it('解析成员路径与下标访问', () => {
    expect(evaluateExpression('form.managerId', scope)).toBe(7);
    expect(evaluateExpression('starter.id', scope)).toBe(11);
    expect(evaluateExpression('form.owner.id', scope)).toBe(42);
    expect(evaluateExpression("form['vpId']", scope)).toBe(9);
  });

  it('数组表达式', () => {
    expect(evaluateExpression('[form.managerId, starter.id]', scope)).toEqual([7, 11]);
  });

  it('三元 + 比较运算', () => {
    expect(evaluateExpression('form.amount > 1000 ? form.vpId : form.leadId', scope)).toBe(9);
    expect(evaluateExpression('form.amount < 1000 ? form.vpId : form.leadId', scope)).toBe(3);
  });

  it('逻辑与一元运算', () => {
    expect(evaluateExpression('form.amount > 0 && starter.id', scope)).toBe(11);
    expect(evaluateExpression('-form.managerId', scope)).toBe(-7);
    expect(evaluateExpression('!false', scope)).toBe(true);
  });

  it('未知标识符解析为 undefined（无全局可达）', () => {
    expect(evaluateExpression('process', scope)).toBeUndefined();
    expect(evaluateExpression('form.unknown', scope)).toBeUndefined();
  });

  it('拒绝函数调用（RCE 防护）', () => {
    expect(() => evaluateExpression('alert(1)', scope)).toThrow(ExpressionError);
    expect(() => evaluateExpression('form.constructor.constructor("return 1")()', scope)).toThrow(ExpressionError);
  });

  it('拒绝原型链访问', () => {
    expect(() => parseExpression('form.__proto__')).toThrow(ExpressionError);
    expect(() => parseExpression('form.constructor')).toThrow(ExpressionError);
  });

  it('拒绝复合语句 / 赋值', () => {
    expect(() => evaluateExpression('a, b', scope)).toThrow(ExpressionError);
    // jsep 不解析裸赋值为合法 AST → 语法错误也归类为 ExpressionError
    expect(() => evaluateExpression('a = 1', scope)).toThrow(ExpressionError);
  });
});

describe('workflow-expression · 预校验', () => {
  it('合法表达式返回引用清单', () => {
    const r = validateExpression('form.amount > 1000 ? form.vpId : starter.id', ['form', 'starter']);
    expect(r.valid).toBe(true);
    expect(r.roots.sort()).toEqual(['form', 'starter']);
    expect(r.references).toContain('form.amount');
    expect(r.references).toContain('form.vpId');
    expect(r.references).toContain('starter.id');
  });

  it('引用未知根变量 → 不合法', () => {
    const r = validateExpression('foo.bar + form.x', ['form', 'starter']);
    expect(r.valid).toBe(false);
    expect(r.error).toContain('foo');
  });

  it('语法错误 → 不合法且带可读信息', () => {
    const r = validateExpression('form.', ['form']);
    expect(r.valid).toBe(false);
    expect(r.error).toBeTruthy();
  });

  it('函数调用 → 不合法', () => {
    const r = validateExpression('doEvil()', ['form']);
    expect(r.valid).toBe(false);
  });

  it('空表达式 → 不合法', () => {
    expect(validateExpression('', ['form']).valid).toBe(false);
    expect(validateExpression('   ', ['form']).valid).toBe(false);
  });
});

describe('workflow-expression · 引用收集', () => {
  it('收集字面量下标为完整路径', () => {
    const { paths } = collectReferences(parseExpression("form['vpId'] + form.amount"));
    expect(paths).toContain('form.vpId');
    expect(paths).toContain('form.amount');
  });

  it('动态下标止于根路径，但下标变量被收集', () => {
    const { paths, roots } = collectReferences(parseExpression('form.list[starter.id]'));
    expect(roots.sort()).toEqual(['form', 'starter']);
    expect(paths).toContain('starter.id');
  });
});
