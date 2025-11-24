import { useState, useEffect, useRef } from "react";
import { logError } from '@/lib/logger';
import { X, Search, Play, Pause, Music, TrendingUp, Headphones, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";

interface Track {
  id: number;
  title: string;
  artist: {
    name: string;
  };
  album: {
    title: string;
    cover_medium: string;
  };
  duration: number;
  preview: string;
}

interface MusicSelectorProps {
  onClose: () => void;
  onSelect: (musicUrl: string, trackInfo: { title: string; artist: string }) => void;
}

export default function MusicSelector({ onClose, onSelect }: MusicSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'popular' | 'genre' | 'mood'>('popular');
  const [playingTrackId, setPlayingTrackId] = useState<number | null>(null);
  const [error, setError] = useState('');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load popular tracks on mount
  useEffect(() => {
    loadPopularTracks();
  }, []);

  const loadPopularTracks = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Search for popular Indonesian songs
      const response = await fetch(`/api/music/search?q=trending indonesia`);
      if (!response.ok) throw new Error('Failed to load music');
      const data = await response.json();
      setTracks(data.data || []);
    } catch (err) {
      setError('Gagal memuat lagu populer');
      logError('Error loading popular tracks', err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchTracks = async (query: string) => {
    if (!query.trim()) {
      loadPopularTracks();
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/music/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Failed to search music');
      const data = await response.json();
      setTracks(data.data || []);
    } catch (err) {
      setError('Gagal mencari lagu');
      logError('Error searching tracks', err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchTracks(searchQuery);
  };

  const togglePlayPreview = (track: Track) => {
    if (playingTrackId === track.id) {
      // Stop current track
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingTrackId(null);
    } else {
      // Stop previous track if playing
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      // Play new track
      audioRef.current = new Audio(track.preview);
      audioRef.current.play();
      setPlayingTrackId(track.id);
      
      // Reset playing state when track ends
      audioRef.current.addEventListener('ended', () => {
        setPlayingTrackId(null);
      });
    }
  };

  const handleSelectTrack = (track: Track) => {
    // Stop preview if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    onSelect(track.preview, {
      title: track.title,
      artist: track.artist.name
    });
    onClose();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header - Responsive for mobile and desktop */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-nxe-dark border-b border-nxe-surface p-4 md:p-6"
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-white font-semibold text-lg md:text-2xl">Pilih Musik</h2>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white p-2"
              data-testid="button-close-music-selector"
            >
              <X className="h-5 w-5 md:h-6 md:w-6" />
            </Button>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative mb-4 md:mb-6">
            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Cari suasana hati"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-nxe-surface border-none text-white pl-10 md:pl-12 h-12 md:h-14 rounded-lg text-base md:text-lg"
              data-testid="input-search-music"
            />
          </form>

          {/* Tabs with Green Underline Indicator */}
          <div className="relative">
            <div className="flex gap-6 md:gap-8 border-b border-gray-800">
              <button
                onClick={() => {
                  setActiveTab('popular');
                  loadPopularTracks();
                }}
                className={`flex items-center gap-2 pb-3 md:pb-4 relative transition-colors ${
                  activeTab === 'popular'
                    ? 'text-nxe-accent'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                data-testid="tab-popular"
              >
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-sm md:text-base font-medium">Populer</span>
                {activeTab === 'popular' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-nxe-accent"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>

              <button
                onClick={() => setActiveTab('genre')}
                className={`flex items-center gap-2 pb-3 md:pb-4 relative transition-colors ${
                  activeTab === 'genre'
                    ? 'text-nxe-accent'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                data-testid="tab-genre"
              >
                <Headphones className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-sm md:text-base font-medium">Genre</span>
                {activeTab === 'genre' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-nxe-accent"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>

              <button
                onClick={() => setActiveTab('mood')}
                className={`flex items-center gap-2 pb-3 md:pb-4 relative transition-colors ${
                  activeTab === 'mood'
                    ? 'text-nxe-accent'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                data-testid="tab-mood"
              >
                <Heart className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-sm md:text-base font-medium">Suasana hati</span>
                {activeTab === 'mood' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-nxe-accent"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Track List - Responsive layout */}
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-center py-4"
            >
              {error}
            </motion.div>
          )}
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nxe-accent"></div>
            </div>
          ) : tracks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <Music className="h-12 w-12 md:h-16 md:w-16 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm md:text-base">Tidak ada lagu ditemukan</p>
            </motion.div>
          ) : (
            <div className="space-y-1 py-4 md:py-6">
              {tracks.map((track, index) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.3, 
                    delay: index * 0.05,
                    ease: "easeOut"
                  }}
                  whileHover={{ scale: 1.02 }}
                  className="flex items-center gap-3 md:gap-4 p-3 md:p-4 hover:bg-nxe-surface rounded-lg transition-colors cursor-pointer"
                  onClick={() => handleSelectTrack(track)}
                  data-testid={`track-item-${track.id}`}
                >
                  {/* Album Cover with Play Button */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={track.album.cover_medium}
                      alt={track.album.title}
                      className="w-14 h-14 md:w-16 md:h-16 rounded object-cover"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePlayPreview(track);
                      }}
                      className="absolute inset-0 bg-black/50 rounded flex items-center justify-center hover:bg-black/70 transition-colors"
                      data-testid={`button-preview-${track.id}`}
                    >
                      {playingTrackId === track.id ? (
                        <Pause className="h-6 w-6 md:h-7 md:w-7 text-white" />
                      ) : (
                        <Play className="h-6 w-6 md:h-7 md:w-7 text-white" />
                      )}
                    </button>
                  </div>

                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate text-sm md:text-base" data-testid={`text-track-title-${track.id}`}>
                      {track.title}
                    </h3>
                    <p className="text-sm md:text-base text-gray-400 truncate" data-testid={`text-track-artist-${track.id}`}>
                      {track.artist.name} · {formatDuration(track.duration)}
                    </p>
                  </div>

                  {/* Select Button with Green Ring */}
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectTrack(track);
                    }}
                    variant="ghost"
                    size="sm"
                    className="flex-shrink-0 text-nxe-accent hover:text-nxe-accent/80"
                    data-testid={`button-select-${track.id}`}
                  >
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-nxe-accent flex items-center justify-center transition-all hover:bg-nxe-accent/10">
                      <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-nxe-accent"></div>
                    </div>
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
