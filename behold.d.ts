import 'react'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'behold-widget': { 'feed-id'?: string; [key: string]: unknown }
    }
  }
}
