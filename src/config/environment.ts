const DEFAULT_API_BASE_URL = 'https://faxb76kxra.execute-api.eu-central-1.amazonaws.com/api';

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL;
