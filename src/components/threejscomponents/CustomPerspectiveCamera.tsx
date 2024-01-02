import { useThree, useFrame,  } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';

function CustomPerspectiveCamera() {
  const { size } = useThree();
  const aspectRatio = size.width / size.height;

  // Update camera settings here if needed
  useFrame(({ camera }) => {
    // camera.aspect = aspectRatio;
    camera.updateProjectionMatrix();
  });

  return (
    <PerspectiveCamera makeDefault fov={75} aspect={aspectRatio} near={0.1} far={1000} />
  );
}

export default CustomPerspectiveCamera;