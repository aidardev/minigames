import checkIcon from '@/assets/icons/check.svg?raw';
import { BaseComponent } from '@/components/base-component';
import './dropdown.scss';

export interface DropdownOption {
    id: string;
    label: string;
}

export interface DropdownProperties {
    options: DropdownOption[];
    activeId: string;
    label?: string;
    onChange?: (id: string) => void;
    modifier?: string;
}

export class Dropdown extends BaseComponent {
    private readonly options: DropdownOption[];
    private readonly onChange?: (id: string) => void;
    private activeId: string;
    private isOpen = false;

    private readonly triggerEl: HTMLButtonElement;
    private readonly listEl: HTMLElement;
    private readonly valueEl: HTMLElement;

    private handleTriggerClick = (): void => {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    };

    private handleOptionClick = (event: MouseEvent): void => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        const optionElement = target.closest<HTMLButtonElement>('.dropdown__option');
        if (!optionElement) return;

        const id = optionElement.dataset.id;
        if (!id || id === this.activeId) {
            this.close();
            return;
        }

        this.activeId = id;
        this.updateValueLabel();
        this.renderOptions();
        this.close();
        this.onChange?.(id);
    };

    private handleOutsideClick = (event: MouseEvent): void => {
        if (!this.isOpen) return;
        if (event.target instanceof Node && this.element.contains(event.target)) return;
        this.close();
    };

    private handleKeydown = (event: KeyboardEvent): void => {
        if (event.key === 'Escape' && this.isOpen) {
            this.close();
        }
    };

    constructor({ options, activeId, label = 'Sort by', onChange, modifier }: DropdownProperties) {
        super('div', 'dropdown');
        this.options = options;
        this.activeId = activeId;
        this.onChange = onChange;

        if (modifier) this.element.classList.add(modifier);

        this.element.innerHTML = /* HTML */ `
            <button type="button" class="dropdown__btn" aria-expanded="false">
                <span class="dropdown__label">${label}: <span class="dropdown__value"></span></span>
            </button>
            <ul class="dropdown__list list-unstyled"></ul>
        `;

        const triggerElement = this.query<HTMLButtonElement>('.dropdown__btn');
        const listElement = this.query<HTMLElement>('.dropdown__list');
        const valueElement = this.query<HTMLElement>('.dropdown__value');

        if (!triggerElement || !listElement || !valueElement) {
            throw new Error('Required dropdown elements are missing from the DOM.');
        }

        this.triggerEl = triggerElement;
        this.listEl = listElement;
        this.valueEl = valueElement;

        this.renderOptions();
        this.updateValueLabel();

        this.triggerEl.addEventListener('click', this.handleTriggerClick);
        this.listEl.addEventListener('click', this.handleOptionClick);
        document.addEventListener('click', this.handleOutsideClick);
        document.addEventListener('keydown', this.handleKeydown);
    }

    private renderOptions(): void {
        this.listEl.innerHTML = this.options
            .map(
                (option) => /* HTML */ `
                    <li>
                        <button
                            type="button"
                            class="dropdown__option ${option.id === this.activeId ? 'dropdown__option--active' : ''}"
                            data-id="${option.id}"
                        >
                            ${checkIcon} ${option.label}
                        </button>
                    </li>
                `,
            )
            .join('');
    }

    private updateValueLabel(): void {
        this.valueEl.textContent = this.options.find((o) => o.id === this.activeId)?.label ?? '';
    }

    private open(): void {
        this.isOpen = true;
        this.triggerEl.setAttribute('aria-expanded', 'true');
        this.element.classList.add('dropdown--open');
    }

    private close(): void {
        this.isOpen = false;
        this.triggerEl.setAttribute('aria-expanded', 'false');
        this.element.classList.remove('dropdown--open');
    }

    public destroy(): void {
        document.removeEventListener('click', this.handleOutsideClick);
        document.removeEventListener('keydown', this.handleKeydown);
        super.destroy();
    }
}
