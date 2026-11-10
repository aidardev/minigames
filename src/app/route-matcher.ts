export type RouteParameters = Readonly<Record<string, string | undefined>>;

export interface RouteMatch {
    pattern: string;
    params: RouteParameters;
}

function matchPattern(pattern: string, path: string): [string, string][] | undefined {
    const patternSegments = pattern.split('/');
    const pathSegments = path.split('/');
    if (patternSegments.length !== pathSegments.length) return;

    const parameters: [string, string][] = [];

    for (const [index, segment] of patternSegments.entries()) {
        const value = pathSegments[index];

        if (segment.startsWith(':') && segment.length > 1) {
            if (!value) return;

            try {
                parameters.push([segment.slice(1), decodeURIComponent(value)]);
            } catch {
                // A malformed URL does not match instead of interrupting navigation.
                return;
            }
        } else if (segment !== value) {
            return;
        }
    }

    return parameters;
}

// Matches whole paths; fewer parameters means a more specific route.
export function matchRoute(path: string, patterns: readonly string[]): RouteMatch | undefined {
    let match: RouteMatch | undefined;
    let fewestParameters = Infinity;

    for (const pattern of patterns) {
        const parameters = matchPattern(pattern, path);
        if (!parameters) continue;

        // Equally specific patterns keep their registration order.
        if (parameters.length < fewestParameters) {
            match = { pattern, params: Object.fromEntries(parameters) };
            fewestParameters = parameters.length;
        }
    }

    return match;
}
