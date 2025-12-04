import React, { useEffect, useRef, useState } from "react";
import styles from './AudioControls.module.scss';

interface AudioControlsProps {
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
}

const AudioControls: React.FC<AudioControlsProps> = ({ audioRef }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);

  useEffect(() => {
    if(audioRef.current) {
        audioRef.current.volume = volume;
        // Try to autoplay
        audioRef.current.play().then(() => {
            setIsPlaying(true);
        }).catch(e => {
            console.log("Autoplay blocked, user interaction needed");
            setIsPlaying(false);
        });
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

  return (
    <div className={styles.container}>
      <button onClick={togglePlay} className={styles.playButton}>
        {isPlaying ? "PAUSE" : "PLAY"}
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
  );
};

export default AudioControls;

