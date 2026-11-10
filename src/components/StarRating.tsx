import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';

interface StarRatingProps {
  movieId: string;
  initialRating: number;
  initialCount: number;
}

export const StarRating: React.FC<StarRatingProps> = ({
  movieId,
  initialRating,
  initialCount
}) => {
  const { showToast } = useApp();
  const [rating, setRating] = useState(initialRating);
  const [count, setCount] = useState(initialCount);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  const handleRate = async (starIndex: number) => {
    if (hasVoted) {
      showToast('You have already rated this title!');
      return;
    }
    const res = await api.rateMovie(movieId, starIndex);
    setRating(res.rating);
    setCount(res.count);
    setHasVoted(true);
    showToast(`Thank you! You rated this ${starIndex}/10 stars.`);
  };

  return (
    <div className="bg-[#2d323e] p-3 sm:p-4 rounded-2xl text-center flex flex-col items-center justify-center border border-[#3e4555] shadow-lg">
      <div className="text-xs text-[#b2b1ad] font-semibold uppercase tracking-wider mb-1">
        Community Rating
      </div>

      <div className="flex items-center gap-1 my-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => {
          const isFilled = hoveredStar !== null 
            ? star <= hoveredStar 
            : star <= Math.round(rating);
          return (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(null)}
              onClick={() => handleRate(star)}
              className="p-0.5 text-neutral-500 hover:scale-125 transition-transform cursor-pointer focus:outline-none"
              title={`Rate ${star} / 10`}
            >
              <Star 
                className={`w-4 h-4 sm:w-5 sm:h-5 ${
                  isFilled 
                    ? 'fill-amber-400 text-amber-400' 
                    : 'text-neutral-600'
                }`} 
              />
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 mt-1 text-xs">
        <span className="text-white font-bold text-sm">{rating.toFixed(1)}</span>
        <span className="text-neutral-500">/ 10</span>
        <span className="text-neutral-400">• ({count.toLocaleString()} votes)</span>
      </div>
      {hasVoted && (
        <span className="text-[10px] text-emerald-400 mt-1 font-medium">Your vote was recorded</span>
      )}
    </div>
  );
};
