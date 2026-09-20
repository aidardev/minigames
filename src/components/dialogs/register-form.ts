import lockIcon from '@/assets/icons/lock.svg?raw';
import mailIcon from '@/assets/icons/mail.svg?raw';
import userIcon from '@/assets/icons/person.svg?raw';
import googleIcon from '@/assets/images/google.svg';
import { BaseComponent } from '../base-component';
import { renderField } from '../field/field';

export class RegisterForm extends BaseComponent<'form'> {
    private handleSubmit = (event: SubmitEvent) => {
        event.preventDefault();
    };

    public constructor() {
        super('form', 'auth-form');

        this.element.noValidate = true;

        this.element.innerHTML = /* HTML */ `
            <div class="auth-form__head">
                <h2 class="auth-form__title">Create Account</h2>
                <p class="auth-form__subtitle">Join MiniGames to track your score & streak.</p>
            </div>

            <div class="auth-form__fields">
                ${renderField({
                    id: 'register-username',
                    name: 'username',
                    label: 'Username',
                    type: 'text',
                    placeholder: 'e.g. CozyGamer_99',
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
                    placeholder: 'Min. 8 characters',
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
                    <img src="${googleIcon}" alt="" width="24" height="24">
                    Sign up with Google
                </button>
            </div>

            <p class="auth-form__switch">
                Already have an account?
                <button class="auth-form__link" type="button" data-auth-tab="login">Login</button>
            </p>
        `;

        this.element.addEventListener('submit', this.handleSubmit);
    }
}
