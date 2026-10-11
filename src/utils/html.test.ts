import { describe, expect, it } from 'vitest';
import { html, SafeHtml, unsafeHtml } from './html';

describe('html', () => {
    it('returns a SafeHtml with the template text', () => {
        const result = html`<p>plain</p>`;

        expect(result).toBeInstanceOf(SafeHtml);
        expect(result.value).toBe('<p>plain</p>');
    });

    it('escapes every special character in interpolated strings', () => {
        expect(html`<p>${`&<>"'`}</p>`.value).toBe('<p>&amp;&lt;&gt;&quot;&#39;</p>');
    });

    it('neutralizes injected markup but keeps the template markup', () => {
        const name = '<img src=x onerror=alert(1)>';

        expect(html`<h4>${name}</h4>`.value).toBe('<h4>&lt;img src=x onerror=alert(1)&gt;</h4>');
    });

    it('prints numbers, including zero', () => {
        expect(html`${5}|${0}`.value).toBe('5|0');
    });

    it('prints nothing for false, undefined, so `condition && html` works', () => {
        const isShown = false;

        // null check is ignored because of unicorn/no-null
        expect(html`[${isShown}${undefined}]`.value).toBe('[]');
    });

    it('does not escape a nested SafeHtml twice', () => {
        const inner = html`<b>${'a&b'}</b>`;

        expect(html`<div>${inner}</div>`.value).toBe('<div><b>a&amp;b</b></div>');
    });

    it('joins arrays and escapes plain strings inside them', () => {
        const items = ['<one>', 'two'].map((text) => html`<li>${text}</li>`);

        expect(html`${items}`.value).toBe('<li>&lt;one&gt;</li><li>two</li>');
        expect(html`${['<', ['&']]}`.value).toBe('&lt;&amp;');
    });
});

describe('unsafeHtml', () => {
    it('wraps the value without escaping it', () => {
        const icon = unsafeHtml('<svg></svg>');

        expect(icon).toBeInstanceOf(SafeHtml);
        expect(icon.value).toBe('<svg></svg>');
    });

    it('is inserted into a template as is', () => {
        expect(html`<i>${unsafeHtml('<svg></svg>')}</i>`.value).toBe('<i><svg></svg></i>');
    });
});
