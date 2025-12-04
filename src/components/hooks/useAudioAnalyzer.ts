import { useEffect, useRef } from "react";

export const useAudioAnalyzer = (audioElement: HTMLAudioElement | null) => {
  const analyser = useRef<AnalyserNode | null>(null);
  const dataArray = useRef<Uint8Array | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const source = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    if (!audioElement) return;

    // Only create context once
    if (!audioContext.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContext.current = new AudioContextClass();
    }

    const ctx = audioContext.current;

    // Resume context if suspended (browser policy)
    const handleUserGesture = () => {
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
    };
    document.addEventListener('click', handleUserGesture);
    document.addEventListener('keydown', handleUserGesture);
    document.addEventListener('touchstart', handleUserGesture);

    // Create analyzer
    if (!analyser.current) {
      analyser.current = ctx.createAnalyser();
      analyser.current.fftSize = 512; // Controls detail (frequency bin count will be half this)
      const bufferLength = analyser.current.frequencyBinCount;
      dataArray.current = new Uint8Array(bufferLength);
    }

    // Connect audio element to analyzer
    if (!source.current) {
      // Check if source already exists to prevent errors on re-renders
      try {
        source.current = ctx.createMediaElementSource(audioElement);
        source.current.connect(analyser.current);
        analyser.current.connect(ctx.destination);
      } catch (err) {
        console.error("Error connecting audio source:", err);
      }
    }

    return () => {
        document.removeEventListener('click', handleUserGesture);
        document.removeEventListener('keydown', handleUserGesture);
        document.removeEventListener('touchstart', handleUserGesture);
        // We generally don't close the context immediately on unmount to avoid breaking re-mounts,
        // but we should disconnect if needed.
    };
  }, [audioElement]);

  const getFrequencyData = () => {
    if (analyser.current && dataArray.current) {
      analyser.current.getByteFrequencyData(dataArray.current);
      
      const sampleRate = audioContext.current?.sampleRate || 44100;
      const fftSize = analyser.current.fftSize; // 512
      const bufferLength = analyser.current.frequencyBinCount; // 256
      
      // Frequency per bin = sampleRate / fftSize
      // e.g. 44100 / 512 = ~86 Hz per bin
      // Bin 0: 0-86 Hz (Sub Bass)
      // Bin 1: 86-172 Hz (Bass)
      // Bin 2: 172-258 Hz (Upper Bass)
      // Bin 3...
      
      // Calculate averages for specific ranges
      // Bass: 20 - 250 Hz
      // Start at bin 0 (DC offset usually 0, but contains sub), go up to ~3
      const bassStart = 0;
      const bassEnd = Math.max(1, Math.floor(250 / (sampleRate / fftSize)));
      
      let bassSum = 0;
      let bassCount = 0;
      for(let i = bassStart; i <= bassEnd && i < bufferLength; i++) {
          bassSum += dataArray.current[i];
          bassCount++;
      }
      const bassAvg = bassCount > 0 ? bassSum / bassCount : 0;

      // Mid: 250 - 4000 Hz
      const midStart = bassEnd + 1;
      const midEnd = Math.max(midStart + 1, Math.floor(4000 / (sampleRate / fftSize)));
      
      let midSum = 0;
      let midCount = 0;
      for(let i = midStart; i <= midEnd && i < bufferLength; i++) {
          midSum += dataArray.current[i];
          midCount++;
      }
      const midAvg = midCount > 0 ? midSum / midCount : 0;
      
      // High: 4000+ Hz
      const highStart = midEnd + 1;
      
      let highSum = 0;
      let highCount = 0;
      for(let i = highStart; i < bufferLength; i++) {
          highSum += dataArray.current[i];
          highCount++;
      }
      const highAvg = highCount > 0 ? highSum / highCount : 0;
      
      // Calculate total average
      let sum = 0;
      for (let i = 0; i < dataArray.current.length; i++) {
        sum += dataArray.current[i];
      }
      const average = sum / dataArray.current.length;
      
      // CALCULATE 10 BANDS (LOGARITHMIC-ISH)
      // 256 bins total. ~86Hz per bin.
      // Ranges we want to cover approx:
      // 1: Sub Bass (20-60Hz)   -> bins 0-1
      // 2: Bass (60-250Hz)      -> bins 1-3
      // 3: Low Mid (250-500Hz)  -> bins 3-6
      // 4: Mid (500-2kHz)       -> bins 6-23
      // 5: Upper Mid (2k-4kHz)  -> bins 23-46
      // 6: Presence (4k-6kHz)   -> bins 46-70
      // 7: Brilliance (6k-20kHz)-> bins 70-256 (dump rest here)
      
      // Let's do a simplified log split for 10 bands
      // To allow high bands to move, we aggregate MASSIVE chunks of high frequencies into them.
      
      const frequencyBands: number[] = [];
      
      // Manual bin ranges (start, end) - handcrafted for 256 bin FFT @ 44.1k
      const ranges = [
          [0, 1],    // 0: Sub (0-86Hz)
          [1, 3],    // 1: Bass (86-250Hz)
          [3, 6],    // 2: Low Mid (250-500Hz)
          [6, 12],   // 3: Mid 1 (500-1kHz)
          [12, 24],  // 4: Mid 2 (1k-2kHz)
          [24, 48],  // 5: High Mid (2k-4kHz)
          [48, 96],  // 6: High 1 (4k-8kHz)
          [96, 150], // 7: High 2 (8k-13kHz)
          [150, 200],// 8: High 3 (13k-17kHz)
          [200, 256] // 9: Air (17k+)
      ];
      
      for(let i = 0; i < 10; i++) {
          const range = ranges[i];
          let bandSum = 0;
          let bandCount = 0;
          
          // Safety check for bounds
          const start = Math.min(range[0], bufferLength - 1);
          const end = Math.min(range[1], bufferLength);
          
          for(let j = start; j < end; j++) {
              bandSum += dataArray.current[j];
              bandCount++;
          }
          
          const val = bandCount > 0 ? bandSum / bandCount : 0;
          
          // Apply Pink Noise Compensation / Treble Boost
          const boost = 1.0 + (i * 0.3); 
          
          // Apply Power Function for Dynamic Range Expansion
          // Input 0.5 -> 0.5^3 = 0.125
          // Input 1.0 -> 1.0^3 = 1.0
          const normalizedVal = val / 255.0;
          const exponentialVal = Math.pow(normalizedVal, 3);
          
          frequencyBands.push(Math.min(1.0, exponentialVal * boost));
      }
      
      return {
        data: dataArray.current,
        average: average / 255.0,
        low: bassAvg / 255.0, 
        mid: midAvg / 255.0,
        high: highAvg / 255.0,
        frequencyBands // Array of 10 normalized values
      };
    }
    return { data: new Uint8Array(0), average: 0, low: 0, mid: 0, high: 0, frequencyBands: new Array(10).fill(0) };
  };

  return { getFrequencyData };
};

