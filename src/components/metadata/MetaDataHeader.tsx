import Head from 'next/head'
import {useRouter} from 'next/router'

type MetaDataHeaderProps = {
  content?: string
  image?: string
  title?: string
  noIndex?: boolean
}

const DEFAULT_DESCRIPTION = 'Aaron J. Cunningham is a frontend developer specializing in metaverse & web3 using Three.js, R3F, Next.js & React.'
const DEFAULT_IMAGE = 'https://aaronjcunningham.com/images/meta-image.png'

const MetaDataHeader = ({
  content = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  title = 'home',
  noIndex = false,
}: MetaDataHeaderProps) => {
  const router = useRouter()
  const canonicalUrl = (
    'https://aaronjcunningham.com' + (router.asPath === '/' ? '' : router.asPath)
  ).split('?')[0]
  const pageTitle = `${title} - Aaron J. Cunningham`
  const description = content || DEFAULT_DESCRIPTION
  const socialImage = image || DEFAULT_IMAGE

  return (
    <Head>
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      {noIndex && <meta name="robots" content="noindex" />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={socialImage} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={pageTitle} key="title" />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={socialImage} />
      <meta property="og:type" content="website" />
      <meta name="yandex-verification" content="b1955c77c853f21f" />
      <link rel="canonical" href={canonicalUrl} />
      <link rel="apple-touch-icon" sizes="76x76" href="/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="manifest" href="/site.webmanifest" />
      <meta name="msapplication-TileColor" content="#da532c" />
      <meta name="theme-color" content="#030304" />
      <meta name="yandex-verification" content="8d5b06a83511cd21" />
    </Head>
  )
}

export default MetaDataHeader
