export interface BackgroundPreset {
  id: string
  label: string
  thumbnailUrl: string
  roomAesthetic: string
  roomColors: string
  roomElements: string
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: 'bg-bedroom-dark',
    label: 'Dark Bedroom',
    thumbnailUrl: 'https://placehold.co/300x200/1a1a1a/ffffff?text=Dark+Bedroom',
    roomAesthetic: 'masculine streetwear',
    roomColors: 'black and dark grey',
    roomElements: 'low-profile bed with black sheets, dark round shag rug, open black clothes rack with streetwear jackets, warm LED strips behind shelves, minimalist black-framed posters',
  },
  {
    id: 'bg-minimal-white',
    label: 'White Minimal',
    thumbnailUrl: 'https://placehold.co/300x200/f5f5f5/333333?text=White+Minimal',
    roomAesthetic: 'minimalist',
    roomColors: 'all white with light oak accents',
    roomElements: 'white walls, light oak floating shelves, small potted plant, white linen bed, soft natural light from window',
  },
  {
    id: 'bg-luxury-suite',
    label: 'Luxury Suite',
    thumbnailUrl: 'https://placehold.co/300x200/2a2218/d4af37?text=Luxury+Suite',
    roomAesthetic: 'luxury',
    roomColors: 'deep navy and gold',
    roomElements: 'velvet armchair, marble side table, large gilded mirror, floor-length curtains, ambient chandelier lighting',
  },
  {
    id: 'bg-studio-grey',
    label: 'Studio',
    thumbnailUrl: 'https://placehold.co/300x200/555555/ffffff?text=Studio',
    roomAesthetic: 'minimalist studio',
    roomColors: 'medium grey',
    roomElements: 'seamless grey backdrop, soft studio lighting, clean and uncluttered, professional photography setup',
  },
  {
    id: 'bg-loft-industrial',
    label: 'Industrial Loft',
    thumbnailUrl: 'https://placehold.co/300x200/2d2d2d/aaaaaa?text=Industrial+Loft',
    roomAesthetic: 'industrial',
    roomColors: 'exposed brick, steel grey, and warm wood',
    roomElements: 'exposed brick wall, metal shelving unit, worn leather sofa, Edison bulb pendant lights, large factory windows',
  },
  {
    id: 'bg-feminine-pink',
    label: 'Feminine Glam',
    thumbnailUrl: 'https://placehold.co/300x200/f9d0d8/ffffff?text=Feminine+Glam',
    roomAesthetic: 'feminine',
    roomColors: 'blush pink and white',
    roomElements: 'tufted white bed with pink cushions, vanity mirror with round bulb lights, fluffy rug, fresh flowers in a vase, fairy lights',
  },
  {
    id: 'bg-gym-fitness',
    label: 'Gym',
    thumbnailUrl: 'https://placehold.co/300x200/1a1a2e/4fc3f7?text=Gym',
    roomAesthetic: 'athletic fitness',
    roomColors: 'dark navy and electric blue',
    roomElements: 'rubber flooring, weight rack in background, large mirror wall, modern gym equipment, dramatic downlighting',
  },
  {
    id: 'bg-beige-warm',
    label: 'Warm Boho',
    thumbnailUrl: 'https://placehold.co/300x200/e8dcc8/6b5344?text=Warm+Boho',
    roomAesthetic: 'warm boho',
    roomColors: 'warm beige and terracotta',
    roomElements: 'rattan furniture, macrame wall hanging, terracotta pots, woven rug, warm candle-like lighting, dried pampas grass',
  },
]
