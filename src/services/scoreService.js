// Score calculation and leaderboard management

const STORAGE_KEY = 'lyric-geoguesser-scores';

/**
 * Calculate points for a single guess
 * Perfect guess (within 2%): 100 points
 * Points decrease linearly with distance
 * Max penalty at 10% distance = 0 points
 */
export const calculatePoints = (guessPercentage, actualPercentage) => {
    const distance = Math.abs(guessPercentage - actualPercentage);

    if (distance <= 2) {
        return 100; // Perfect!
    }

    // Linear falloff from 100 to 0 between 2% and 12% distance
    const points = Math.max(0, Math.round(100 - (distance - 2) * 10));
    return points;
};

/**
 * Color scale based on points
 * 81-100: Blue, 61-80: Yellow, 41-60: Orange, 0-40: Red
 */
export const getColorForPoints = (points) => {
    if (points >= 81) return '#3366FF'; // Klein blue
    if (points >= 61) return '#ffd60a'; // Yellow
    if (points >= 41) return '#ff9f0a'; // Orange
    return '#ff453a'; // Red
};

export const getEmojiForPoints = (points) => {
    if (points >= 81) return '🟦';
    if (points >= 61) return '🟨';
    if (points >= 41) return '🟧';
    return '🟥';
};

/**
 * Get accuracy label based on points
 */
export const getAccuracyLabel = (points) => {
    const color = getColorForPoints(points);
    if (points >= 81) return { text: 'Perfect!', emoji: '🎯', color };
    if (points >= 61) return { text: 'Great!', emoji: '🔥', color };
    if (points >= 41) return { text: 'Good', emoji: '👍', color };
    return { text: 'Missed', emoji: '😅', color };
};

/**
 * Get star rating (1-5) based on total score
 */
export const getStarRating = (totalScore, maxScore = 1000) => {
    const percentage = (totalScore / maxScore) * 100;
    if (percentage >= 90) return 5;
    if (percentage >= 75) return 4;
    if (percentage >= 60) return 3;
    if (percentage >= 40) return 2;
    return 1;
};

/**
 * Generate shareable result text
 */
export const generateShareText = (artistName, score, results) => {
    const stars = getStarRating(score);
    const starEmojis = '⭐'.repeat(stars) + '☆'.repeat(5 - stars);

    // Create emoji grid showing performance per question
    const emojiGrid = results.map(r => getEmojiForPoints(r.points)).join('');

    return `🎵 Lyric GeoGuesser 🎵
  
Artist: ${artistName}
Score: ${score}/1000 ${starEmojis}

${emojiGrid}

Can you beat my score?
#LyricGeoGuesser`;
};

/**
 * Save score to localStorage
 */
export const saveScore = (artistId, artistName, score, results) => {
    const scores = getScores();

    const entry = {
        id: Date.now().toString(),
        artistId,
        artistName,
        score,
        results,
        date: new Date().toISOString()
    };

    scores.push(entry);

    // Keep only last 50 scores
    if (scores.length > 50) {
        scores.shift();
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
    return entry;
};

/**
 * Get all saved scores
 */
export const getScores = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

/**
 * Get best score for an artist
 */
export const getBestScore = (artistId) => {
    const scores = getScores().filter(s => s.artistId === artistId);
    if (scores.length === 0) return null;
    return Math.max(...scores.map(s => s.score));
};

/**
 * Get recent scores
 */
export const getRecentScores = (limit = 10) => {
    return getScores()
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit);
};

/**
 * Get leaderboard (best scores across all artists)
 */
export const getLeaderboard = () => {
    const scores = getScores();
    const bestByArtist = {};

    for (const score of scores) {
        if (!bestByArtist[score.artistId] || score.score > bestByArtist[score.artistId].score) {
            bestByArtist[score.artistId] = score;
        }
    }

    return Object.values(bestByArtist).sort((a, b) => b.score - a.score);
};
