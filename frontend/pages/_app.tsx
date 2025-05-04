import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { useEffect } from 'react'

export default function App({ Component, pageProps }: AppProps) {
  // Initialize mermaid on the client side
  useEffect(() => {
    import('mermaid').then((mermaid) => {
      mermaid.default.initialize({
        startOnLoad: true,
        theme: 'default',
        securityLevel: 'loose',
      })
      
      // Re-process mermaid diagrams on page load
      setTimeout(() => {
        mermaid.default.run()
      }, 300)
    })
  }, [])

  return <Component {...pageProps} />
} 