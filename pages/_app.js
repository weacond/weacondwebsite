import '../styles/globals.css'
import { LanguageProvider } from '../contexts/LanguageContext'

export default function App({ Component, pageProps }) {
  return (
    <LanguageProvider>
      <Component {...pageProps} />
    </LanguageProvider>
  )
}
