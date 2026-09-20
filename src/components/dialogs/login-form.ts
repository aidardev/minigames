import lockIcon from '@/assets/icons/lock.svg?raw';
import mailIcon from '@/assets/icons/mail.svg?raw';
import googleIcon from '@/assets/images/google.svg';
import { BaseComponent } from '../base-component';
import { renderField } from '../field/field';

export class Loginform extends BaseComponent<'form'> {
    private handleSubmit = (event: SubmitEvent) => {
        event.preventDefault();
    };

    public constructor() {
        super('form', 'auth-form');

        this.element.noValidate = true;

        this.element.innerHTML = /* HTML */ `
            <div class="auth-form__head">
                <h2 class="auth-form__title">Welcome Back!</h2>
                <p class="auth-form__subtitle">Sign in to resume your games and progress.</p>
            </div>

            <div class="auth-form__fields">
                ${renderField({
                    id: 'login-email',
                    name: 'email',
                    label: 'Email Address',
                    type: 'email',
                    placeholder: 'e.g. alex@minigames.com',
                    icon: mailIcon,
                    autocomplete: 'email',
                })}
                ${renderField({
                    id: 'login-password',
                    name: 'password',
                    label: 'Password',
                    type: 'password',
                    placeholder: '••••••••',
                    icon: lockIcon,
                    autocomplete: 'current-password',
                    passwordToggle: true,
                })}
                <button class="auth-form__link auth-form__link--forgot" type="button">
                    Forgot Password?
                </button>
            </div>

            <div class="auth-form__actions">
                <button
                    class="auth-form__btn auth-form__btn--submit btn btn--large btn--primary"
                    type="submit"
                >
                    Login
                </button>
                <div class="auth-form__divider" aria-hidden="true"><span>OR</span></div>
                <button
                    class="auth-form__btn auth-form__btn--google btn btn--medium btn--outline-on-primary"
                    type="button"
                >
                    <img src="${googleIcon}" alt="" width="24" height="24">
                    Continue with Google
                </button>
            </div>

            <p class="auth-form__switch">
                Don't have an account?
                <button class="auth-form__link" type="button" data-auth-tab="register">
                    Register
                </button>
            </p>
        `;

        this.element.addEventListener('submit', this.handleSubmit);
    }
}
