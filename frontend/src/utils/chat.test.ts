import { describe, expect, it } from 'vitest';
import { canSendQuestion, safeUrl } from './chat';

describe('safeUrl', () => {
  it('keeps http and https links', () => {
    expect(safeUrl('https://jissn.biomedcentral.com/articles/1')).toBe('https://jissn.biomedcentral.com/articles/1');
    expect(safeUrl('http://example.org/a')).toBe('http://example.org/a');
  });

  it('drops anything else', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('data:text/html,<b>x</b>')).toBeNull();
    expect(safeUrl('not a url')).toBeNull();
    expect(safeUrl(null)).toBeNull();
  });
});

describe('canSendQuestion', () => {
  it('needs some text', () => {
    expect(canSendQuestion('')).toBe(false);
    expect(canSendQuestion('   \n ')).toBe(false);
    expect(canSendQuestion('Creatine là gì?')).toBe(true);
  });

  it('allows 500 characters after trimming, not 501', () => {
    expect(canSendQuestion(`  ${'a'.repeat(500)}  `)).toBe(true);
    expect(canSendQuestion('a'.repeat(501))).toBe(false);
  });
});
