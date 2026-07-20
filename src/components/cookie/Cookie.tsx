import {useEffect, useState} from 'react'
import Link from 'next/link'
import Script from 'next/script'
import CookieConsent, {getCookieConsentValue} from 'react-cookie-consent'

const CONSENT_COOKIE = 'portfolioAnalyticsConsent'
const ANALYTICS_ID = 'G-363JP1BQ7R'

const Cookie = () => {
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false)

  useEffect(() => {
    setAnalyticsEnabled(getCookieConsentValue(CONSENT_COOKIE) === 'true')
  }, [])

  return (
    <>
      {analyticsEnabled && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${ANALYTICS_ID}', { anonymize_ip: true });
            `}
          </Script>
        </>
      )}

      <CookieConsent
        location="none"
        buttonText="Accept"
        declineButtonText="Decline"
        cookieName={CONSENT_COOKIE}
        expires={150}
        enableDeclineButton
        disableStyles
        containerClasses="cookie-consent"
        contentClasses="cookie-consent__content"
        buttonWrapperClasses="cookie-consent__actions"
        buttonClasses="cookie-consent__button cookie-consent__button--accept"
        declineButtonClasses="cookie-consent__button cookie-consent__button--decline"
        ariaAcceptLabel="Accept analytics cookies"
        ariaDeclineLabel="Decline analytics cookies"
        onAccept={() => setAnalyticsEnabled(true)}
        onDecline={() => setAnalyticsEnabled(false)}
      >
        <span className="cookie-consent__index">{'// PRIVACY'}</span>
        <span>
          Optional analytics help improve this portfolio.{' '}
          <Link href="/datenschutz">Details</Link>
        </span>
      </CookieConsent>
    </>
  )
}

export default Cookie
