// Curated artist data with popular songs
// Songs include title and duration (in seconds) for LRCLIB API lookups

export const artists = [
  {
    id: 'taylor-swift',
    name: 'Taylor Swift',
    image: 'https://i.scdn.co/image/ab6761610000e5ebe672b5f553298dcdccb0e676',
    songs: [
      { title: 'Anti-Hero', album: 'Midnights', duration: 200 },
      { title: 'Blank Space', album: '1989', duration: 231 },
      { title: 'Shake It Off', album: '1989', duration: 219 },
      { title: 'Love Story', album: 'Fearless', duration: 235 },
      { title: 'You Belong With Me', album: 'Fearless', duration: 231 },
      { title: 'All Too Well', album: 'Red', duration: 329 },
      { title: 'Cruel Summer', album: 'Lover', duration: 178 },
      { title: 'Cardigan', album: 'Folklore', duration: 239 },
      { title: 'Willow', album: 'Evermore', duration: 214 },
      { title: 'Style', album: '1989', duration: 231 },
      { title: 'Bad Blood', album: '1989', duration: 211 },
      { title: 'Enchanted', album: 'Speak Now', duration: 352 },
      { title: 'Delicate', album: 'Reputation', duration: 232 },
      { title: 'Lavender Haze', album: 'Midnights', duration: 202 },
      { title: 'Fortnight', album: 'The Tortured Poets Department', duration: 228 },
      { title: 'Ready For It', album: 'Reputation', duration: 208 },
      { title: 'Lover', album: 'Lover', duration: 221 },
      { title: 'Wildest Dreams', album: '1989', duration: 220 },
      { title: 'August', album: 'Folklore', duration: 262 },
      { title: 'Champagne Problems', album: 'Evermore', duration: 244 },
    ]
  },
  {
    id: 'utada-hikaru',
    name: 'Utada Hikaru',
    image: 'https://ui-avatars.com/api/?name=Utada+Hikaru&background=8B5CF6&color=fff&size=200',
    songs: [
      { title: 'First Love', album: 'First Love', duration: 249 },
      { title: 'Automatic', album: 'First Love', duration: 325 },
      { title: 'Hikari', album: 'Deep River', duration: 325 },
      { title: 'Simple And Clean', album: 'Kingdom Hearts', duration: 320 },
      { title: 'Flavor Of Life', album: 'Heart Station', duration: 301 },
      { title: 'Beautiful World', album: 'Evangelion', duration: 333 },
      { title: 'Passion', album: 'Ultra Blue', duration: 305 },
      { title: 'Sanctuary', album: 'Kingdom Hearts II', duration: 282 },
      { title: 'One Last Kiss', album: 'Evangelion', duration: 262 },
      { title: 'Face My Fears', album: 'Kingdom Hearts III', duration: 224 },
      { title: 'traveling', album: 'Deep River', duration: 324 },
      { title: 'Keep Tryin\'', album: 'Ultra Blue', duration: 257 },
      { title: 'Michi', album: 'Fantome', duration: 310 },
      { title: 'Addicted To You', album: 'First Love', duration: 273 },
      { title: 'Can You Keep A Secret', album: 'Distance', duration: 285 },
      { title: 'Letters', album: 'Deep River', duration: 304 },
      { title: 'Sakura Drops', album: 'Deep River', duration: 295 },
      { title: 'Kiss & Cry', album: 'Heart Station', duration: 268 },
      { title: 'Prisoner Of Love', album: 'Heart Station', duration: 296 },
      { title: 'Wait & See', album: 'Distance', duration: 324 },
    ]
  },
  {
    id: 'sabrina-carpenter',
    name: 'Sabrina Carpenter',
    image: 'https://ui-avatars.com/api/?name=Sabrina+Carpenter&background=EC4899&color=fff&size=200',
    songs: [
      { title: 'Espresso', album: 'Short n\' Sweet', duration: 175 },
      { title: 'Please Please Please', album: 'Short n\' Sweet', duration: 186 },
      { title: 'Feather', album: 'emails i can\'t send', duration: 194 },
      { title: 'Nonsense', album: 'emails i can\'t send', duration: 172 },
      { title: 'because i liked a boy', album: 'emails i can\'t send', duration: 198 },
      { title: 'Taste', album: 'Short n\' Sweet', duration: 157 },
      { title: 'Bed Chem', album: 'Short n\' Sweet', duration: 178 },
      { title: 'Slim Pickins', album: 'Short n\' Sweet', duration: 173 },
      { title: 'Coincidence', album: 'Short n\' Sweet', duration: 185 },
      { title: 'Juno', album: 'Short n\' Sweet', duration: 169 },
      { title: 'Sharpest Tool', album: 'Short n\' Sweet', duration: 199 },
      { title: 'Dumb & Poetic', album: 'Short n\' Sweet', duration: 182 },
      { title: 'Lie To Girls', album: 'Short n\' Sweet', duration: 195 },
      { title: 'Don\'t Smile', album: 'Short n\' Sweet', duration: 168 },
      { title: 'Read your Mind', album: 'emails i can\'t send', duration: 208 },
      { title: 'Vicious', album: 'emails i can\'t send', duration: 188 },
      { title: 'Already Over', album: 'emails i can\'t send', duration: 201 },
      { title: 'Skin', album: 'Singular: Act II', duration: 193 },
      { title: 'Looking at Me', album: 'emails i can\'t send', duration: 156 },
      { title: 'Fast Times', album: 'emails i can\'t send', duration: 183 },
    ]
  }
];

export const getArtistById = (id) => artists.find(a => a.id === id);

// Track last used song to prevent back-to-back repeats
let lastUsedSongTitle = null;

export const getRandomSongs = (artistId, count = 10) => {
  const artist = getArtistById(artistId);
  if (!artist) return [];

  // Shuffle songs
  const shuffled = [...artist.songs].sort(() => Math.random() - 0.5);

  // Filter out the last used song if it's first in the shuffled list
  const filtered = shuffled.filter((song, index) => {
    if (index === 0 && song.title === lastUsedSongTitle) {
      return false;
    }
    return true;
  });

  const result = filtered.slice(0, Math.min(count, filtered.length));

  // Track last song for next round
  if (result.length > 0) {
    lastUsedSongTitle = result[result.length - 1].title;
  }

  return result;
};

// Reset tracking (useful for new game sessions)
export const resetSongTracking = () => {
  lastUsedSongTitle = null;
};
