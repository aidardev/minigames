import { html } from '@/utils/html';
import { Dialog } from '../dialog';
import './auth-dialog.scss';
import { LoginForm } from './login-form';
import { RegisterForm } from './register-form';

export type AuthTab = 'login' | 'register';

export function toAuthTab(value: string | null | undefined): AuthTab {
    return value === 'register' ? 'register' : 'login';
}

export interface AuthDialogOptions {
    initialTab?: AuthTab;
    // Called when the user switches tabs inside the dialog (not on programmatic setTab).
    onTabChange?: (tab: AuthTab) => void;
}

export class AuthDialog extends Dialog {
    private readonly onTabChange?: (tab: AuthTab) => void;

    private handleSwitchClick = (event: MouseEvent): void => {
        if (!(event.target instanceof Element)) return;

        const trigger = event.target.closest<HTMLElement>('[data-auth-tab]');
        if (!trigger) return;

        const tab = toAuthTab(trigger.dataset.authTab);

        this.setTab(tab);
        this.onTabChange?.(tab);
    };

    constructor({ initialTab = 'login', onTabChange }: AuthDialogOptions = {}) {
        super({
            label: 'Auth Dialog',
            modifier: 'dialog--auth',
        });

        this.onTabChange = onTabChange;

        this.setContent(html`
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
        this.setTab(initialTab);
        this.bindTabEvents();
    }

    private mountForms(): void {
        this.query('[data-auth-panel="login"]')?.append(new LoginForm().element);
        this.query('[data-auth-panel="register"]')?.append(new RegisterForm().element);
    }

    private bindTabEvents(): void {
        this.element.addEventListener('click', this.handleSwitchClick);
    }

    public setTab(tab: AuthTab): void {
        for (const button of this.element.querySelectorAll<HTMLButtonElement>('[role="tab"]')) {
            button.setAttribute('aria-selected', String(button.dataset.authTab === tab));
        }

        for (const panel of this.element.querySelectorAll<HTMLElement>('[role="tabpanel"]')) {
            panel.hidden = panel.dataset.authPanel !== tab;
        }
    }
}
