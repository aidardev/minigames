import type { FormSchema } from '@/utils/validation/form-validator';
import {
    maxLength,
    minLength,
    pattern,
    required,
    sameAs,
    type ValueRule,
} from '@/utils/validation/rules';

export type LoginValues = {
    email: string;
    password: string;
};

export type RegisterValues = {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
};

export const USERNAME_MIN_LENGTH = 2;
export const USERNAME_MAX_LENGTH = 30;
export const PASSWORD_MIN_LENGTH = 6;

export const AuthErrorMessage = {
    emailRequired: 'Email is required.',
    emailInvalid: 'Enter a valid email address, e.g. name@example.com.',
    usernameRequired: 'Username is required.',
    usernameTooShort: `Username must be at least ${USERNAME_MIN_LENGTH} characters long.`,
    usernameTooLong: `Username must be at most ${USERNAME_MAX_LENGTH} characters long.`,
    usernameStart: 'Username must start with an uppercase English letter.',
    usernameChars: 'Username may contain only English letters and digits.',
    passwordRequired: 'Password is required.',
    passwordTooShort: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`,
    passwordChars: 'Password may contain only English letters, digits and special characters.',
    passwordUppercase: 'Password must contain at least one uppercase English letter.',
    passwordDigit: 'Password must contain at least one digit.',
    passwordSpecial: 'Password must contain at least one special character.',
    confirmRequired: 'Please confirm your password.',
    confirmMismatch: 'Passwords do not match.',
} as const;

// Dot-atom local part (RFC 5322) + dotted domain labels + alphabetic TLD of 2+ letters.
const EMAIL_PATTERN =
    /^[\w!#$%&'*+/=?^`{|}~-]+(?:\.[\w!#$%&'*+/=?^`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;
const USERNAME_START_PATTERN = /^[A-Z]/;
const USERNAME_CHARS_PATTERN = /^[A-Za-z0-9]+$/;
// Printable ASCII without space: English letters, digits and special characters.
const PASSWORD_CHARS_PATTERN = /^[\u{21}-\u{7E}]+$/u;
const UPPERCASE_PATTERN = /[A-Z]/;
const DIGIT_PATTERN = /[0-9]/;
const SPECIAL_PATTERN = /[^A-Za-z0-9]/;

const emailRules: readonly ValueRule[] = [
    required(AuthErrorMessage.emailRequired),
    pattern(EMAIL_PATTERN, AuthErrorMessage.emailInvalid),
];

export const loginSchema: FormSchema<LoginValues> = {
    email: emailRules,
    // Login must accept any existing password, so no strength rules here.
    password: [
        required(AuthErrorMessage.passwordRequired),
        minLength(PASSWORD_MIN_LENGTH, AuthErrorMessage.passwordTooShort),
    ],
};

export const registerSchema: FormSchema<RegisterValues> = {
    username: [
        required(AuthErrorMessage.usernameRequired),
        minLength(USERNAME_MIN_LENGTH, AuthErrorMessage.usernameTooShort),
        maxLength(USERNAME_MAX_LENGTH, AuthErrorMessage.usernameTooLong),
        pattern(USERNAME_START_PATTERN, AuthErrorMessage.usernameStart),
        pattern(USERNAME_CHARS_PATTERN, AuthErrorMessage.usernameChars),
    ],
    email: emailRules,
    password: [
        required(AuthErrorMessage.passwordRequired),
        minLength(PASSWORD_MIN_LENGTH, AuthErrorMessage.passwordTooShort),
        pattern(PASSWORD_CHARS_PATTERN, AuthErrorMessage.passwordChars),
        pattern(UPPERCASE_PATTERN, AuthErrorMessage.passwordUppercase),
        pattern(DIGIT_PATTERN, AuthErrorMessage.passwordDigit),
        pattern(SPECIAL_PATTERN, AuthErrorMessage.passwordSpecial),
    ],
    // Only the match is checked; password strength rules are not applied here.
    confirmPassword: [
        required(AuthErrorMessage.confirmRequired),
        sameAs<RegisterValues>('password', AuthErrorMessage.confirmMismatch),
    ],
};
