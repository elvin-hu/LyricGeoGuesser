import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { artists } from '../data/artists';
import { prefetchSongs } from '../services/lyricsService';
import './HomePage.css';

export default function HomePage() {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    // Filter artists based on search
    const filteredArtists = useMemo(() => {
        if (!query.trim()) return artists;
        const q = query.toLowerCase();
        return artists.filter(a =>
            a.name.toLowerCase().includes(q)
        );
    }, [query]);

    // Start prefetching for first visible artist
    useEffect(() => {
        if (filteredArtists.length > 0) {
            const firstArtist = filteredArtists[0];
            prefetchSongs(firstArtist.name, firstArtist.songs.slice(0, 3));
        }
    }, [filteredArtists]);

    const handleSelect = (artistId) => {
        navigate(`/game/${artistId}`);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && filteredArtists.length > 0) {
            handleSelect(filteredArtists[0].id);
        }
    };

    return (
        <div className="page home-page">
            <div className="home-content">
                <motion.header
                    className="hero"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1>Lyric GeoGuesser</h1>
                    <p>Guess when lyrics appear in your favorite songs</p>
                </motion.header>

                <motion.div
                    className="search-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.5 }}
                >
                    <div className={`search-box ${isFocused ? 'focused' : ''}`}>
                        <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search artists..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            onKeyDown={handleKeyDown}
                            autoComplete="off"
                        />
                        {query && (
                            <button
                                className="clear-btn"
                                onClick={() => setQuery('')}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
                                </svg>
                            </button>
                        )}
                    </div>

                    <AnimatePresence mode="popLayout">
                        <motion.div className="artist-list" layout>
                            {filteredArtists.map((artist, i) => (
                                <motion.button
                                    key={artist.id}
                                    className="artist-row"
                                    onClick={() => handleSelect(artist.id)}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ delay: i * 0.03 }}
                                    whileTap={{ scale: 0.98 }}
                                    onMouseEnter={() => prefetchSongs(artist.name, artist.songs.slice(0, 3))}
                                >
                                    <img
                                        src={artist.image}
                                        alt={artist.name}
                                        className="artist-img"
                                    />
                                    <span className="artist-name">{artist.name}</span>
                                    <svg className="arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="m9 18 6-6-6-6" />
                                    </svg>
                                </motion.button>
                            ))}

                            {filteredArtists.length === 0 && (
                                <motion.div
                                    className="no-results"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    No artists found
                                </motion.div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </motion.div>
            </div>

            <motion.footer
                className="home-footer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
            >
                <button onClick={() => navigate('/leaderboard')}>
                    Leaderboard
                </button>
            </motion.footer>
        </div>
    );
}
