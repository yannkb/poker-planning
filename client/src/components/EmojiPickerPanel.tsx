import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'

interface EmojiPickerPanelProps {
  onSelect: (emoji: string) => void
}

// Loaded lazily so the emoji dataset stays out of the main bundle.
export default function EmojiPickerPanel({ onSelect }: EmojiPickerPanelProps) {
  return (
    <Picker
      data={data}
      theme="dark"
      previewPosition="none"
      onEmojiSelect={(emoji) => onSelect(emoji.native)}
    />
  )
}
