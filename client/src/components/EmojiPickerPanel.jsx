import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'

// Loaded lazily from ReactionBar so the emoji dataset stays out of the main bundle.
export default function EmojiPickerPanel({ onSelect }) {
  return (
    <Picker
      data={data}
      theme="dark"
      previewPosition="none"
      onEmojiSelect={(e) => onSelect(e.native)}
    />
  )
}
