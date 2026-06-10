/// <reference types="vite/client" />

// @emoji-mart/react ships no type declarations
declare module '@emoji-mart/react' {
  import type { ComponentType } from 'react'

  interface EmojiMartEmoji {
    id: string
    native: string
    shortcodes: string
  }

  interface PickerProps {
    data: unknown
    theme?: 'light' | 'dark' | 'auto'
    previewPosition?: 'top' | 'bottom' | 'none'
    onEmojiSelect?: (emoji: EmojiMartEmoji) => void
  }

  const Picker: ComponentType<PickerProps>
  export default Picker
}

declare module '@emoji-mart/data' {
  const data: unknown
  export default data
}
