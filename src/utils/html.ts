const ESCAPE_MAP: Readonly<Record<string, string>> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

export class SafeHtml {
    public readonly value: string;

    constructor(value: string) {
        this.value = value;
    }
}

type TemplateValue = SafeHtml | string | number | boolean | null | undefined | TemplateValue[];

function escapeHtml(text: string): string {
    return text.replaceAll(/["&'<>]/g, (char: string): string => ESCAPE_MAP[char] ?? char);
}

function stringify(value: TemplateValue): string {
    if (value instanceof SafeHtml) return value.value;
    if (Array.isArray(value)) return value.map(stringify).join('');
    if (value === null || ([undefined, false] as unknown[]).includes(value)) return '';

    return escapeHtml(String(value));
}

export function html(strings: TemplateStringsArray, ...values: TemplateValue[]): SafeHtml {
    let result = strings[0] ?? '';

    for (const [index, value] of values.entries()) {
        result += stringify(value) + (strings[index + 1] ?? '');
    }

    return new SafeHtml(result);
}

export function unsafeHtml(value: string): SafeHtml {
    return new SafeHtml(value);
}
