export abstract class BaseComponent {
    public readonly element: HTMLElement;

    constructor(tagName: keyof HTMLElementTagNameMap, className?: string) {
        this.element = document.createElement(tagName);

        if (className) {
            this.element.className = className;
        }
    }

    public destroy(): void {
        this.element.remove();
    }

    protected query<E extends HTMLElement>(selector: string): E | undefined {
        return this.element.querySelector<E>(selector) || undefined;
    }
}
