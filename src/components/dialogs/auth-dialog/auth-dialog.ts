import { Dialog } from '../dialog';
import './auth-dialog.scss';
import { LoginForm } from './login-form';
import { RegisterForm } from './register-form';

export type AuthTab = 'login' | 'register';

export function toAuthTab(value: string | undefined): AuthTab {
    return value === 'register' ? 'register' : 'login';
}

export class AuthDialog extends Dialog {
    private handleSwitchClick = (event: MouseEvent) => {
        if (!(event.target instanceof Element)) return;

        const trigger = event.target.closest<HTMLElement>('[data-auth-tab]');
        if (!trigger) return;

        this.showTab(toAuthTab(trigger.dataset.authTab));
    };

    constructor(initialTab: AuthTab = 'login') {
        super({
            label: 'Auth Dialog',
            modifier: 'dialog--auth',
        });

        this.setContent(/* HTML */ `
            <div class="auth">
                <div class="auth__tabs" role="tablist" aria-label="Login or register">
                    <button
                        class="auth__tab"
                        id="auth-tab-login"
                        type="button"
                        role="tab"
                        aria-controls="auth-panel-login"
                        data-auth-tab="login"
                    >
                        Login
                    </button>
                    <button
                        class="auth__tab"
                        id="auth-tab-register"
                        type="button"
                        role="tab"
                        aria-controls="auth-panel-register"
                        data-auth-tab="register"
                    >
                        Register
                    </button>
                </div>

                <div
                    class="auth__panel"
                    id="auth-panel-login"
                    role="tabpanel"
                    aria-labelledby="auth-tab-login"
                    data-auth-panel="login"
                ></div>
                <div
                    class="auth__panel"
                    id="auth-panel-register"
                    role="tabpanel"
                    aria-labelledby="auth-tab-register"
                    data-auth-panel="register"
                ></div>
            </div>
        `);

        this.mountForms();
        this.showTab(initialTab);
        this.bindTabEvents();
    }

    private mountForms() {
        this.query('[data-auth-panel="login"]')?.append(new LoginForm().element);
        this.query('[data-auth-panel="register"]')?.append(new RegisterForm().element);
    }

    private bindTabEvents() {
        this.element.addEventListener('click', this.handleSwitchClick);
    }

    private showTab(tab: AuthTab) {
        for (const button of this.element.querySelectorAll<HTMLButtonElement>('[role="tab"]')) {
            button.setAttribute('aria-selected', String(button.dataset.authTab === tab));
        }

        for (const panel of this.element.querySelectorAll<HTMLElement>('[role="tabpanel"]')) {
            panel.hidden = panel.dataset.authPanel !== tab;
        }
    }
}
