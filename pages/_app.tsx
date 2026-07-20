// pages/_app.tsx
import { AppProps } from "next/app";
import { Inter, JetBrains_Mono } from "next/font/google";
import "../styles/index.scss";

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["100", "200", "300", "400"],
});

const display = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div className={`${jetbrains.className} ${display.variable}`}>
      <Component {...pageProps} />
    </div>
  );
}

export default MyApp;
