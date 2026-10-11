import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { throttle } from './throttle';

describe('throttle', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('runs the function on the first call and returns its result', () => {
        const double = vi.fn((value: number): number => value * 2);
        const throttled = throttle(double, 100);

        expect(throttled(2)).toBe(4);
        expect(double).toHaveBeenCalledExactlyOnceWith(2);
    });

    it('ignores calls inside the delay and returns the previous result', () => {
        const double = vi.fn((value: number): number => value * 2);
        const throttled = throttle(double, 100);

        throttled(1);
        vi.advanceTimersByTime(99);

        expect(throttled(5)).toBe(2);
        expect(double).toHaveBeenCalledOnce();
    });

    it('runs again once the delay has passed', () => {
        const double = vi.fn((value: number): number => value * 2);
        const throttled = throttle(double, 100);

        throttled(1);
        vi.advanceTimersByTime(100);

        expect(throttled(5)).toBe(10);
        expect(double).toHaveBeenCalledTimes(2);
    });

    it('drops skipped calls instead of running them later', () => {
        const action = vi.fn();
        const throttled = throttle(action, 100);

        throttled();
        throttled();
        vi.advanceTimersByTime(1000);

        expect(action).toHaveBeenCalledOnce();
    });

    it('uses a delay of 300 ms by default', () => {
        const action = vi.fn();
        const throttled = throttle(action);

        throttled();
        vi.advanceTimersByTime(299);
        throttled();
        expect(action).toHaveBeenCalledOnce();

        vi.advanceTimersByTime(1);
        throttled();
        expect(action).toHaveBeenCalledTimes(2);
    });

    it('keeps the `this` of the call', () => {
        const counter = {
            step: 3,
            multiply: throttle(function (this: { step: number }, value: number): number {
                return value * this.step;
            }, 100),
        };

        expect(counter.multiply(2)).toBe(6);
    });
});
