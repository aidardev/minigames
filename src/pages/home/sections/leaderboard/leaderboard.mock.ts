import type { LeaderboardPlayer } from '@/types/leaderboard.types';

export const LEADERBOARD_MOCK: LeaderboardPlayer[] = [
    {
        rank: 1,
        playerName: 'Alex_Pro99',
        gamesPlayed: 142,
        totalScore: 94_250,
        streakDays: 12,
        favoriteGameSlug: 'heartopia',
        favoriteGameName: 'Heartopia',
    },
    {
        rank: 2,
        playerName: 'CozyGamer_x',
        gamesPlayed: 118,
        totalScore: 81_400,
        streakDays: 8,
        favoriteGameSlug: 'cat-mail-co',
        favoriteGameName: 'Cat Mail Co.',
    },
    {
        rank: 3,
        playerName: 'MatchMaster',
        gamesPlayed: 98,
        totalScore: 72_110,
        streakDays: 5,
        favoriteGameSlug: 'tiny-glade',
        favoriteGameName: 'Tiny Glade',
    },
    {
        rank: 4,
        playerName: 'BubblePop',
        gamesPlayed: 87,
        totalScore: 65_900,
        streakDays: 3,
        favoriteGameSlug: 'whisper-of-the-house',
        favoriteGameName: 'Whisper of the House',
    },
    {
        rank: 5,
        playerName: 'SudokuGod',
        gamesPlayed: 74,
        totalScore: 59_320,
        streakDays: 2,
        favoriteGameSlug: 'cat-chess',
        favoriteGameName: 'Cat Chess',
    },
];
