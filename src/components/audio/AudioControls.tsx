import React, { useEffect, useState } from "react";
import { FaPlay, FaPause, FaChevronDown } from 'react-icons/fa';

interface AudioControlsProps {
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
}

const SONGS = [
  {
    title: "Messerangriff - Toeten im Namen Gottes (SINS Remix)",
    path: "/songs/Messerangriff_Toten_im_Namen_Gottes_SINS_Remix.mp3"
  },
  {
    title: "Messerangriff - Jung Sterben (Fentanyl Remix)",
    path: "/songs/Messerangriff - Jung Sterben (Fentanyl Remix).mp3"
  }
];

const AudioControls: React.FC<AudioControlsProps> = ({ audioRef }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);

  useEffect(() => {
    if(audioRef.current) {
        audioRef.current.volume = volume;
        // Check play state periodically in case of external changes
        const interval = setInterval(() => {
            if (audioRef.current) {
                setIsPlaying(!audioRef.current.paused);
            }
        }, 500);
        return () => clearInterval(interval);
    }
  }, [audioRef]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play();
        setIsPlaying(true);
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleSongChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const index = parseInt(e.target.value);
      setCurrentSongIndex(index);
      
      if (audioRef.current) {
          const wasPlaying = !audioRef.current.paused;
          audioRef.current.src = SONGS[index].path;
          if (wasPlaying) {
              audioRef.current.play();
          }
      }
  };

  return (
    <div className="audio-controls">
      <div className="audio-controls__row">
          <button onClick={togglePlay} className="audio-controls__play-button">
            {isPlaying ? <FaPause /> : <FaPlay />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="audio-controls__volume-slider"
          />
      </div>
      
      <div className="audio-controls__select-container">
        <select 
          className="audio-controls__song-select" 
          value={currentSongIndex} 
          onChange={handleSongChange}
        >
            {SONGS.map((song, index) => (
                <option key={index} value={index}>
                    {song.title}
                </option>
            ))}
        </select>
        <FaChevronDown className="audio-controls__select-icon" />
      </div>
    </div>
  );
};

export default AudioControls;
