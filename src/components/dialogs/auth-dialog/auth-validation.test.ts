import { FormValidator } from '@/utils/validation/form-validator';
import { describe, expect, it } from 'vitest';
import {
    AuthErrorMessage as Message,
    loginSchema,
    registerSchema,
    type LoginValues,
    type RegisterValues,
} from './auth-validation';

function registerError(field: keyof RegisterValues, value: string): string | undefined {
    const validator = new FormValidator(registerSchema);
    validator.setValue(field, value);
    return validator.getError(field);
}

function loginError(field: keyof LoginValues, value: string): string | undefined {
    const validator = new FormValidator(loginSchema);
    validator.setValue(field, value);
    return validator.getError(field);
}

describe('email (login and registration)', () => {
    it.each([['alex@minigames.com'], ['first.last+tag@sub.domain.io'], ['a_b@x-y.co']])(
        'accepts %s',
        (email) => {
            expect(loginError('email', email)).toBeUndefined();
            expect(registerError('email', email)).toBeUndefined();
        },
    );

    it.each([
        [''],
        ['plain'],
        ['no-at.example.com'],
        ['@example.com'],
        ['user@'],
        ['user@localhost'],
        ['user@domain.c'],
        ['user@domain..com'],
        ['.user@domain.com'],
        ['us..er@domain.com'],
        ['us er@domain.com'],
        ['user@-domain.com'],
        ['user@domain.com.'],
    ])('rejects "%s"', (email) => {
        expect(loginError('email', email)).toBeDefined();
        expect(registerError('email', email)).toBeDefined();
    });

    it('distinguishes a missing email from a malformed one', () => {
        expect(loginError('email', '')).toBe(Message.emailRequired);
        expect(loginError('email', 'nope')).toBe(Message.emailInvalid);
    });
});

describe('username (registration)', () => {
    it.each([['Al'], ['Alex99'], ['A1'], ['A'.repeat(30)]])('accepts "%s"', (username) => {
        expect(registerError('username', username)).toBeUndefined();
    });

    it.each([
        ['', Message.usernameRequired],
        ['A', Message.usernameTooShort],
        ['A'.repeat(31), Message.usernameTooLong],
        ['alex', Message.usernameStart],
        ['1Alex', Message.usernameStart],
        ['_Alex', Message.usernameStart],
        ['Alex_99', Message.usernameChars],
        ['Alex Doe', Message.usernameChars],
        ['Алекс', Message.usernameStart],
        ['Alexé', Message.usernameChars],
    ])('rejects "%s" with the right message', (username, message) => {
        expect(registerError('username', username)).toBe(message);
    });
});

describe('password (registration)', () => {
    it.each([['Abcde1!'], ['Z9#aaa'], ['Passw0rd?'], ['A1~~~~']])('accepts "%s"', (password) => {
        expect(registerError('password', password)).toBeUndefined();
    });

    it.each([
        ['', Message.passwordRequired],
        ['Ab1!', Message.passwordTooShort],
        ['Abcd1!é', Message.passwordChars],
        ['Abc 1!x', Message.passwordChars],
        ['abcde1!', Message.passwordUppercase],
        ['Abcdef!', Message.passwordDigit],
        ['Abcdef1', Message.passwordSpecial],
    ])('rejects "%s" with the right message', (password, message) => {
        expect(registerError('password', password)).toBe(message);
    });
});

describe('password (login)', () => {
    it('requires a value of at least 6 characters', () => {
        expect(loginError('password', '')).toBe(Message.passwordRequired);
        expect(loginError('password', '12345')).toBe(Message.passwordTooShort);
        expect(loginError('password', '123456')).toBeUndefined();
    });

    it('does not apply the registration strength rules', () => {
        expect(loginError('password', 'alllowercase')).toBeUndefined();
    });
});

describe('confirm password (registration)', () => {
    it('is required', () => {
        expect(registerError('confirmPassword', '')).toBe(Message.confirmRequired);
    });

    it('only has to match the password, not satisfy its rules', () => {
        const validator = new FormValidator(registerSchema);
        validator.setValue('password', 'weak');
        validator.setValue('confirmPassword', 'weak');

        expect(validator.getError('confirmPassword')).toBeUndefined();
    });

    it('is case sensitive and exact', () => {
        const validator = new FormValidator(registerSchema);
        validator.setValue('password', 'Abcde1!');

        validator.setValue('confirmPassword', 'abcde1!');
        expect(validator.getError('confirmPassword')).toBe(Message.confirmMismatch);

        validator.setValue('confirmPassword', 'Abcde1! ');
        expect(validator.getError('confirmPassword')).toBe(Message.confirmMismatch);

        validator.setValue('confirmPassword', 'Abcde1!');
        expect(validator.getError('confirmPassword')).toBeUndefined();
    });
});

describe('form validity', () => {
    it('login is valid with a good email and password', () => {
        const validator = new FormValidator(loginSchema);
        validator.setValue('email', 'alex@minigames.com');
        validator.setValue('password', 'secret');

        expect(validator.isValid()).toBe(true);
    });

    it('registration needs every field to be valid', () => {
        const validator = new FormValidator(registerSchema);
        validator.setValue('username', 'Alex');
        validator.setValue('email', 'alex@minigames.com');
        validator.setValue('password', 'Abcde1!');
        expect(validator.isValid()).toBe(false);

        validator.setValue('confirmPassword', 'Abcde1!');
        expect(validator.isValid()).toBe(true);
    });
});
