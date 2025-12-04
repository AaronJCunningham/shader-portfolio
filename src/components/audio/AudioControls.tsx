import React, { useEffect, useState } from "react";
import styles from './AudioControls.module.scss';
import { FaPlay, FaPause, FaChevronDown } from 'react-icons/fa';

interface AudioControlsProps {
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
}

const SONGS = [
  {
    title: "Messerangriff - Jung Sterben (Fentanyl Remix)",
    path: "/songs/Messerangriff - Jung Sterben (Fentanyl Remix).mp3"
  },
  {
    title: "Messerangriff - Toeten im Namen Gottes (SINS Remix)",
    path: "/songs/Messerangriff_Toten_im_Namen_Gottes_SINS_Remix.mp3"
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
    <div className={styles.container}>
      <div className={styles.controlsRow}>
          <button onClick={togglePlay} className={styles.playButton}>
            {isPlaying ? <FaPause /> : <FaPlay />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className={styles.volumeSlider}
          />
      </div>
      
      <div className={styles.selectContainer}>
        <select 
          className={styles.songSelect} 
          value={currentSongIndex} 
          onChange={handleSongChange}
        >
            {SONGS.map((song, index) => (
                <option key={index} value={index}>
                    {song.title}
                </option>
            ))}
        </select>
        <FaChevronDown className={styles.selectIcon} />
      </div>
    </div>
  );
};

export default AudioControls;

