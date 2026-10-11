// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Slider } from './slider';
import type { SliderOptions } from './slider.types';

function slides(count: number): HTMLElement[] {
    return Array.from({ length: count }, (_, index) => {
        const element = document.createElement('button');
        element.textContent = `Game ${index}`;
        return element;
    });
}

function pointer(track: HTMLElement, type: string, clientX = 0): void {
    track.dispatchEvent(new PointerEvent(type, { clientX, pointerId: 1, bubbles: true }));
}

describe('Slider', () => {
    const sliders: Slider[] = [];

    function setup(count = 3, options: SliderOptions = {}) {
        const slider = new Slider(options);
        sliders.push(slider);
        document.body.append(slider.element);
        const track = slider.element.querySelector<HTMLUListElement>('ul');
        if (!track) throw new Error('Missing slider track');
        // jsdom does not implement pointer capture.
        const capture = vi.fn();
        Object.defineProperty(track, 'setPointerCapture', { value: capture });
        slider.addSlides(slides(count));
        return { slider, track, capture };
    }

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    });

    afterEach(() => {
        for (const slider of sliders) slider.destroy();
        sliders.length = 0;
        vi.useRealTimers();
    });

    it('adds slides with custom classes and preserves their content', () => {
        const { slider, track } = setup(0, {
            className: 'featured wide',
            trackClassName: 'featured__track',
            slideClassName: 'featured__slide',
        });
        const [game] = slides(1);
        if (!game) throw new Error('Missing game');
        slider.addSlide(game);
        expect(slider.element.classList.contains('featured')).toBe(true);
        expect(slider.element.classList.contains('wide')).toBe(true);
        expect(track.classList.contains('featured__track')).toBe(true);
        expect(slider.getSlideCount()).toBe(1);
        expect(slider.getSlides()[0]?.firstElementChild).toBe(game);
        expect(slider.getSlides()[0]?.classList.contains('featured__slide')).toBe(true);
        expect(slider.getSlides()[0]?.classList.contains('is-active')).toBe(true);
    });

    it('assigns circular positions and updates them without leaving old classes', () => {
        const { slider } = setup(7);
        expect(slider.getSlides().map((slide) => slide.style.order)).toEqual([
            '0',
            '1',
            '2',
            '3',
            '-3',
            '-2',
            '-1',
        ]);
        expect(slider.getSlides().map((slide) => slide.className)).toEqual([
            'slider__slide is-active',
            'slider__slide is-near',
            'slider__slide is-far',
            'slider__slide is-hidden',
            'slider__slide is-hidden',
            'slider__slide is-far',
            'slider__slide is-near',
        ]);
        slider.goTo(6);
        expect(slider.getActiveIndex()).toBe(6);
        expect(slider.getSlides()[6]?.className).toBe('slider__slide is-active');
        expect(slider.getSlides()[0]?.className).toBe('slider__slide is-near');
        expect(
            slider.getSlides().filter((slide) => slide.classList.contains('is-active')),
        ).toHaveLength(1);
    });

    it('wraps positive and negative indices and throttles rapid navigation', () => {
        const { slider } = setup();
        slider.goTo(4);
        expect(slider.getActiveIndex()).toBe(1);
        slider.next();
        expect(slider.getActiveIndex()).toBe(1);
        vi.advanceTimersByTime(400);
        slider.goTo(-1);
        expect(slider.getActiveIndex()).toBe(2);
        vi.advanceTimersByTime(400);
        slider.next();
        expect(slider.getActiveIndex()).toBe(0);
        vi.advanceTimersByTime(400);
        slider.prev();
        expect(slider.getActiveIndex()).toBe(2);
    });

    it('handles an empty slider and resets the index when adding a batch', () => {
        const { slider } = setup(0);
        slider.next();
        expect(slider.getActiveIndex()).toBe(0);
        slider.addSlides(slides(3));
        vi.advanceTimersByTime(400);
        slider.goTo(2);
        slider.addSlides(slides(1));
        expect(slider.getSlideCount()).toBe(4);
        expect(slider.getActiveIndex()).toBe(0);
        expect(slider.getSlides()[0]?.classList.contains('is-active')).toBe(true);
    });

    it.each([0, 1])('does not autoplay with %s slides', (count) => {
        const { slider } = setup(count, { autoplayInterval: 1000 });
        vi.advanceTimersByTime(5000);
        expect(slider.getActiveIndex()).toBe(0);
        expect(vi.getTimerCount()).toBe(0);
    });

    it('autoplays repeatedly and resets the countdown on manual navigation', () => {
        const { slider } = setup(3, { autoplayInterval: 1000 });
        vi.advanceTimersByTime(999);
        expect(slider.getActiveIndex()).toBe(0);
        vi.advanceTimersByTime(1);
        expect(slider.getActiveIndex()).toBe(1);
        vi.advanceTimersByTime(500);
        slider.next();
        expect(slider.getActiveIndex()).toBe(2);
        vi.advanceTimersByTime(999);
        expect(slider.getActiveIndex()).toBe(2);
        vi.advanceTimersByTime(1);
        expect(slider.getActiveIndex()).toBe(0);
    });

    it.each(['pointerup', 'pointercancel'])(
        'pauses autoplay and resumes remaining time on %s',
        (type) => {
            const { slider, track } = setup(3, { autoplayInterval: 1000 });
            vi.advanceTimersByTime(300);
            pointer(track, 'pointerdown', 100);
            vi.advanceTimersByTime(2000);
            expect(slider.getActiveIndex()).toBe(0);
            pointer(track, type, 105);
            vi.advanceTimersByTime(699);
            expect(slider.getActiveIndex()).toBe(0);
            vi.advanceTimersByTime(1);
            expect(slider.getActiveIndex()).toBe(1);
        },
    );

    it.each([
        [100, 50, 1],
        [100, 150, 2],
    ])('swipes from %s to %s', (start, end, expected) => {
        const { slider, track } = setup();
        pointer(track, 'pointerdown', start);
        pointer(track, 'pointermove', end);
        pointer(track, 'pointerup', end);
        expect(slider.getActiveIndex()).toBe(expected);
    });

    it('ignores move/up without pointerdown and only captures after the drag threshold', () => {
        const { slider, track, capture } = setup();
        pointer(track, 'pointermove', 100);
        pointer(track, 'pointerup', 100);
        expect(slider.getActiveIndex()).toBe(0);
        pointer(track, 'pointerdown', 100);
        pointer(track, 'pointermove', 109);
        expect(capture).not.toHaveBeenCalled();
        pointer(track, 'pointermove', 110);
        pointer(track, 'pointermove', 120);
        expect(capture).toHaveBeenCalledExactlyOnceWith(1);
        pointer(track, 'pointerup', 120);
        expect(slider.getActiveIndex()).toBe(0);
    });

    it('suppresses the click after dragging, then allows a normal click', () => {
        const { track } = setup();
        const game = track.querySelector('button');
        if (!game) throw new Error('Missing game button');
        const onClick = vi.fn();
        game.addEventListener('click', onClick);
        pointer(track, 'pointerdown', 100);
        pointer(track, 'pointermove', 120);
        pointer(track, 'pointerup', 120);
        const click = new MouseEvent('click', { bubbles: true, cancelable: true });
        game.dispatchEvent(click);
        expect(click.defaultPrevented).toBe(true);
        expect(onClick).not.toHaveBeenCalled();
        game.click();
        expect(onClick).toHaveBeenCalledOnce();
    });

    it('honors custom thresholds and clears dragging on pointer cancellation', () => {
        const { slider, track, capture } = setup(3, { dragThreshold: 20, swipeThreshold: 80 });
        pointer(track, 'pointerdown', 100);
        pointer(track, 'pointermove', 119);
        expect(capture).not.toHaveBeenCalled();
        pointer(track, 'pointermove', 120);
        pointer(track, 'pointercancel');
        const click = new MouseEvent('click', { bubbles: true, cancelable: true });
        track.dispatchEvent(click);
        expect(click.defaultPrevented).toBe(false);
        pointer(track, 'pointerdown', 100);
        pointer(track, 'pointerup', 21);
        expect(slider.getActiveIndex()).toBe(0);
        pointer(track, 'pointerdown', 100);
        pointer(track, 'pointerup', 20);
        expect(slider.getActiveIndex()).toBe(1);
    });

    it('removes all slides, resets the index and stops autoplay', () => {
        const { slider } = setup(3, { autoplayInterval: 1000 });
        slider.next();
        slider.removeAllSlides();
        vi.advanceTimersByTime(3000);
        expect(slider.getSlideCount()).toBe(0);
        expect(slider.getSlides()).toEqual([]);
        expect(slider.getActiveIndex()).toBe(0);
        expect(vi.getTimerCount()).toBe(0);
    });

    it('stops autoplay and removes its element on destroy', () => {
        const { slider } = setup(3, { autoplayInterval: 1000 });
        slider.destroy();
        vi.advanceTimersByTime(3000);
        expect(slider.element.isConnected).toBe(false);
        expect(slider.getActiveIndex()).toBe(0);
        expect(vi.getTimerCount()).toBe(0);
    });
});
