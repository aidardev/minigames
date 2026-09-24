import { BaseComponent } from '@/components/base-component';
import './slider.scss';

export interface SliderOptions {
    className?: string;
    trackClassName?: string;
    slideClassName?: string;
}

export class Slider extends BaseComponent<'div'> {
    private readonly track: HTMLUListElement;
    private readonly slideClassName?: string;

    constructor(options: SliderOptions = {}) {
        super('div', 'slider');

        this.slideClassName = options.slideClassName;
        this.applyClassName(options.className);

        this.track = document.createElement('ul');
        this.track.classList.add('slider__track', 'list-unstyled');

        if (options.trackClassName) {
            this.track.classList.add(options.trackClassName);
        }

        this.element.append(this.track);
    }

    private createSlide(element: HTMLElement): HTMLLIElement {
        const slide = document.createElement('li');

        slide.classList.add('slider__slide');

        if (this.slideClassName) {
            slide.classList.add(this.slideClassName);
        }

        slide.append(element);

        return slide;
    }

    private applyClassName(className?: string): void {
        if (!className) return;

        this.element.classList.add(...className.split(' '));
    }

    public addSlide(element: HTMLElement): void {
        this.track.append(this.createSlide(element));
    }

    public addSlides(elements: readonly HTMLElement[]): void {
        const fragment = document.createDocumentFragment();

        for (const element of elements) {
            fragment.append(this.createSlide(element));
        }

        this.track.append(fragment);
    }

    public removeAllSlides(): void {
        this.track.replaceChildren();
    }

    public getSlides(): HTMLElement[] {
        return [...this.track.children].filter(
            (child): child is HTMLElement => child instanceof HTMLElement,
        );
    }

    public getSlideCount(): number {
        return this.track.children.length;
    }
}
