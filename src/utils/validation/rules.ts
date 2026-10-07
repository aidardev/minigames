/**
 * Returns an error message, or undefined if the value is valid.
 * Also gets all form values, so a rule can depend on other fields (e.g. sameAs).
 */
export type Rule<V> = (value: string, values: Readonly<V>) => string | undefined;

/**
 * A rule that only looks at its own value; assignable to Rule<V> for any form.
 */
export type ValueRule = (value: string) => string | undefined;

export function required(message: string): ValueRule {
    return (value): string | undefined => (value.length === 0 ? message : undefined);
}

export function minLength(min: number, message: string): ValueRule {
    return (value): string | undefined => (value.length < min ? message : undefined);
}

export function maxLength(max: number, message: string): ValueRule {
    return (value): string | undefined => (value.length > max ? message : undefined);
}

/**
 * Fails when the value does not match. Do not pass a regexp with the "g" or "y" flag:
 * those make "test()" stateful between calls.
 */
export function pattern(regexp: RegExp, message: string): ValueRule {
    return (value): string | undefined => (regexp.test(value) ? undefined : message);
}

export function sameAs<V extends Record<keyof V, string>>(
    field: keyof V,
    message: string,
): Rule<V> {
    return (value, values): string | undefined => (value === values[field] ? undefined : message);
}
