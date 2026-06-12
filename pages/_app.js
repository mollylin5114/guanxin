import '../styles/globals.css'
import { Analytics } from '@vercel/analytics/react'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect } from 'react'

if (typeof window !== 'undefined') {
  posthog.init('phc_xx9WQoWNfH4SX28J2LNpg9R2NxUf4VnJHxzTmEg6ZRj4', {
    api_host: 'https://app.posthog.com',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false,
  })
}

export default function App({ Component, pageProps }) {
  return (
    <PostHogProvider client={posthog}>
      <Component {...pageProps} />
      <Analytics />
    </PostHogProvider>
  )
}
