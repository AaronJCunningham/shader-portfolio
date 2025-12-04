import dynamic from "next/dynamic";
import { Suspense, useEffect, useState, useRef } from "react";
import { Loader } from "@react-three/drei";
import AudioControls from "@/components/audio/AudioControls";

const MusicVisualizerScene = dynamic(() => import("@/components/threejscomponents/scenes/MusicVisualizerScene"), {
  ssr: false,
});

const Canvas = dynamic(() => import("@react-three/fiber").then((mod) => mod.Canvas), {
  ssr: false,
});

export default function MusicVisualizerPage() {
  const [isMounted, setIsMounted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
    // Create audio element on client only
    audioRef.current = new Audio("/songs/Messerangriff - Jung Sterben (Fentanyl Remix).mp3");
    audioRef.current.loop = true;
    audioRef.current.crossOrigin = "anonymous";
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (!isMounted) {
    return <div style={{ width: "100vw", height: "100vh", position: "fixed", top: 0, left: 0, zIndex: 1, background: 'black' }} />;
  }

  return (
    <div style={{ width: "100vw", height: "100vh", position: "fixed", top: 0, left: 0, zIndex: 1, background: 'black' }}>
      <AudioControls audioRef={audioRef} />
      <Canvas>
        <Suspense fallback={null}>
           <MusicVisualizerScene audioRef={audioRef} />
        </Suspense>
      </Canvas>
      <Loader />
    </div>
  );
}

