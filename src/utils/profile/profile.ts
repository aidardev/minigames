import type { AppSessionProfile } from '@/services/session/session.types';

export const FALLBACK_PROFILE_NAME = 'Player';

const ALPHANUMERIC_PATTERN = /[\p{L}\p{N}]/u;
const WHITESPACE_PATTERN = /\s+/u;
const MAX_INITIALS = 2;

export interface ProfileView {
    name: string;
    initials: string;
}

// Spread iterates by code point, so a character outside the BMP is not split in half.
function firstAlphanumeric(word: string): string | undefined {
    return [...word].find((character): boolean => ALPHANUMERIC_PATTERN.test(character));
}

export function getInitials(name: string): string {
    const words = name.trim().split(WHITESPACE_PATTERN).slice(0, MAX_INITIALS);
    const letters: string[] = [];

    for (const word of words) {
        const letter = firstAlphanumeric(word);
        if (letter !== undefined) letters.push(letter);
    }

    return letters.join('').toUpperCase();
}

export function getEmailLocalPart(email: string): string {
    const atIndex = email.indexOf('@');

    return atIndex === -1 ? '' : email.slice(0, atIndex).trim();
}

function findProfileName({ displayName, email }: AppSessionProfile): string | undefined {
    const name = displayName.trim();
    if (name !== '') return name;

    const localPart = getEmailLocalPart(email);

    return localPart === '' ? undefined : localPart;
}

export function getProfileView(profile: AppSessionProfile): ProfileView {
    const name = findProfileName(profile);

    // The generic name is not a real one, so it must not produce initials like "P".
    return name === undefined
        ? { name: FALLBACK_PROFILE_NAME, initials: '' }
        : { name, initials: getInitials(name) };
}
