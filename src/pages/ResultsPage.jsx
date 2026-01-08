import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { saveScore, getStarRating, generateShareText, getAccuracyLabel, getEmojiForPoints, getColorForPoints } from '../services/scoreService';
import './ResultsPage.css';

export default function ResultsPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [copied, setCopied] = useState(false);

    const { artistId, artistName, score, results } = location.state || {};

    useEffect(() => {
        if (!artistId || !results) {
            navigate('/');
            return;
        }
        saveScore(artistId, artistName, score, results);
    }, [artistId, artistName, score, results, navigate]);

    if (!artistId || !results) return null;

    const stars = getStarRating(score);
    const shareText = generateShareText(artistName, score, results);

    const handleShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share({ title: 'Lyric GeoGuesser', text: shareText });
            } else {
                await navigator.clipboard.writeText(shareText);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        } catch (err) {
            console.log('Share cancelled');
        }
    };

    return (
        <div className="page results-page">
            <motion.div
                className="score-section"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
            >
                <h1>{score}</h1>
                <div className="score-max">out of 1000</div>
                <div className="score-stars">
                    {'⭐'.repeat(stars)}{'☆'.repeat(5 - stars)}
                </div>
                <div className="artist-label">{artistName}</div>
            </motion.div>

            <motion.div
                className="emoji-grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                {results.map((r, i) => {
                    const emoji = getEmojiForPoints(r.points);

                    return (
                        <motion.span
                            key={i}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 + i * 0.05 }}
                        >
                            {emoji}
                        </motion.span>
                    );
                })}
            </motion.div>

            <motion.div
                className="breakdown"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <h2 className="breakdown-title">Breakdown</h2>
                <div className="breakdown-list">
                    {results.map((r, i) => {
                        const color = getColorForPoints(r.points);
                        return (
                            <div key={i} className="breakdown-item">
                                <span className="breakdown-num">{i + 1}</span>
                                <span className="breakdown-song">{r.song}</span>
                                <span className="breakdown-points" style={{ color }}>
                                    +{r.points}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </motion.div>

            <motion.div
                className="actions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
            >
                <motion.button
                    className="btn btn-primary share-btn"
                    onClick={handleShare}
                    whileTap={{ scale: 0.97 }}
                >
                    {copied ? 'Copied!' : 'Share Results'}
                </motion.button>

                <div className="action-row">
                    <motion.button
                        className="btn btn-secondary"
                        onClick={() => navigate(`/game/${artistId}`)}
                        whileTap={{ scale: 0.97 }}
                    >
                        Play Again
                    </motion.button>
                    <motion.button
                        className="btn btn-secondary"
                        onClick={() => navigate('/')}
                        whileTap={{ scale: 0.97 }}
                    >
                        New Artist
                    </motion.button>
                </div>

                <button className="link-btn" onClick={() => navigate('/leaderboard')}>
                    View Leaderboard
                </button>
            </motion.div>
        </div>
    );
}
