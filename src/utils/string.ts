export function getInitials(name: string): string {
    const capitals: string[] = [];

    for (const char of name) {
        if (char >= 'A' && char <= 'Z') {
            capitals.push(char);
        }
    }

    if (capitals.length >= 2) {
        return capitals[0] + capitals[1];
    }

    return name.slice(0, 2).toUpperCase();
}
