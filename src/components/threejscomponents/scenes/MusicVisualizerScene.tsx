import * as THREE from "three";
import { useRef, useMemo } from "react";
import { useFrame, useThree, useLoader } from "@react-three/fiber";
import vertexShader from "../shaders/musicVisualizer/vertex.glsl.js";
import fragmentShader from "../shaders/musicVisualizer/fragment.glsl.js";
import { useAudioAnalyzer } from "@/components/hooks/useAudioAnalyzer";

interface MusicVisualizerSceneProps {
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
}

const MusicVisualizerScene: React.FC<MusicVisualizerSceneProps> = ({ audioRef }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { viewport } = useThree();
  const { getFrequencyData } = useAudioAnalyzer(audioRef.current);
  
  const texture = useLoader(THREE.TextureLoader, "/images/messerangriff.png");

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(viewport.width, viewport.height) },
      uImageResolution: { value: new THREE.Vector2(1000, 1000) }, 
      uFrequency: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uHigh: { value: 0 },
    }),
    [texture, viewport.width, viewport.height]
  );

  // Create 10 bars
  const bars = useMemo(() => {
      const barWidth = (viewport.width * 0.8) / 10;
      return new Array(10).fill(0).map((_, i) => ({
          position: [
              (i - 4.5) * (barWidth + 0.2), 
              -viewport.height / 3, // Move down a bit
              0
          ] as [number, number, number],
          key: i
      }));
  }, [viewport.width, viewport.height]);

  useFrame(({ clock }) => {
    const audioData = getFrequencyData();
    
    if (audioData.frequencyBands) {
        // Update Bars
        if (groupRef.current) {
            groupRef.current.children.forEach((child, i) => {
                if (child instanceof THREE.Mesh) {
                    const value = audioData.frequencyBands![i];
                    const multiplier = 2.5;
                    const targetHeight = 0.1 + value * multiplier; 
                    child.scale.y = THREE.MathUtils.lerp(child.scale.y, targetHeight, 0.3);
                    child.position.y = -viewport.height / 3 + (targetHeight * 0.5) / 2; 
                }
            });
        }

        // Update Shader Uniforms
        if (shaderRef.current) {
            shaderRef.current.uniforms.uTime.value = clock.getElapsedTime();
            
            // Map distortion to average of bars 3-7 (Low Mids to High Mids)
            // Indices 2, 3, 4, 5, 6
            const midRangeEnergy = (
                audioData.frequencyBands[2] + 
                audioData.frequencyBands[3] + 
                audioData.frequencyBands[4] + 
                audioData.frequencyBands[5] + 
                audioData.frequencyBands[6]
            ) / 5.0;
            
            // Map 2nd band from left (index 1) to Chromatic Aberration
            // Multiply it so it triggers strongly
            const kickForAberration = audioData.frequencyBands[1] * 2.0;

            shaderRef.current.uniforms.uBass.value = THREE.MathUtils.lerp(
                shaderRef.current.uniforms.uBass.value,
                midRangeEnergy,
                0.1
            );
            
            // Pass Kick to uHigh (which controls aberration in shader)
            shaderRef.current.uniforms.uHigh.value = THREE.MathUtils.lerp(
                shaderRef.current.uniforms.uHigh.value,
                kickForAberration,
                0.1
            );
        }
    }
  });

  return (
    <>
    <mesh ref={meshRef} position={[0, 0, -1]}> {/* Push image back slightly */}
      <planeGeometry args={[viewport.width, viewport.height, 50, 50]} />
      <shaderMaterial
        ref={shaderRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        wireframe={false} 
      />
    </mesh>
    
    <group ref={groupRef}>
        {bars.map((bar) => (
            <mesh key={bar.key} position={bar.position}>
                <boxGeometry args={[(viewport.width * 0.8) / 12, 1, 1]} />
                <meshBasicMaterial color="white" transparent opacity={0.8} />
            </mesh>
        ))}
    </group>
    </>
  );
};

export default MusicVisualizerScene;

