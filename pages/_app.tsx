// pages/_app.tsx
import { AppProps } from "next/app";
import "../styles/index.scss";

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default MyApp;
