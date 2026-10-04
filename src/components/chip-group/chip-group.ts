import { html, SafeHtml } from '@/utils/html';
import { BaseComponent } from '../base-component';
import './chip-group.scss';
import type { ChipGroupProperties, ChipOption } from './chip-group.types';

export class ChipGroup extends BaseComponent {
    private activeClass = 'chip--active';
    private activeId: string;
    private readonly onChange?: (id: string) => void;

    private handleClick = (event: Event): void => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        const chip = target.closest<HTMLButtonElement>('.chip-group__chip');
        if (!chip) return;

        const id = chip.dataset.id;
        if (!id || id === this.activeId) return;

        this.setActive(id);
        this.onChange?.(id);
    };

    constructor({ options, activeId, onChange, modifier }: ChipGroupProperties) {
        super('div', 'chip-group');
        this.activeId = activeId;
        this.onChange = onChange;

        if (modifier) this.element.classList.add(modifier);

        this.setHtml(html`
            ${options.map(
                (option: ChipOption): SafeHtml => html`
                    <button
                        type="button"
                        class="chip-group__chip chip ${option.id === this.activeId ? this.activeClass : ''}"
                        data-id="${option.id}"
                    >
                        ${option.label}
                    </button>
                `,
            )}
        `);

        this.element.addEventListener('click', this.handleClick);
    }

    public setActive(id: string): void {
        this.activeId = id;

        for (const chip of this.element.querySelectorAll<HTMLElement>('.chip-group__chip')) {
            chip.classList.toggle(this.activeClass, chip.dataset.id === id);
        }
    }
}
