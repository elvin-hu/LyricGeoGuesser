import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './ProgressBar.css';

// Convert seconds to mm:ss format
const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function ProgressBar({
    onGuess,
    guess,
    actual,
    disabled,
    duration = 200,
    countdown,
    onTimeout
}) {
    const [hovering, setHovering] = useState(false);
    const [hoverPosition, setHoverPosition] = useState(0);
    const barRef = useRef(null);

    const handleMouseMove = (e) => {
        if (disabled || !barRef.current) return;

        const rect = barRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setHoverPosition(percentage);
    };

    const handleClick = (e) => {
        if (disabled || !barRef.current) return;

        const rect = barRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        onGuess(percentage);
    };

    const handleTouchEnd = (e) => {
        if (disabled || !barRef.current) return;

        const touch = e.changedTouches[0];
        const rect = barRef.current.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        onGuess(percentage);
    };

    // Only show markers when we have valid values
    const hasGuess = guess !== null && guess !== undefined;
    const hasActual = actual !== null && actual !== undefined;
    const showResult = hasGuess && hasActual;

    // Convert percentages to actual times
    const hoverTime = formatTime((hoverPosition / 100) * duration);
    const guessTime = hasGuess ? formatTime((guess / 100) * duration) : null;
    const actualTime = hasActual ? formatTime((actual / 100) * duration) : null;
    const totalTime = formatTime(duration);

    return (
        <div className="progress-bar-container">
            <div
                ref={barRef}
                className={`progress-bar ${disabled ? 'disabled' : ''}`}
                onMouseEnter={() => setHovering(true)}
                onMouseLeave={() => setHovering(false)}
                onMouseMove={handleMouseMove}
                onClick={handleClick}
                onTouchEnd={handleTouchEnd}
            >
                <div className="progress-track">
                    {/* Countdown indicator */}
                    {countdown !== null && countdown !== undefined && !disabled && (
                        <motion.div
                            className="countdown-fill"
                            initial={{ width: '100%' }}
                            animate={{ width: '0%' }}
                            transition={{ duration: 10, ease: 'linear' }}
                        />
                    )}
                </div>

                {/* Time endpoints */}
                <div className="time-endpoints">
                    <span>0:00</span>
                    <span>{totalTime}</span>
                </div>

                {/* Hover indicator */}
                <AnimatePresence>
                    {hovering && !disabled && (
                        <motion.div
                            className="hover-indicator"
                            style={{ left: `${hoverPosition}%` }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className="hover-line" />
                            <div className="hover-time">{hoverTime}</div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Guess marker - only show if hasGuess is true */}
                <AnimatePresence>
                    {hasGuess && (
                        <motion.div
                            className="marker guess-marker"
                            style={{ left: `${guess}%` }}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        >
                            <div className="marker-line" />
                            <div className="marker-time">{guessTime}</div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Actual position marker */}
                <AnimatePresence>
                    {showResult && (
                        <motion.div
                            className="marker actual-marker"
                            style={{ left: `${actual}%` }}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0 }}
                            transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 25 }}
                        >
                            <div className="marker-line actual-line" />
                            <div className="marker-time actual-time">{actualTime}</div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Countdown timer display */}
            {countdown !== null && countdown !== undefined && !disabled && (
                <div className="countdown-display">
                    {countdown}s
                </div>
            )}
        </div>
    );
}
