export function throttle<Arguments extends unknown[], Return>(
    function_: (...arguments_: Arguments) => Return,
    delay: number = 300,
) {
    let lastCall = 0;
    let lastResult: Return;

    return function (this: unknown, ...arguments_: Arguments): Return {
        const now = Date.now();

        if (now - lastCall >= delay) {
            lastCall = now;
            lastResult = function_.apply(this, arguments_);
        }

        return lastResult;
    };
}
