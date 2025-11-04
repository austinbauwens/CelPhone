/**
 * Generate a cute room code like street names or BnB names (no numbers)
 */
export function generateRoomCode(): string {
  const firstWords = [
    'sunny', 'cozy', 'happy', 'quiet', 'bright', 'warm', 'cool', 'wild', 'calm', 'sweet',
    'tiny', 'huge', 'soft', 'bold', 'neat', 'keen', 'fresh', 'brave', 'wise', 'kind',
    'lucky', 'magic', 'dreamy', 'snug', 'peaceful', 'joyful', 'cheerful', 'gentle', 'merry', 'lively'
  ];
  
  const secondWords = [
    'cat', 'dog', 'bee', 'fox', 'owl', 'bunny', 'bird', 'fish', 'deer', 'bear',
    'creek', 'brook', 'grove', 'lane', 'path', 'trail', 'ridge', 'hill', 'dale', 'vale',
    'cottage', 'cabin', 'lodge', 'villa', 'manor', 'house', 'place', 'corner', 'nook', 'spot',
    'garden', 'meadow', 'forest', 'river', 'lake', 'pond', 'ocean', 'beach', 'island', 'shore'
  ];

  const thirdWords = [
    'inn', 'bnb', 'retreat', 'haven', 'hideaway', 'sanctuary', 'cove', 'nest', 'den', 'roost',
    'lodge', 'cabin', 'cottage', 'villa', 'manor', 'estate', 'house', 'home', 'place', 'spot'
  ];

  // Generate like "sunny creek inn" or "cozy cat cottage"
  const first = firstWords[Math.floor(Math.random() * firstWords.length)];
  const second = secondWords[Math.floor(Math.random() * secondWords.length)];
  const third = thirdWords[Math.floor(Math.random() * thirdWords.length)];
  
  // Sometimes use 2 words, sometimes 3 for variety
  if (Math.random() > 0.5) {
    return `${first} ${second} ${third}`;
  } else {
    return `${first} ${second}`;
  }
}

/**
 * Throttle function to limit how often a function is called
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Debounce function to delay function execution
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

