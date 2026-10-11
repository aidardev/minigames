import { describe, expect, it, vi } from 'vitest';
import { FormValidator, type FormSchema } from './form-validator';
import { minLength, required, sameAs } from './rules';

type Values = { name: string; password: string; confirm: string };

const schema: FormSchema<Values> = {
    name: [required('name required')],
    password: [required('password required'), minLength(3, 'password short')],
    confirm: [sameAs<Values>('password', 'mismatch')],
};

function createValidator(): FormValidator<Values> {
    return new FormValidator(schema);
}

describe('FormValidator', () => {
    it('exposes field names and starts with empty values', () => {
        const validator = createValidator();

        expect(validator.fields).toEqual(['name', 'password', 'confirm']);
        expect(validator.getValues()).toEqual({ name: '', password: '', confirm: '' });
    });

    it('is invalid initially but shows no errors for untouched fields', () => {
        const validator = createValidator();

        expect(validator.isValid()).toBe(false);
        expect(validator.getError('name')).toBe('name required');
        expect(validator.getVisibleError('name')).toBeUndefined();
    });

    it('reveals an error once the field is touched', () => {
        const validator = createValidator();

        validator.touch('name');

        expect(validator.getVisibleError('name')).toBe('name required');
        expect(validator.getVisibleError('password')).toBeUndefined();
    });

    it('treats setValue as an interaction with the field', () => {
        const validator = createValidator();

        validator.setValue('password', 'a');

        expect(validator.getVisibleError('password')).toBe('password short');
    });

    it('clears the error when the value becomes valid', () => {
        const validator = createValidator();

        validator.setValue('password', 'a');
        validator.setValue('password', 'abc');

        expect(validator.getVisibleError('password')).toBeUndefined();
    });

    it('reports the first failing rule only and skips the rest', () => {
        const second = vi.fn(() => 'second');
        const validator = new FormValidator<{ field: string }>({
            field: [(): string => 'first', second],
        });

        expect(validator.getError('field')).toBe('first');
        expect(second).not.toHaveBeenCalled();
    });

    it('re-evaluates dependent fields when another field changes', () => {
        const validator = createValidator();

        validator.setValue('password', 'abc');
        validator.setValue('confirm', 'abc');
        expect(validator.getVisibleError('confirm')).toBeUndefined();

        validator.setValue('password', 'abcd');
        expect(validator.getVisibleError('confirm')).toBe('mismatch');

        validator.setValue('password', 'abc');
        expect(validator.getVisibleError('confirm')).toBeUndefined();
    });

    it('does not reveal a dependent field the user has not touched', () => {
        const validator = createValidator();

        validator.setValue('password', 'abc');

        expect(validator.getError('confirm')).toBe('mismatch');
        expect(validator.getVisibleError('confirm')).toBeUndefined();
    });

    it('is valid only when every field is valid', () => {
        const validator = createValidator();

        validator.setValue('name', 'Alex');
        validator.setValue('password', 'abc');
        expect(validator.isValid()).toBe(false);

        validator.setValue('confirm', 'abc');
        expect(validator.isValid()).toBe(true);
    });

    it('touchAll reveals every error at once', () => {
        const validator = createValidator();

        validator.touchAll();

        expect(validator.getVisibleError('name')).toBe('name required');
        expect(validator.getVisibleError('password')).toBe('password required');
        expect(validator.getVisibleError('confirm')).toBeUndefined();
    });

    it('reset restores empty values and hides errors', () => {
        const validator = createValidator();
        validator.setValue('name', 'Alex');
        validator.touchAll();

        validator.reset();

        expect(validator.getValues()).toEqual({ name: '', password: '', confirm: '' });
        expect(validator.getVisibleError('name')).toBeUndefined();
        expect(validator.isValid()).toBe(false);
    });

    it('returns a snapshot of values that cannot mutate the internal state', () => {
        const validator = createValidator();
        validator.setValue('name', 'Alex');

        const snapshot = { ...validator.getValues(), name: 'Hacked' };

        expect(snapshot.name).toBe('Hacked');
        expect(validator.getValues().name).toBe('Alex');
    });
});
