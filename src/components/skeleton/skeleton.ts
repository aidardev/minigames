export function createSkeleton(className = ''): HTMLDivElement {
    const element = document.createElement('div');

    element.className = `skeleton ${className}`.trim();
    element.setAttribute('aria-hidden', 'true');

    return element;
}
