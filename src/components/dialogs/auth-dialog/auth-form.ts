import { BaseComponent } from '@/components/base-component';
import { bindPasswordToggles, resetPasswordToggles } from '@/components/field/password-toggle';
import type { SafeHtml } from '@/utils/html';
import { FormValidator, type FormSchema } from '@/utils/validation/form-validator';

export interface AuthFormOptions<V> {
    // Called only with values that passed validation.
    onSubmit?: (values: Readonly<V>) => void;
}

interface FieldView {
    input: HTMLInputElement;
    error: HTMLElement;
}

// What started the pending state; only the form's own submit relabels the submit button.
export type PendingKind = 'submit' | 'google';

const FIELD_EVENTS = ['input', 'change', 'focusout'] as const;

/**
 * Base class for the login and register forms.
 * Validates fields on input/change/blur, shows inline errors
 * and keeps the submit button disabled while the form is invalid.
 *
 * Expected markup for every field in the schema (see renderField):
 * <input name="field"> and <p data-field-error="field" hidden></p>
 */
export abstract class AuthForm<V extends Record<keyof V, string>> extends BaseComponent<'form'> {
    private readonly validator: FormValidator<V>;
    private readonly fieldViews = new Map<keyof V & string, FieldView>();
    private readonly submitButton: HTMLButtonElement;
    private readonly onSubmit?: (values: Readonly<V>) => void;
    private readonly idleSubmitLabel: string;
    private pending = false;

    private handleFieldEvent = (event: Event): void => {
        if (!(event.target instanceof HTMLInputElement)) return;

        const field = this.findField(event.target);
        if (field === undefined) return;

        // setValue also marks the field as touched, so blur is covered too
        this.validator.setValue(field, event.target.value);
        this.render();
    };

    private handleSubmit = (event: SubmitEvent): void => {
        event.preventDefault();

        if (this.pending) return;

        // Extra guard: submit can fire without the button (e.g. requestSubmit())
        this.validator.touchAll();
        this.render();
        if (!this.validator.isValid()) return;

        this.onSubmit?.(this.validator.getValues());
    };

    protected constructor(
        markup: SafeHtml,
        schema: FormSchema<V>,
        { onSubmit }: AuthFormOptions<V> = {},
    ) {
        super('form', 'auth-form');

        this.element.noValidate = true;
        this.setHtml(markup);
        this.onSubmit = onSubmit;
        this.validator = new FormValidator(schema);
        this.submitButton = this.requireElement<HTMLButtonElement>('button[type="submit"]');
        this.idleSubmitLabel = this.submitButton.textContent.trim();
        this.collectFields();
        this.bindEvents();
        this.render();
    }

    private collectFields(): void {
        for (const field of this.validator.fields) {
            this.fieldViews.set(field, {
                input: this.requireElement<HTMLInputElement>(`input[name="${field}"]`),
                error: this.requireElement(`[data-field-error="${field}"]`),
            });
        }
    }

    private bindEvents(): void {
        for (const type of FIELD_EVENTS) {
            this.element.addEventListener(type, this.handleFieldEvent);
        }
        this.element.addEventListener('submit', this.handleSubmit);
        bindPasswordToggles(this.element);
    }

    private requireElement<E extends HTMLElement>(selector: string): E {
        const element = this.query<E>(selector);
        if (!element) throw new Error(`Auth form markup is missing "${selector}"`);
        return element;
    }

    private findField(input: HTMLInputElement): (keyof V & string) | undefined {
        for (const [field, view] of this.fieldViews) {
            if (view.input === input) return field;
        }
        return undefined;
    }

    private render(): void {
        for (const [field, { input, error }] of this.fieldViews) {
            const message = this.validator.getVisibleError(field);

            error.textContent = message ?? '';
            error.hidden = message === undefined;

            input.removeAttribute('aria-invalid');
            if (message !== undefined) {
                input.setAttribute('aria-invalid', 'true');
            }
        }

        this.submitButton.disabled = this.pending || !this.validator.isValid();
    }

    /**
     * Locks every control (inputs, submit, Google, tab links) while a request is in flight.
     * For a submit request the submit button shows its data-pending-label, if it has one.
     */
    public setPending(isPending: boolean, kind: PendingKind = 'submit'): void {
        this.pending = isPending;

        for (const control of this.element.querySelectorAll<HTMLInputElement | HTMLButtonElement>(
            'input, button',
        )) {
            control.disabled = isPending;
        }

        const pendingLabel = this.submitButton.dataset.pendingLabel;
        this.submitButton.textContent =
            isPending && kind === 'submit' && pendingLabel ? pendingLabel : this.idleSubmitLabel;
        this.element.setAttribute('aria-busy', String(isPending));

        // Re-enables the submit button only if the form is valid.
        this.render();
    }

    // Clears the inputs, the touched state and every error message.
    public reset(): void {
        this.element.reset();
        resetPasswordToggles(this.element);
        this.validator.reset();
        this.render();
    }
}
