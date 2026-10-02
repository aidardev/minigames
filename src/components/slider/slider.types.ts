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
