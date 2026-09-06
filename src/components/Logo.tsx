export default function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className="shrink-0"
      aria-hidden="true"
    >
      <circle cx="27" cy="30" r="13" fill="#b0523a" />
      <circle cx="42" cy="28" r="10" fill="#3f5a4b" opacity="0.88" />
      <circle cx="32" cy="45" r="7" fill="#d9c6a8" />
    </svg>
  )
}
