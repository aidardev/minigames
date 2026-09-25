import { BaseComponent } from '@/components/base-component';
import { throttle } from '@/utils/throttle';
import './slider.scss';

export interface SliderOptions {
    className?: string;
    trackClassName?: string;
    slideClassName?: string;
    // Autoplay interval in ms. Omit (or 0) to disable autoplay.
    autoplayInterval?: number;
    // Pointer travel (px) after which a pointerdown counts as a drag, not a click.
    dragThreshold?: number;
    // Pointer travel (px) after which a drag counts as a swipe (changes the active slide).
    swipeThreshold?: number;
}

const POSITION_CLASSES = ['is-active', 'is-near', 'is-far'] as const;
const HIDDEN_CLASS = 'is-hidden';
const ALL_POSITION_CLASSES = [...POSITION_CLASSES, HIDDEN_CLASS];

export class Slider extends BaseComponent<'div'> {
    private readonly track: HTMLUListElement;
    private readonly slideClassName?: string;
    private readonly autoplayInterval?: number;
    private readonly dragThreshold: number;
    private readonly swipeThreshold: number;

    private activeIndex = 0;
    private autoplayTimer?: ReturnType<typeof setTimeout>;
    private autoplayStartTime = 0;
    private autoplayRemaining = 0;
    private isPointerDown = false;
    private isDragging = false;
    private pointerStartX = 0;

    private readonly handlePointerDown = (event: PointerEvent): void => {
        this.isPointerDown = true;
        this.isDragging = false;
        this.pointerStartX = event.clientX;
        this.stopAutoplay();
    };

    private readonly handlePointerMove = (event: PointerEvent): void => {
        if (!this.isPointerDown || this.isDragging) return;

        if (Math.abs(event.clientX - this.pointerStartX) >= this.dragThreshold) {
            this.isDragging = true;
            this.track.setPointerCapture(event.pointerId);
        }
    };

    private readonly handlePointerUp = (event: PointerEvent): void => {
        if (!this.isPointerDown) return;
        this.isPointerDown = false;
        const diffX = event.clientX - this.pointerStartX;

        if (Math.abs(diffX) >= this.swipeThreshold) {
            if (diffX < 0) this.next();
            else this.prev();
        } else {
            this.resumeAutoplay();
        }
    };

    private readonly handlePointerCancel = (): void => {
        this.isPointerDown = false;
        this.isDragging = false;
        this.resumeAutoplay();
    };

    private readonly handleClickCapture = (event: MouseEvent): void => {
        if (!this.isDragging) return;

        event.preventDefault();
        event.stopPropagation();
        this.isDragging = false;
    };

    public readonly goTo = throttle((index: number): void => {
        const total = this.getSlideCount();
        if (total === 0) return;

        this.activeIndex = ((index % total) + total) % total;
        this.updatePositions();
    }, 400);

    constructor(options: SliderOptions = {}) {
        super('div', 'slider');

        this.slideClassName = options.slideClassName;
        this.autoplayInterval = options.autoplayInterval;
        this.autoplayRemaining = this.autoplayInterval ?? 0;
        this.dragThreshold = options.dragThreshold ?? 10;
        this.swipeThreshold = options.swipeThreshold ?? 50;

        this.applyClassName(options.className);

        this.track = document.createElement('ul');
        this.track.classList.add('slider__track', 'list-unstyled');

        if (options.trackClassName) {
            this.track.classList.add(options.trackClassName);
        }

        this.element.append(this.track);

        this.bindPointerEvents();
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

    /**
     * Updates slide positions and order for infinite carousel scrolling.
     * Assigns active, near, far, or hidden classes based on the distance.
     */
    private updatePositions(): void {
        const slides = this.getSlides();
        const total = slides.length;
        const half = Math.floor(total / 2);

        for (const [index, slide] of slides.entries()) {
            let offset = index - this.activeIndex;

            if (offset < -half) offset += total;
            if (offset > half) offset -= total;

            slide.style.order = String(offset);

            slide.classList.remove(...ALL_POSITION_CLASSES);
            slide.classList.add(POSITION_CLASSES[Math.abs(offset)] ?? HIDDEN_CLASS);
        }
    }

    private startAutoplay(time: number): void {
        this.clearTimer();
        if (!this.autoplayInterval || this.getSlideCount() <= 1) return;

        this.autoplayStartTime = Date.now();
        this.autoplayTimer = setTimeout((): void => {
            if (this.isPointerDown) return;
            this.next();
        }, time);
    }

    private clearTimer(): void {
        if (!this.autoplayTimer) {
            return;
        }

        clearTimeout(this.autoplayTimer);
        this.autoplayTimer = undefined;
    }

    private stopAutoplay(): void {
        if (!this.autoplayTimer) return;
        this.clearTimer();
        this.autoplayRemaining -= Date.now() - this.autoplayStartTime;
        if (this.autoplayRemaining < 0) this.autoplayRemaining = 0;
    }

    private resumeAutoplay(): void {
        if (this.autoplayInterval) {
            this.startAutoplay(this.autoplayRemaining);
        }
    }

    private resetAutoplay(): void {
        if (!this.autoplayInterval) {
            return;
        }

        this.autoplayRemaining = this.autoplayInterval;
        this.startAutoplay(this.autoplayRemaining);
    }

    private bindPointerEvents(): void {
        this.track.addEventListener('pointerdown', this.handlePointerDown);
        this.track.addEventListener('pointermove', this.handlePointerMove);
        this.track.addEventListener('pointerup', this.handlePointerUp);
        this.track.addEventListener('pointercancel', this.handlePointerCancel);
        this.track.addEventListener('click', this.handleClickCapture, { capture: true });
    }

    public addSlide(element: HTMLElement): void {
        this.track.append(this.createSlide(element));
        this.updatePositions();
    }

    public addSlides(elements: readonly HTMLElement[]): void {
        const fragment = document.createDocumentFragment();

        for (const element of elements) {
            fragment.append(this.createSlide(element));
        }

        this.track.append(fragment);
        this.activeIndex = 0;
        this.updatePositions();
        this.resetAutoplay();
    }

    public removeAllSlides(): void {
        this.stopAutoplay();
        this.track.replaceChildren();
        this.activeIndex = 0;
    }

    public getSlides(): HTMLLIElement[] {
        return [...this.track.children].filter(
            (child): child is HTMLLIElement => child instanceof HTMLLIElement,
        );
    }

    public getSlideCount(): number {
        return this.track.children.length;
    }

    public getActiveIndex(): number {
        return this.activeIndex;
    }

    public next(): void {
        this.goTo(this.activeIndex + 1);
        this.resetAutoplay();
    }

    public prev(): void {
        this.goTo(this.activeIndex - 1);
        this.resetAutoplay();
    }

    public override destroy(): void {
        this.stopAutoplay();
        super.destroy();
    }
}
