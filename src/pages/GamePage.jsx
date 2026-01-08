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
    const [pendingSongs, setPendingSongs] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentPhrase, setCurrentPhrase] = useState(null);
    const [guess, setGuess] = useState(null);
    const [results, setResults] = useState([]);
    const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

    const countdownRef = useRef(null);
    const gameStateRef = useRef(gameState);
    const questionKeyRef = useRef(0); // Unique key per question to prevent stale closures

    // Keep refs in sync
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    // Clear any existing timer
    const clearTimer = useCallback(() => {
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }
    }, []);

    // Start a fresh timer for current question
    const startTimer = useCallback(() => {
        clearTimer();
        const questionKey = questionKeyRef.current;

        countdownRef.current = setInterval(() => {
            // Check if we're still on the same question and still playing
            if (questionKey !== questionKeyRef.current || gameStateRef.current !== 'playing') {
                return;
            }

            setCountdown(prev => {
                if (prev <= 1) {
                    clearTimer();
                    // Trigger timeout via state change, not direct call
                    setGameState('timeout');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [clearTimer]);

    // Initialize game
    useEffect(() => {
        if (!artist) {
            navigate('/');
            return;
        }

        const initGame = async () => {
            const songs = getRandomSongs(artistId, QUESTIONS_PER_ROUND + 5);
            let firstQuestion = null;
            let remaining = [];

            for (let i = 0; i < songs.length; i++) {
                const song = songs[i];
                const lyrics = await fetchLyrics(artist.name, song.title, song.album, song.duration);

                if (lyrics) {
                    const phrase = selectRandomPhrase(lyrics);
                    if (phrase) {
                        firstQuestion = { song, phrase, lyrics };
                        remaining = songs.slice(i + 1);
                        break;
                    }
                }
            }

            if (!firstQuestion) {
                navigate('/');
                return;
            }

            setQuestions([firstQuestion]);
            setPendingSongs(remaining);
            setCurrentPhrase(firstQuestion.phrase);
            setGuess(null);
            setCountdown(COUNTDOWN_SECONDS);
            questionKeyRef.current = 1;
            setGameState('playing');

            prefetchSongs(artist.name, remaining);
        };

        initGame();

        return () => clearTimer();
    }, [artist, artistId, navigate, clearTimer]);

    // Start/stop timer based on game state
    useEffect(() => {
        if (gameState === 'playing') {
            startTimer();
        } else {
            clearTimer();
        }
    }, [gameState, startTimer, clearTimer]);

    // Handle timeout state
    useEffect(() => {
        if (gameState !== 'timeout') return;

        const question = questions[currentIndex];
        if (!question) return;

        // Record 0 points for timeout
        setResults(prev => [...prev, {
            song: question.song.title,
            guess: null,
            actual: question.phrase.percentage,
            points: 0
        }]);

        // Move to next question
        moveToNextQuestion();
    }, [gameState]);

    const moveToNextQuestion = useCallback(() => {
        const nextIndex = currentIndex + 1;

        if (nextIndex >= QUESTIONS_PER_ROUND || (nextIndex >= questions.length && pendingSongs.length === 0)) {
            // Game complete
            setTimeout(() => {
                const totalScore = results.reduce((sum, r) => sum + r.points, 0);
                navigate('/results', {
                    state: {
                        artistId,
                        artistName: artist.name,
                        score: totalScore,
                        results: results
                    }
                });
            }, 100);
            return;
        }

        if (nextIndex >= questions.length) {
            setGameState('loading');
            setCurrentIndex(nextIndex);
            return;
        }

        questionKeyRef.current += 1;
        setCurrentIndex(nextIndex);
        setCurrentPhrase(questions[nextIndex].phrase);
        setGuess(null);
        setCountdown(COUNTDOWN_SECONDS);
        setGameState('playing');
    }, [currentIndex, questions, pendingSongs, results, navigate, artistId, artist]);

    // Load more questions in background
    useEffect(() => {
        if (questions.length >= QUESTIONS_PER_ROUND) return;
        if (pendingSongs.length === 0) return;

        const loadNextQuestion = async () => {
            // Get titles of songs already used
            const usedTitles = new Set(questions.map(q => q.song.title));

            for (let i = 0; i < pendingSongs.length; i++) {
                const song = pendingSongs[i];

                // Skip if song already used
                if (usedTitles.has(song.title)) {
                    setPendingSongs(prev => prev.filter((_, idx) => idx !== i));
                    continue;
                }

                const lyrics = await fetchLyrics(artist.name, song.title, song.album, song.duration);

                if (lyrics) {
                    const phrase = selectRandomPhrase(lyrics);
                    if (phrase) {
                        setQuestions(prev => {
                            // Double-check we haven't already added this song
                            if (prev.some(q => q.song.title === song.title)) return prev;
                            if (prev.length >= QUESTIONS_PER_ROUND) return prev;
                            return [...prev, { song, phrase, lyrics }];
                        });
                        setPendingSongs(prev => prev.filter((_, idx) => idx !== i));
                        return;
                    }
                }
                setPendingSongs(prev => prev.filter((_, idx) => idx !== i));
            }
        };

        if (questions.length < currentIndex + 3) {
            loadNextQuestion();
        }
    }, [questions.length, currentIndex, pendingSongs, artist]);

    const handleGuess = useCallback((percentage) => {
        if (gameState !== 'playing') return;

        clearTimer();

        const question = questions[currentIndex];
        const actualPercentage = question.phrase.percentage;
        const points = calculatePoints(percentage, actualPercentage);

        setGuess(percentage);
        setResults(prev => [...prev, {
            song: question.song.title,
            guess: percentage,
            actual: actualPercentage,
            points
        }]);
        setGameState('answered');
    }, [gameState, questions, currentIndex, clearTimer]);

    const handleNext = useCallback(() => {
        moveToNextQuestion();
    }, [moveToNextQuestion]);

    // Auto-transition when question loads
    useEffect(() => {
        if (gameState === 'loading' && currentIndex < questions.length) {
            questionKeyRef.current += 1;
            setCurrentPhrase(questions[currentIndex].phrase);
            setGuess(null);
            setCountdown(COUNTDOWN_SECONDS);
            setGameState('playing');
        }
    }, [gameState, currentIndex, questions]);

    if (!artist) return null;

    const currentQuestion = questions[currentIndex];
    const lastResult = results[results.length - 1];
    const accuracy = lastResult && gameState === 'answered'
        ? getAccuracyLabel(lastResult.points)
        : null;
    const totalQuestions = Math.max(questions.length, QUESTIONS_PER_ROUND);

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
