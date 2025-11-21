"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, RotateCw } from 'lucide-react';

export default function WordChainGame() {
  const [gameData, setGameData] = useState(null);
  const [userWords, setUserWords] = useState([
    { word: '', revealed: 1, attempts: 0, complete: false },
    { word: '', revealed: 1, attempts: 0, complete: false },
    { word: '', revealed: 1, attempts: 0, complete: false }
  ]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [gameWon, setGameWon] = useState(false);
  const [gameLost, setGameLost] = useState(false);
  const [error, setError] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    startNewGame();
  }, []);

  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  const startNewGame = async () => {
    setLoading(true);
    setGameWon(false);
    setGameLost(false);
    setError('');
    setShowConfetti(false);
    setUserWords([
      { word: '', revealed: 1, attempts: 0, complete: false },
      { word: '', revealed: 1, attempts: 0, complete: false },
      { word: '', revealed: 1, attempts: 0, complete: false }
    ]);
    setCurrentWordIndex(0);
    
    try {
      const response = await fetch('http://localhost:3001/api/game/new');
      const data = await response.json();
      setGameData(data);
    } catch (err) {
      setError('Failed to start game. Make sure backend is running!');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (wordIndex, letterIndex, e) => {
    if (wordIndex !== currentWordIndex || userWords[wordIndex].complete) return;

    const currentWord = userWords[wordIndex];
    const maxLength = gameData.chain[wordIndex + 1].length;

    if (e.key === 'Enter' && currentWord.word.length === maxLength) {
      handleSubmitWord(wordIndex);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      if (currentWord.word.length > 0) {
        const newWords = [...userWords];
        newWords[wordIndex].word = currentWord.word.slice(0, -1);
        setUserWords(newWords);
        
        if (currentWord.word.length > 0) {
          setTimeout(() => {
            inputRefs.current[wordIndex * 10 + currentWord.word.length - 1]?.focus();
          }, 0);
        }
      }
    } else if (/^[a-zA-Z]$/.test(e.key) && currentWord.word.length < maxLength) {
      e.preventDefault();
      const newWords = [...userWords];
      newWords[wordIndex].word = (currentWord.word + e.key).toUpperCase();
      setUserWords(newWords);
      
      if (newWords[wordIndex].word.length < maxLength) {
        setTimeout(() => {
          inputRefs.current[wordIndex * 10 + newWords[wordIndex].word.length]?.focus();
        }, 0);
      }
    }
  };

  const handleSubmitWord = async (wordIndex) => {
    const currentWord = userWords[wordIndex];
    const correctWord = gameData.chain[wordIndex + 1].toUpperCase();

    if (currentWord.word.length !== correctWord.length) return;

    const newWords = [...userWords];
    newWords[wordIndex].attempts += 1;

    if (currentWord.word === correctWord) {
      newWords[wordIndex].complete = true;
      
      if (wordIndex < 2) {
        setCurrentWordIndex(wordIndex + 1);
        setTimeout(() => {
          inputRefs.current[(wordIndex + 1) * 10]?.focus();
        }, 100);
      } else {
        setGameWon(true);
        setShowConfetti(true);
      }
    } else {
      if (newWords[wordIndex].attempts >= 3) {
        setGameLost(true);
      } else {
        newWords[wordIndex].revealed = Math.min(
          newWords[wordIndex].revealed + 1,
          correctWord.length
        );
        newWords[wordIndex].word = '';
        setTimeout(() => {
          inputRefs.current[wordIndex * 10]?.focus();
        }, 100);
      }
    }

    setUserWords(newWords);
  };

  const renderLetterBoxes = (wordIndex, isFirstWord = false, isLastWord = false) => {
    if (isFirstWord || isLastWord) {
      const word = isFirstWord ? gameData.chain[0] : gameData.chain[4];
      return (
        <div className="flex gap-2 justify-center">
          {word.toUpperCase().split('').map((letter, i) => (
            <div
              key={i}
              className={`w-14 h-14 flex items-center justify-center text-2xl font-bold rounded-lg ${
                isFirstWord
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                  : 'bg-gradient-to-br from-pink-500 to-rose-600'
              } text-white shadow-lg`}
            >
              {letter}
            </div>
          ))}
        </div>
      );
    }

    const correctWord = gameData.chain[wordIndex + 1].toUpperCase();
    const currentWord = userWords[wordIndex];
    const maxLength = correctWord.length;
    const isActive = wordIndex === currentWordIndex && !currentWord.complete;

    return (
      <div className="flex gap-2 justify-center">
        {Array.from({ length: maxLength }).map((_, i) => {
          const isRevealed = i < currentWord.revealed;
          const hasLetter = i < currentWord.word.length;
          const letter = hasLetter ? currentWord.word[i] : (isRevealed ? correctWord[i] : '');

          return (
            <input
              key={i}
              ref={el => inputRefs.current[wordIndex * 10 + i] = el}
              type="text"
              maxLength="1"
              value={letter}
              readOnly
              onKeyDown={(e) => handleKeyDown(wordIndex, i, e)}
              disabled={!isActive || currentWord.complete}
              className={`w-14 h-14 text-center text-2xl font-bold rounded-lg outline-none transition-all ${
                currentWord.complete
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'
                  : isRevealed
                  ? 'bg-yellow-400 text-gray-900'
                  : isActive
                  ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white cursor-pointer'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              } shadow-lg uppercase ${
                isActive && i === currentWord.word.length ? 'ring-4 ring-white ring-opacity-50' : ''
              }`}
            />
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-2xl animate-pulse flex items-center gap-3">
          <Sparkles className="animate-spin" />
          Creating your word chain...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error}</div>
          <button
            onClick={startNewGame}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl text-white transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8 relative overflow-hidden">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {Array.from({ length: 100 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#a29bfe'][Math.floor(Math.random() * 6)],
                  transform: `rotate(${Math.random() * 360}deg)`
                }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12 animate-fadeIn">
          <h1 className="text-6xl font-bold text-white mb-4 flex items-center justify-center gap-3">
            <Sparkles className="text-yellow-400" />
            Word Chain
            <Sparkles className="text-yellow-400" />
          </h1>
          <p className="text-purple-200 text-lg">Connect the words! Press Enter to submit.</p>
          {!gameWon && !gameLost && (
            <div className="mt-4 text-purple-300">
              Attempts: {userWords[currentWordIndex]?.attempts || 0} / 3
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="animate-slideInLeft">
            {renderLetterBoxes(0, true, false)}
          </div>
{/* 
          <div className="h-8 flex items-center justify-center">
            <div className="text-purple-300 text-2xl">↓</div>
          </div> */}

          {[0, 1, 2].map((index) => (
            <React.Fragment key={index}>
              <div className="animate-slideInRight" style={{animationDelay: `${(index + 1) * 100}ms`}}>
                {renderLetterBoxes(index)}
              </div>
              {/* <div className="h-8 flex items-center justify-center">
                <div className="text-purple-300 text-2xl">↓</div>
              </div> */}
            </React.Fragment>
          ))}

          <div className="animate-slideInLeft" style={{animationDelay: '400ms'}}>
            {renderLetterBoxes(0, false, true)}
          </div>
        </div>

        {gameWon && (
          <div className="mt-8 text-center">
            <div className="text-3xl font-bold text-yellow-400 mb-4 animate-bounce">
              🎉 You Won! 🎉
            </div>
          </div>
        )}

        {gameLost && (
          <div className="mt-8 text-center">
            <div className="text-4xl font-bold text-red-400 mb-4">
              Game Over! 😔
            </div>
            <div className="text-white text-xl mb-4">
              The correct words were:
            </div>
            <div className="text-purple-200 text-lg space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i}>{gameData.chain[i].toUpperCase()}</div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={startNewGame}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:scale-105 transition-transform flex items-center gap-2 mx-auto shadow-lg"
          >
            <RotateCw size={20} />
            New Game
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-50px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(50px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes confetti {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        .animate-slideInLeft {
          animation: slideInLeft 0.6s ease-out;
          animation-fill-mode: both;
        }
        .animate-slideInRight {
          animation: slideInRight 0.6s ease-out;
          animation-fill-mode: both;
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  );
}