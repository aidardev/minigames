import lockIcon from '@/assets/icons/lock.svg?raw';
import mailIcon from '@/assets/icons/mail.svg?raw';
import userIcon from '@/assets/icons/person.svg?raw';
import googleIcon from '@/assets/images/google.svg';
import { renderField } from '@/components/field/field';
import { html, unsafeHtml } from '@/utils/html';
import { AuthForm, type AuthFormOptions } from './auth-form';
import { registerSchema, type RegisterValues } from './auth-validation';

export class RegisterForm extends AuthForm<RegisterValues> {
    constructor(options: AuthFormOptions<RegisterValues> = {}) {
        super(
            html`
                <div class="auth-form__head">
                    <h2 class="auth-form__title">Create Account</h2>
                    <p class="auth-form__subtitle">
                        Join MiniGames to track your score &amp; streak.
                    </p>
                </div>

                <div class="auth-form__fields">
                    ${renderField({
                        id: 'register-username',
                        name: 'username',
                        label: 'Username',
                        type: 'text',
                        placeholder: 'e.g. CozyGamer99',
                        icon: userIcon,
                        autocomplete: 'username',
                    })}
                    ${renderField({
                        id: 'register-email',
                        name: 'email',
                        label: 'Email Address',
                        type: 'email',
                        placeholder: 'your.email@domain.com',
                        icon: mailIcon,
                        autocomplete: 'email',
                    })}
                    ${renderField({
                        id: 'register-password',
                        name: 'password',
                        label: 'Password',
                        type: 'password',
                        placeholder: 'Min. 6 characters',
                        icon: lockIcon,
                        autocomplete: 'new-password',
                    })}
                    ${renderField({
                        id: 'register-confirm-password',
                        name: 'confirmPassword',
                        label: 'Confirm Password',
                        type: 'password',
                        placeholder: 'Repeat your password',
                        icon: lockIcon,
                        autocomplete: 'new-password',
                    })}
                </div>

                <div class="auth-form__actions">
                    <button
                        class="auth-form__btn auth-form__btn--submit btn btn--large btn--primary"
                        type="submit"
                    >
                        Create Account
                    </button>
                    <div class="auth-form__divider" aria-hidden="true"><span>OR</span></div>
                    <button
                        class="auth-form__btn auth-form__btn--google btn btn--medium btn--outline-on-primary"
                        type="button"
                    >
                        <img src="${unsafeHtml(googleIcon)}" alt="" width="24" height="24">
                        Sign up with Google
                    </button>
                </div>

                <p class="auth-form__switch">
                    Already have an account?
                    <button class="auth-form__link" type="button" data-auth-tab="login">
                        Login
                    </button>
                </p>
            `,
            registerSchema,
            options,
        );
    }
}
