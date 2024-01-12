import React, { MutableRefObject, useEffect, useRef } from "react";
import Lottie, { LottieComponentProps, LottieRefCurrentProps } from "lottie-react";
import loadingAnimation from "./loading.json";
import { useLoadingProgress } from "@/store";

const Loader = () => {
    const lottieRef = useRef<MutableRefObject<LottieRefCurrentProps | null>>(null)
    
    const [loadingProgress, setLoadingProgress] = useLoadingProgress((state) => [
        state.loadingProgress,
        state.setLoadingProgress,
      ]);
      
    useEffect(() => {
        if(!lottieRef.current) return;
        //@ts-ignore
        // lottieRef.current.goToAndStop(loadingProgress);
    },[loadingProgress])



    return (
        <div className="fixed inset-0 z-50 flex justify-center items-center w-[50%] m-auto h-full bg-black">
            {/* @ts-ignore */}
            <Lottie lottieRef={lottieRef} animationData={loadingAnimation} loop={false}   />
        </div>
    );
};

export default Loader;
