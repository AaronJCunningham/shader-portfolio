// pages/_app.tsx
import { AppProps } from "next/app";
import { Inter } from "next/font/google";
import "../styles/index.scss";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div className={`${inter.variable} ${inter.className}`}>
      <Component {...pageProps} />
    </div>
  );
}

export default MyApp;
