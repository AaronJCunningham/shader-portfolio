import React, { useRef, useEffect } from 'react';
import { useThree, extend } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera } from '@react-three/drei';
import { OrthographicCamera as OrthographicCameraType } from 'three';

const CustomCamera: React.FC = () => {
  const camera = useRef<OrthographicCameraType>(null!);
  const { size, viewport } = useThree();
  console.log("SIZE", size, viewport.width)

  useEffect(() => {
    if (camera.current) {
      const aspect = viewport.width / viewport.height;
      const zoomLevel = 1; // Adjust this value to control zoom

      // camera.current.left = -viewport.width / zoomLevel / 2;
      // camera.current.right = viewport.width / zoomLevel / 2;
      // camera.current.top = viewport.height / zoomLevel / 2;
      // camera.current.bottom = -viewport.height / zoomLevel / 2;

      // Optionally, adjust camera position and lookAt here
      // camera.current.position.set(x, y, z);
      // camera.current.lookAt(new THREE.Vector3(x, y, z));

      camera.current.updateProjectionMatrix();
    }
  }, [size]);

  return (
    <>
      <OrthographicCamera ref={camera} args={[-5, 5, 5, -5, -10, 10]}  makeDefault />
    <OrbitControls />
    </>
  );
};

export default CustomCamera;
