import { ImageResponse } from 'next/og'

export const size = {
  width: 512,
  height: 512,
}

export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #fff3ca 0%, #f0ba54 28%, #588eff 100%)',
          color: '#132e52',
          fontSize: 230,
          fontWeight: 900,
          borderRadius: 112,
          boxShadow: 'inset 0 0 0 22px rgba(255,255,255,0.28)',
          letterSpacing: '-0.12em',
        }}
      >
        N
      </div>
    ),
    size,
  )
}
