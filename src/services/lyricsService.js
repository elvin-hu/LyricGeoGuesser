// LRCLIB API service for fetching synced lyrics
// Implements background prefetching and progressive loading

const LRCLIB_API = 'https://lrclib.net/api';

// Cache to avoid repeated API calls
const lyricsCache = new Map();

// Prefetch queue for background loading
const prefetchQueue = [];
let isPrefetching = false;

/**
 * Parse LRC format timestamps to seconds
 */
const parseTimestamp = (timestamp) => {
    const match = timestamp.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\]/);
    if (!match) return null;

    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    const ms = parseInt(match[3].padEnd(3, '0'), 10);

    return minutes * 60 + seconds + ms / 1000;
};

/**
 * Parse synced lyrics string into structured data
 */
const parseSyncedLyrics = (syncedLyrics, duration) => {
    if (!syncedLyrics) return null;

    const lines = syncedLyrics.split('\n').filter(line => line.trim());
    const parsed = [];

    for (const line of lines) {
        const match = line.match(/^\[(\d{2}:\d{2}\.\d{2,3})\]\s*(.*)$/);
        if (match) {
            const time = parseTimestamp(`[${match[1]}]`);
            const text = match[2].trim();

            if (text && !text.toLowerCase().includes('instrumental') && time !== null) {
                parsed.push({
                    time,
                    text,
                    percentage: (time / duration) * 100
                });
            }
        }
    }

    return parsed.length > 0 ? parsed : null;
};

/**
 * Fetch lyrics from LRCLIB API (core function)
 */
export const fetchLyrics = async (artistName, trackName, albumName, duration) => {
    const cacheKey = `${artistName}-${trackName}`;

    if (lyricsCache.has(cacheKey)) {
        console.log(`[fetchLyrics] Cache hit: "${trackName}"`);
        return lyricsCache.get(cacheKey);
    }

    const startTime = performance.now();
    try {
        const params = new URLSearchParams({
            artist_name: artistName,
            track_name: trackName,
            album_name: albumName,
            duration: Math.round(duration).toString()
        });

        const response = await fetch(`${LRCLIB_API}/get?${params}`);
        const fetchTime = (performance.now() - startTime).toFixed(0);

        if (!response.ok) {
            console.log(`[fetchLyrics] ✗ "${trackName}" - HTTP ${response.status} (${fetchTime}ms)`);
            lyricsCache.set(cacheKey, null);
            return null;
        }

        const data = await response.json();
        const totalTime = (performance.now() - startTime).toFixed(0);

        if (!data.syncedLyrics) {
            console.log(`[fetchLyrics] ✗ "${trackName}" - No synced lyrics (${totalTime}ms)`);
            lyricsCache.set(cacheKey, null);
            return null;
        }

        const parsed = parseSyncedLyrics(data.syncedLyrics, duration);
        console.log(`[fetchLyrics] ✓ "${trackName}" - ${parsed?.length || 0} lines (${totalTime}ms)`);
        lyricsCache.set(cacheKey, parsed);

        return parsed;
    } catch (error) {
        const errorTime = (performance.now() - startTime).toFixed(0);
        console.error(`[fetchLyrics] Error "${trackName}" (${errorTime}ms):`, error.message);
        lyricsCache.set(cacheKey, null);
        return null;
    }
};

/**
 * Process prefetch queue in background
 */
const processPrefetchQueue = async () => {
    if (isPrefetching || prefetchQueue.length === 0) return;

    isPrefetching = true;

    while (prefetchQueue.length > 0) {
        const { artistName, song, resolve } = prefetchQueue.shift();
        const cacheKey = `${artistName}-${song.title}`;

        if (!lyricsCache.has(cacheKey)) {
            await fetchLyrics(artistName, song.title, song.album, song.duration);
        }

        if (resolve) resolve();

        // Small delay to avoid hammering API
        await new Promise(r => setTimeout(r, 100));
    }

    isPrefetching = false;
};

/**
 * Queue songs for background prefetching
 */
export const prefetchSongs = (artistName, songs) => {
    for (const song of songs) {
        const cacheKey = `${artistName}-${song.title}`;
        if (!lyricsCache.has(cacheKey)) {
            prefetchQueue.push({ artistName, song });
        }
    }

    // Start processing in background
    processPrefetchQueue();
};

/**
 * Prefetch a single song and return a promise
 */
export const prefetchSong = (artistName, song) => {
    return new Promise((resolve) => {
        const cacheKey = `${artistName}-${song.title}`;
        if (lyricsCache.has(cacheKey)) {
            resolve();
            return;
        }
        prefetchQueue.unshift({ artistName, song, resolve }); // Priority
        processPrefetchQueue();
    });
};

/**
 * Check if lyrics are cached
 */
export const isLyricsCached = (artistName, trackName) => {
    return lyricsCache.has(`${artistName}-${trackName}`);
};

/**
 * Get cached lyrics (sync)
 */
export const getCachedLyrics = (artistName, trackName) => {
    return lyricsCache.get(`${artistName}-${trackName}`) || null;
};

/**
 * Normalize text for fuzzy matching
 * Removes punctuation, extra spaces, and lowercases
 */
const normalizeText = (text) => {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/\s+/g, ' ')    // Normalize spaces
        .trim();
};

/**
 * Check if two texts are similar (fuzzy match)
 * Returns true if one contains the other or they share significant overlap
 */
const isSimilarText = (text1, text2) => {
    const norm1 = normalizeText(text1);
    const norm2 = normalizeText(text2);

    // Exact match after normalization
    if (norm1 === norm2) return true;

    // One contains the other
    if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

    // Check word overlap (at least 70% of words match)
    const words1 = norm1.split(' ');
    const words2 = norm2.split(' ');
    const commonWords = words1.filter(w => words2.includes(w));
    const overlapRatio = commonWords.length / Math.min(words1.length, words2.length);

    return overlapRatio >= 0.7;
};

/**
 * Find the first occurrence of a phrase in the lyrics
 * Uses fuzzy matching to catch slight variations
 */
const findFirstOccurrence = (lyrics, targetPhrase) => {
    const targetNorm = normalizeText(targetPhrase.text);

    for (const line of lyrics) {
        if (isSimilarText(line.text, targetPhrase.text)) {
            return line; // Return first matching occurrence
        }
    }

    // Fallback to original if no match found
    return targetPhrase;
};

/**
 * Get a random interesting lyric phrase
 * Always returns the FIRST occurrence of the phrase
 */
export const selectRandomPhrase = (lyrics) => {
    if (!lyrics || lyrics.length === 0) return null;

    // Filter for interesting phrases (not too short, not too long)
    const interesting = lyrics.filter(line => {
        const wordCount = line.text.split(/\s+/).length;
        return wordCount >= 3 && wordCount <= 15;
    });

    if (interesting.length === 0) {
        const idx = Math.floor(Math.random() * lyrics.length);
        return lyrics[idx];
    }

    // Prefer lines from the middle of the song for selection
    const middle = interesting.slice(
        Math.floor(interesting.length * 0.2),
        Math.floor(interesting.length * 0.8)
    );

    const pool = middle.length > 0 ? middle : interesting;
    const idx = Math.floor(Math.random() * pool.length);
    const selectedPhrase = pool[idx];

    // Find the FIRST occurrence of this phrase (or similar)
    const firstOccurrence = findFirstOccurrence(lyrics, selectedPhrase);

    return firstOccurrence;
};
