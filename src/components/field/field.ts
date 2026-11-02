import eyeOffIcon from '@/assets/icons/visibility-off.svg?raw';
import eyeIcon from '@/assets/icons/visibility.svg?raw';
import { html, SafeHtml, unsafeHtml } from '@/utils/html';
import './field.scss';

interface CommonFieldOptions {
    id: string;
    name: string;
    label: string;
    placeholder: string;
    autocomplete?: string;
    maxLength?: number;
    required?: boolean;
    autofocus?: boolean;
    optional?: boolean;
}

interface InputFieldOptions extends CommonFieldOptions {
    type: 'text' | 'email' | 'password';
    icon?: string;
    passwordToggle?: boolean;
}

interface TextareaFieldOptions extends CommonFieldOptions {
    type: 'textarea';
    rows?: number;
    icon?: never;
    passwordToggle?: never;
}

export type FieldOptions = InputFieldOptions | TextareaFieldOptions;

export function renderField(options: FieldOptions): SafeHtml {
    const { id, name, label, icon, optional = false } = options;
    const hasIcon = Boolean(icon);
    const hasPasswordToggle = options.type === 'password' && options.passwordToggle;

    return html`
        <div
            class="field${hasIcon ? ' field--has-icon' : ''}${
                hasPasswordToggle ? ' field--has-password-toggle' : ''
            }"
        >
            <label class="field__label" for="${id}">
                ${label} ${optional ? html`<span class="field__optional">(optional)</span>` : ''}
            </label>
            <div class="field__control">
                ${
                    icon
                        ? html`<span class="field__icon" aria-hidden="true"
                              >${unsafeHtml(icon)}</span
                          >`
                        : ''
                }
                ${renderControl(options)} ${hasPasswordToggle ? renderPasswordToggle() : ''}
            </div>
            ${renderFieldError(id, name)}
        </div>
    `;
}

function renderControl(options: FieldOptions): SafeHtml {
    const attributes = html`
        id="${options.id}" name="${options.name}" placeholder="${options.placeholder}"
        autocomplete="${options.autocomplete ?? 'off'}" aria-describedby="${options.id}-error"
        ${options.maxLength === undefined ? '' : html`maxlength="${options.maxLength}"`}
        ${options.required ? html`required` : ''} ${options.autofocus ? html`autofocus` : ''}
    `;

    return options.type === 'textarea'
        ? html`<textarea
              class="field__input field__input--multiline"
              ${attributes}
              rows="${options.rows ?? 4}"
          ></textarea>`
        : html`<input class="field__input" ${attributes} type="${options.type}">`;
}

function renderFieldError(id: string, name: string): SafeHtml {
    return html`
        <p
            class="field__error"
            id="${id}-error"
            data-field-error="${name}"
            aria-live="polite"
            hidden
        ></p>
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
