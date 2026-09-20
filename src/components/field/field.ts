import eyeOffIcon from '@/assets/icons/visibility-off.svg?raw';
import eyeIcon from '@/assets/icons/visibility.svg?raw';
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

export function renderField(options: FieldOptions): string {
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

    return /* HTML */ `
        <div class="field">
            <label class="field__label" for="${id}">${label}</label>
            <div class="field__control">
                <span class="field__icon" aria-hidden="true">${icon}</span>
                <input
                    class="field__input"
                    id="${id}"
                    name="${name}"
                    type="${type}"
                    placeholder="${placeholder}"
                    autocomplete="${autocomplete}"
                >
                ${passwordToggle ? renderPasswordToggle() : ''}
            </div>
        </div>
    `;
}

function renderPasswordToggle(): string {
    return /* HTML */ `
        <button class="field__toggle" type="button" aria-label="Show password" data-password-toggle>
            <span class="field__toggle-icon field__toggle-icon--show">${eyeIcon}</span>
            <span class="field__toggle-icon field__toggle-icon--hide">${eyeOffIcon}</span>
        </button>
    `;
}
