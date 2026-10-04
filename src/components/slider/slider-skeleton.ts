import { createSkeleton } from '@/components/skeleton/skeleton';
import {
    HIDDEN_CLASS,
    POSITION_CLASSES,
    SLIDE_CLASS,
    SLIDER_CLASS,
    TRACK_CLASS,
} from './slider.constants';
import type { SliderOptions } from './slider.types';

export interface SliderSkeletonOptions extends Pick<
    SliderOptions,
    'className' | 'trackClassName' | 'slideClassName'
> {
    itemClassName: string;
    count?: number;
}

/**
 * Builds the same DOM structure as a real Slider, so a skeleton inherits
 * the real layout (widths, breakpoints, collapsed far slides) from the same CSS.
 */
export function createSliderSkeleton({
    className,
    trackClassName,
    slideClassName,
    itemClassName,
    count = 5,
}: SliderSkeletonOptions): HTMLElement {
    const root = document.createElement('div');
    root.classList.add(SLIDER_CLASS, `${SLIDER_CLASS}--skeleton`, ...(className?.split(' ') ?? []));
    root.setAttribute('aria-hidden', 'true');

    const track = document.createElement('ul');
    track.classList.add(TRACK_CLASS, 'list-unstyled');
    if (trackClassName) track.classList.add(trackClassName);

    const half = Math.floor(count / 2);

    for (let index = 0; index < count; index++) {
        const slide = document.createElement('li');
        // Same distance-to-class mapping as updatePositions() in the real slider
        slide.classList.add(SLIDE_CLASS, POSITION_CLASSES[Math.abs(index - half)] ?? HIDDEN_CLASS);
        if (slideClassName) slide.classList.add(slideClassName);

        slide.append(createSkeleton(itemClassName));
        track.append(slide);
    }

    root.append(track);

    return root;
}
