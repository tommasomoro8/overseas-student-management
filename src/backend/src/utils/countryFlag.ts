/**
 * Bandiera (emoji) indicativa per paese ospitante.
 * E' la fonte di verita' lato backend: il valore viene salvato nella colonna
 * institutions.flag e restituito ai client, che non devono piu' derivarlo.
 */
const FLAGS: Record<string, string> = {
    Spagna: '🇪🇸',
    Francia: '🇫🇷',
    Italia: '🇮🇹',
    Germania: '🇩🇪',
    Portogallo: '🇵🇹',
    'Paesi Bassi': '🇳🇱',
    Belgio: '🇧🇪',
    Giappone: '🇯🇵',
    Cina: '🇨🇳',
    'Stati Uniti': '🇺🇸',
    Canada: '🇨🇦',
    Australia: '🇦🇺',
    Brasile: '🇧🇷',
    Argentina: '🇦🇷',
    Singapore: '🇸🇬',
    'Regno Unito': '🇬🇧',
};

/** Restituisce la bandiera del paese, oppure il globo come fallback. */
export function countryFlag(country: string): string {
    return FLAGS[country] ?? '🌍';
}
