import { useId } from "react"

import { cn } from "@/lib/utils"

type MemcachedIconProps = {
  className?: string
}

/** Memcached mark (Iconify `logos:memcached`). No official SVG exists. */
export function MemcachedIcon({ className }: MemcachedIconProps) {
  const id = useId()
  const eyeL = `${id}-eye-l`
  const eyeR = `${id}-eye-r`
  const body = `${id}-body`
  const letter = `${id}-letter`

  return (
    <svg
      viewBox="0 0 254 254"
      role="img"
      aria-label="Memcached"
      className={cn("size-4 shrink-0", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Memcached</title>
      <defs>
        <radialGradient id={eyeL} cx="41.406%" cy="42.708%" r="50%">
          <stop offset="0%" stopColor="#db7c7c" />
          <stop offset="100%" stopColor="#c83737" />
        </radialGradient>
        <radialGradient id={eyeR} cx="44.271%" cy="42.708%" r="50%">
          <stop offset="0%" stopColor="#db7c7c" />
          <stop offset="100%" stopColor="#c83737" />
        </radialGradient>
        <linearGradient id={body} x1="50%" x2="50%" y1="100%" y2="0%">
          <stop offset="0%" stopColor="#574c4a" />
          <stop offset="100%" stopColor="#80716d" />
        </linearGradient>
        <linearGradient id={letter} x1="88.778%" x2="30.149%" y1="98.342%" y2="-8.68%">
          <stop offset="0%" stopColor="#268d83" />
          <stop offset="100%" stopColor="#2ea19e" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${body})`}
        d="M0 171.19V82.17C0 10.271 10.26 0 82.086 0h89.189C243.1 0 253.36 10.271 253.36 82.171v89.019c0 71.9-10.26 82.17-82.086 82.17H82.086C10.261 253.36 0 243.09 0 171.19"
      />
      <g transform="translate(45.79 47.098)">
        <path
          fill={`url(#${letter})`}
          d="M8.891.655C-3.562 79.583 2.953 153.48 2.953 153.48h38.928c-3.704-19.704-16.992-109.724-5.938-110.021c5.924.94 32.99 76.371 32.99 76.371s5.96-.742 11.958-.742s11.959.742 11.959.742s27.066-75.43 32.99-76.371c11.053.297-2.235 90.317-5.938 110.02h38.927s6.516-73.896-5.938-152.824H116.85C109.99.736 83.89 46.51 80.891 46.51S51.792.736 44.932.655z"
        />
        <path fill={`url(#${eyeL})`} d="M73.214 144.267a9.213 9.213 0 1 1-18.427 0a9.213 9.213 0 1 1 18.427 0" />
        <path fill={`url(#${eyeR})`} d="M106.995 144.267a9.213 9.213 0 1 1-18.426 0a9.213 9.213 0 1 1 18.426 0" />
      </g>
    </svg>
  )
}
