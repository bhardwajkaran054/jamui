declare module 'canvas-confetti' {
  interface Options {
    particleCount?: number
    spread?: number
    origin?: { x?: number; y?: number }
    colors?: string[]
    ticks?: number
    gravity?: number
    scalar?: number
    shapes?: ('square' | 'circle')[]
    starPoints?: number
  }

  function confetti(options?: Options): Promise<null>

  export default confetti
}
