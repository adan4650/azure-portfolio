import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

export function ArrowUpRight(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" {...props}><path d="M6 18 18 6M6 6h12v12" /></svg>
}

export function ArrowRight(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}><path d="M4 12h15m-6-6 6 6-6 6" /></svg>
}

export function CloudIcon(props: IconProps) {
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}><path d="M9 24a6 6 0 0 1-.6-12A9 9 0 0 1 26 13.2 5.5 5.5 0 0 1 25 24H9Z" /><path d="m13 17 3 3 5-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

export function CheckIcon(props: IconProps) {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" {...props}><circle cx="10" cy="10" r="7.5" /><path d="m6.8 10 2.1 2.1 4.4-4.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

export function VideoIcon(props: IconProps) {
  return <svg viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}><rect x="4" y="7" width="28" height="22" rx="4" /><path d="m15 13 9 5-9 5V13Z" fill="currentColor" stroke="none" /></svg>
}

export function ReplayIcon(props: IconProps) {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true" {...props}><path d="M4.4 7a6 6 0 1 1-.3 5.3M4.2 3.6V7h3.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
