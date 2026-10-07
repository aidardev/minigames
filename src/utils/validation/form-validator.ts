import type { Rule } from './rules';

/**
 * Ordered rules per field; the first rule that fails provides the field's error.
 */
export type FormSchema<V> = { readonly [K in keyof V]: readonly Rule<V>[] };

/**
 * Holds field values and "touched" flags, runs the rules.
 * Errors are computed on demand, never stored.
 * - getError / isValid: is the data valid (gates the submit button)
 * - getVisibleError: should the error be shown (only after the field was touched)
 */
export class FormValidator<V extends Record<keyof V, string>> {
    private readonly schema: FormSchema<V>;
    private readonly fieldNames: ReadonlyArray<keyof V & string>;
    private values: V;
    private touched = new Set<keyof V>();

    constructor(schema: FormSchema<V>) {
        this.schema = schema;
        this.fieldNames = Object.keys(schema) as Array<keyof V & string>;
        this.values = this.createEmptyValues();
    }

    private createEmptyValues(): V {
        // Every field of V is a string, so an all-empty-string record is a valid V.
        return Object.fromEntries(this.fieldNames.map((name): [string, string] => [name, ''])) as V;
    }

    public get fields(): ReadonlyArray<keyof V & string> {
        return this.fieldNames;
    }

    public setValue(field: keyof V, value: string): void {
        this.values = { ...this.values, [field]: value };
        this.touched.add(field);
    }

    public touch(field: keyof V): void {
        this.touched.add(field);
    }

    public touchAll(): void {
        for (const field of this.fieldNames) this.touched.add(field);
    }

    public getValues(): Readonly<V> {
        return { ...this.values };
    }

    public getError(field: keyof V): string | undefined {
        const rules = this.schema[field];
        for (const rule of rules) {
            const message = rule(this.values[field], this.values);
            if (message !== undefined) return message;
        }
        return undefined;
    }

    public getVisibleError(field: keyof V): string | undefined {
        return this.touched.has(field) ? this.getError(field) : undefined;
    }

    public isValid(): boolean {
        return this.fieldNames.every((field): boolean => this.getError(field) === undefined);
    }

    public reset(): void {
        this.values = this.createEmptyValues();
        this.touched = new Set();
    }
}
