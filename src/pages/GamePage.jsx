import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getArtistById, getRandomSongs } from '../data/artists';
import { fetchLyrics, selectRandomPhrase, prefetchSongs } from '../services/lyricsService';
import { calculatePoints, getAccuracyLabel } from '../services/scoreService';
import ProgressBar from '../components/ProgressBar';
import './GamePage.css';

const QUESTIONS_PER_ROUND = 10;
const COUNTDOWN_SECONDS = 10;

export default function GamePage() {
    const { artistId } = useParams();
    const navigate = useNavigate();
    const artist = getArtistById(artistId);

    const [gameState, setGameState] = useState('loading');
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentPhrase, setCurrentPhrase] = useState(null);
    const [guess, setGuess] = useState(null);
    const [results, setResults] = useState([]);
    const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

    const countdownRef = useRef(null);
    const gameStateRef = useRef(gameState);
    const questionKeyRef = useRef(0);
    const usedSongsRef = useRef(new Set()); // Track used songs with ref to avoid stale state
    const pendingSongsRef = useRef([]); // Use ref for pending songs too
    const loadingPromiseRef = useRef(null); // Promise for concurrent loading
    const resultsRef = useRef([]); // Track results with ref to avoid stale closure
    const initIdRef = useRef(0); // Track initialization to abort stale async operations

    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    // Keep results ref in sync with state to avoid stale closures
    useEffect(() => {
        resultsRef.current = results;
    }, [results]);

    const clearTimer = useCallback(() => {
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }
    }, []);

    const startTimer = useCallback(() => {
        clearTimer();
        const questionKey = questionKeyRef.current;

        countdownRef.current = setInterval(() => {
            if (questionKey !== questionKeyRef.current || gameStateRef.current !== 'playing') {
                return;
            }

            setCountdown(prev => {
                if (prev <= 1) {
                    clearTimer();
                    setGameState('timeout');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [clearTimer]);

    // Load a single question from pending songs
    const loadOneQuestion = useCallback(async () => {
        // If already loading, wait for that request to finish
        if (loadingPromiseRef.current) {
            return loadingPromiseRef.current;
        }

        const loadTask = async () => {
            try {
                while (pendingSongsRef.current.length > 0) {
                    const song = pendingSongsRef.current.shift(); // Take from front

                    // Skip if already used
                    if (usedSongsRef.current.has(song.title)) {
                        continue;
                    }

                    const lyrics = await fetchLyrics(artist.name, song.title, song.album, song.duration);

                    if (lyrics) {
                        const phrase = selectRandomPhrase(lyrics);
                        if (phrase) {
                            usedSongsRef.current.add(song.title); // Mark as used
                            return { song, phrase, lyrics };
                        }
                    }
                }
            } catch (error) {
                console.error("Error loading question:", error);
            }
            return null;
        };

        loadingPromiseRef.current = loadTask();

        try {
            const result = await loadingPromiseRef.current;
            return result;
        } finally {
            loadingPromiseRef.current = null;
        }
    }, [artist]);

    // Initialize game
    useEffect(() => {
        if (!artist) {
            navigate('/');
            return;
        }

        // Increment init ID to invalidate any in-progress initialization
        const currentInitId = ++initIdRef.current;

        const initGame = async () => {
            // Reset refs
            usedSongsRef.current = new Set();
            pendingSongsRef.current = [...getRandomSongs(artistId, 25)]; // Get 25 songs
            loadingPromiseRef.current = null;
            resultsRef.current = [];

            // Load first question
            const firstQuestion = await loadOneQuestion();

            // Check if this initialization is still valid (not superseded by a newer one)
            if (currentInitId !== initIdRef.current) {
                return; // Abort - a newer initialization has started
            }

            if (!firstQuestion) {
                navigate('/');
                return;
            }

            // Prefetch remaining songs in background
            prefetchSongs(artist.name, pendingSongsRef.current.slice(0, 5));

            setQuestions([firstQuestion]);
            setCurrentPhrase(firstQuestion.phrase);
            setGuess(null);
            setCountdown(COUNTDOWN_SECONDS);
            questionKeyRef.current = 1;
            setGameState('playing');
        };

        initGame();

        return () => clearTimer();
    }, [artist, artistId, navigate, clearTimer, loadOneQuestion]);

    // Start/stop timer based on game state
    useEffect(() => {
        if (gameState === 'playing') {
            startTimer();
        } else {
            clearTimer();
        }
    }, [gameState, startTimer, clearTimer]);

    const moveToNextQuestion = useCallback(async () => {
        const nextIndex = currentIndex + 1;

        if (nextIndex >= QUESTIONS_PER_ROUND) {
            // Game complete - use ref to get latest results
            setTimeout(() => {
                const currentResults = resultsRef.current;
                const totalScore = currentResults.reduce((sum, r) => sum + r.points, 0);
                navigate('/results', {
                    state: {
                        artistId,
                        artistName: artist.name,
                        score: totalScore,
                        results: currentResults
                    }
                });
            }, 100);
            return;
        }

        // Check if we have the next question ready
        if (nextIndex < questions.length) {
            questionKeyRef.current += 1;
            setCurrentIndex(nextIndex);
            setCurrentPhrase(questions[nextIndex].phrase);
            setGuess(null);
            setCountdown(COUNTDOWN_SECONDS);
            setGameState('playing');
        } else {
            // Need to load next question
            setGameState('loading');
            setCurrentIndex(nextIndex);

            const nextQuestion = await loadOneQuestion();

            if (nextQuestion) {
                // Add question only if not already added (prevent race with preload)
                setQuestions(prev => {
                    if (prev.some(q => q.song.title === nextQuestion.song.title)) {
                        return prev;
                    }
                    return [...prev, nextQuestion];
                });
                questionKeyRef.current += 1;
                setCurrentPhrase(nextQuestion.phrase);
                setGuess(null);
                setCountdown(COUNTDOWN_SECONDS);
                setGameState('playing');
            } else {
                // No more songs available, end game early - use ref to get latest results
                const currentResults = resultsRef.current;
                const totalScore = currentResults.reduce((sum, r) => sum + r.points, 0);
                navigate('/results', {
                    state: {
                        artistId,
                        artistName: artist.name,
                        score: totalScore,
                        results: currentResults
                    }
                });
            }
        }
    }, [currentIndex, questions, navigate, artistId, artist, loadOneQuestion]);

    // Handle timeout state
    useEffect(() => {
        if (gameState !== 'timeout') return;

        const question = questions[currentIndex];
        if (!question) return;

        // Add result for timeout
        const timeoutResult = {
            song: question.song.title,
            guess: null,
            actual: question.phrase.percentage,
            points: 0
        };
        
        setResults(prev => [...prev, timeoutResult]);
        // Also update ref immediately so moveToNextQuestion has latest
        resultsRef.current = [...resultsRef.current, timeoutResult];

        moveToNextQuestion();
    }, [gameState, questions, currentIndex, moveToNextQuestion]);

    // Preload next question while user is playing
    useEffect(() => {
        if (gameState !== 'playing' && gameState !== 'answered') return;
        if (questions.length >= QUESTIONS_PER_ROUND) return;
        if (questions.length > currentIndex + 1) return; // Already have next question

        const preloadNext = async () => {
            const nextQuestion = await loadOneQuestion();
            if (nextQuestion) {
                setQuestions(prev => {
                    // Check we haven't already added this
                    if (prev.some(q => q.song.title === nextQuestion.song.title)) return prev;
                    if (prev.length >= QUESTIONS_PER_ROUND) return prev;
                    return [...prev, nextQuestion];
                });
            }
        };

        preloadNext();
    }, [gameState, questions.length, currentIndex, loadOneQuestion]);

    const handleGuess = useCallback((percentage) => {
        if (gameState !== 'playing') return;

        clearTimer();

        const question = questions[currentIndex];
        const actualPercentage = question.phrase.percentage;
        const points = calculatePoints(percentage, actualPercentage);

        const newResult = {
            song: question.song.title,
            guess: percentage,
            actual: actualPercentage,
            points
        };

        setGuess(percentage);
        setResults(prev => [...prev, newResult]);
        // Also update ref immediately so moveToNextQuestion has latest
        resultsRef.current = [...resultsRef.current, newResult];
        setGameState('answered');
    }, [gameState, questions, currentIndex, clearTimer]);

    const handleNext = useCallback(() => {
        moveToNextQuestion();
    }, [moveToNextQuestion]);

    if (!artist) return null;

    const currentQuestion = questions[currentIndex];
    const lastResult = results[results.length - 1];
    const accuracy = lastResult && gameState === 'answered'
        ? getAccuracyLabel(lastResult.points)
        : null;
    const totalQuestions = QUESTIONS_PER_ROUND;

    return (
        <div className="page game-page">
            <div className="game-header">
                <button className="back-btn" onClick={() => navigate('/')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                </button>
                <div className="game-meta">
                    <span className="question-count">{currentIndex + 1}/{totalQuestions}</span>
                    <span className="score-count">{results.reduce((sum, r) => sum + r.points, 0)}</span>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {gameState === 'loading' ? (
                    <motion.div
                        key="loading"
                        className="loading-state"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="loader" />
                    </motion.div>
                ) : (
                    <motion.div
                        key={`question-${questionKeyRef.current}`}
                        className="question-content"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.25 }}
                    >
                        <div className="song-meta">
                            <h2>{currentQuestion?.song.title}</h2>
                            <p>{currentQuestion?.song.album}</p>
                        </div>

                        <blockquote className="lyric-quote">
                            {currentPhrase?.text}
                        </blockquote>

                        <ProgressBar
                            onGuess={handleGuess}
                            guess={guess}
                            actual={gameState === 'answered' ? currentPhrase?.percentage : null}
                            disabled={gameState !== 'playing'}
                            duration={currentQuestion?.song.duration || 200}
                            countdown={gameState === 'playing' ? countdown : null}
                        />

                        <AnimatePresence>
                            {gameState === 'answered' && accuracy && (
                                <motion.div
                                    className="result-feedback"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <div className="feedback-score" style={{ color: accuracy.color }}>
                                        {accuracy.emoji} +{lastResult?.points}
                                    </div>

                                    <motion.button
                                        className="next-btn"
                                        onClick={handleNext}
                                        whileTap={{ scale: 0.97 }}
                                    >
                                        {currentIndex + 1 >= QUESTIONS_PER_ROUND ? 'See Results' : 'Continue'}
                                    </motion.button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
