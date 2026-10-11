import eyeOffIcon from '@/assets/icons/visibility-off.svg?raw';
import eyeIcon from '@/assets/icons/visibility.svg?raw';
import { html, SafeHtml, unsafeHtml } from '@/utils/html';
import './field.scss';

export interface FieldOptions {
    id: string;
    name: string;
    label: string;
    type: 'text' | 'email' | 'password';
    placeholder: string;
    icon: string;
    autocomplete: string;
    passwordToggle?: boolean;
}

export function renderField(options: FieldOptions): SafeHtml {
    const {
        id,
        name,
        label,
        type,
        placeholder,
        icon,
        autocomplete,
        passwordToggle = false,
    } = options;

    return html`
        <div class="field${passwordToggle ? ' field--has-password-toggle' : ''}">
            <label class="field__label" for="${id}">${label}</label>
            <div class="field__control">
                <span class="field__icon" aria-hidden="true">${unsafeHtml(icon)}</span>
                <input
                    class="field__input"
                    id="${id}"
                    name="${name}"
                    type="${type}"
                    placeholder="${placeholder}"
                    autocomplete="${autocomplete}"
                    aria-describedby="${id}-error"
                >
                ${passwordToggle ? renderPasswordToggle() : ''}
            </div>
            <p
                class="field__error"
                id="${id}-error"
                data-field-error="${name}"
                aria-live="polite"
                hidden
            ></p>
        </div>
    `;
}

function renderPasswordToggle(): SafeHtml {
    return html`
        <button
            class="field__toggle"
            type="button"
            aria-label="Show password"
            aria-pressed="false"
            data-password-toggle
        >
            <span class="field__toggle-icon field__toggle-icon--show">${unsafeHtml(eyeIcon)}</span>
            <span class="field__toggle-icon field__toggle-icon--hide"
                >${unsafeHtml(eyeOffIcon)}</span
            >
        </button>
    `;
}
