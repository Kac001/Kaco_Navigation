import { ImageResponse } from 'next/og'

export const size = {
  width: 180,
  height: 180,
}

export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f7e4a7 0%, #d8874f 45%, #3561d9 100%)',
          color: '#143055',
          fontSize: 72,
          fontWeight: 800,
          borderRadius: 36,
          letterSpacing: '-0.08em',
        }}
      >
        NAV
      </div>
    ),
    size,
  )
}
