// pages/_app.tsx
import { AppProps } from "next/app";
import { JetBrains_Mono } from "next/font/google";
import "../styles/index.scss";

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["100", "200", "300", "400"],
});

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div className={jetbrains.className}>
      <Component {...pageProps} />
    </div>
  );
}

export default MyApp;
