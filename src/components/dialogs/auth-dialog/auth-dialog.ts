import { html } from '@/utils/html';
import { Dialog } from '../dialog';
import './auth-dialog.scss';
import type { LoginValues, RegisterValues } from './auth-validation';
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
    // Called with validated values. The dialog stays locked until the promise settles,
    // so the handler must handle its own errors and never reject.
    onLogin?: (values: Readonly<LoginValues>) => Promise<void>;
    onRegister?: (values: Readonly<RegisterValues>) => Promise<void>;
}

export class AuthDialog extends Dialog {
    private readonly onTabChange?: (tab: AuthTab) => void;
    private readonly onLogin?: (values: Readonly<LoginValues>) => Promise<void>;
    private readonly onRegister?: (values: Readonly<RegisterValues>) => Promise<void>;
    private readonly forms: Record<AuthTab, LoginForm | RegisterForm>;
    private currentTab: AuthTab | undefined;

    private handleSwitchClick = (event: MouseEvent): void => {
        if (!(event.target instanceof Element)) return;

        const trigger = event.target.closest<HTMLElement>('[data-auth-tab]');
        if (!trigger) return;

        const tab = toAuthTab(trigger.dataset.authTab);

        this.setTab(tab);
        this.onTabChange?.(tab);
    };

    constructor({
        initialTab = 'login',
        onTabChange,
        onLogin,
        onRegister,
    }: AuthDialogOptions = {}) {
        super({
            label: 'Auth Dialog',
            modifier: 'dialog--auth',
        });

        this.onTabChange = onTabChange;
        this.onLogin = onLogin;
        this.onRegister = onRegister;

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

        this.forms = this.mountForms();
        this.setTab(initialTab);
        this.bindTabEvents();
    }

    private mountForms(): Record<AuthTab, LoginForm | RegisterForm> {
        const forms = {
            login: this.adopt(
                new LoginForm({
                    onSubmit: (values): void => this.submit(this.onLogin, values),
                }),
            ),
            register: this.adopt(
                new RegisterForm({
                    onSubmit: (values): void => this.submit(this.onRegister, values),
                }),
            ),
        };

        this.query('[data-auth-panel="login"]')?.append(forms.login.element);
        this.query('[data-auth-panel="register"]')?.append(forms.register.element);

        return forms;
    }

    private bindTabEvents(): void {
        this.element.addEventListener('click', this.handleSwitchClick);
    }

    private submit<V>(
        handler: ((values: Readonly<V>) => Promise<void>) | undefined,
        values: Readonly<V>,
    ): void {
        if (!handler) return;

        void this.runPending(() => handler(values));
    }

    private async runPending(action: () => Promise<void>): Promise<void> {
        this.setPending(true);

        try {
            await action();
        } finally {
            this.setPending(false);
        }
    }

    // While a request is in flight nothing can be edited, switched or dismissed.
    private setPending(isPending: boolean): void {
        this.setLocked(isPending);

        for (const form of Object.values(this.forms)) form.setPending(isPending);

        for (const tab of this.element.querySelectorAll<HTMLButtonElement>('.auth__tab')) {
            tab.disabled = isPending;
        }

        // TODO: disable the close button here too once the dialog gets one (not in the design yet).
    }

    public setTab(tab: AuthTab): void {
        // Can be called with the current tab (URL sync, repeated click on the active tab).
        // That is not a real switch, so keep what the user has typed.
        if (tab === this.currentTab) return;
        this.currentTab = tab;

        for (const button of this.element.querySelectorAll<HTMLButtonElement>('[role="tab"]')) {
            button.setAttribute('aria-selected', String(button.dataset.authTab === tab));
        }

        for (const panel of this.element.querySelectorAll<HTMLElement>('[role="tabpanel"]')) {
            panel.hidden = panel.dataset.authPanel !== tab;
        }

        // Switching tabs resets both forms
        for (const form of Object.values(this.forms)) form.reset();
    }
}
