import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getLeaderboard, getRecentScores, getStarRating } from '../services/scoreService';
import { getArtistById } from '../data/artists';
import './LeaderboardPage.css';

export default function LeaderboardPage() {
    const navigate = useNavigate();
    const leaderboard = getLeaderboard();
    const recentScores = getRecentScores(5);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="page leaderboard-page">
            <motion.div
                className="leaderboard-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <button className="back-btn" onClick={() => navigate('/')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                </button>
                <h1>Leaderboard</h1>
                <div style={{ width: 44 }} />
            </motion.div>

            {leaderboard.length === 0 ? (
                <motion.div
                    className="empty-state"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="empty-emoji">🎵</div>
                    <h2>No scores yet</h2>
                    <p>Play a round to see your scores here</p>
                    <motion.button
                        className="btn btn-primary"
                        onClick={() => navigate('/')}
                        whileTap={{ scale: 0.97 }}
                    >
                        Start Playing
                    </motion.button>
                </motion.div>
            ) : (
                <>
                    <motion.div
                        className="section"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <h2 className="section-title">Best Scores</h2>
                        <div className="scores-list">
                            {leaderboard.map((entry, index) => {
                                const artist = getArtistById(entry.artistId);
                                const stars = getStarRating(entry.score);

                                return (
                                    <motion.div
                                        key={entry.artistId}
                                        className="score-card"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.1 * index }}
                                    >
                                        <div className="rank">#{index + 1}</div>
                                        {artist && (
                                            <div className="artist-avatar">
                                                <img src={artist.image} alt={entry.artistName} />
                                            </div>
                                        )}
                                        <div className="score-info">
                                            <div className="score-artist">{entry.artistName}</div>
                                            <div className="score-stars">{'⭐'.repeat(stars)}</div>
                                        </div>
                                        <div className="score-value">{entry.score}</div>
                                        <button
                                            className="play-btn"
                                            onClick={() => navigate(`/game/${entry.artistId}`)}
                                        >
                                            Play
                                        </button>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>

                    {recentScores.length > 0 && (
                        <motion.div
                            className="section"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <h2 className="section-title">Recent Games</h2>
                            <div className="recent-list">
                                {recentScores.map((entry) => (
                                    <div key={entry.id} className="recent-item">
                                        <span className="recent-artist">{entry.artistName}</span>
                                        <span className="recent-score">{entry.score}</span>
                                        <span className="recent-date">{formatDate(entry.date)}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </>
            )}
        </div>
    );
}
