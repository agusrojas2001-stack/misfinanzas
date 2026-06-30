import { createContext, useContext } from 'react'
export const KeyboardContext = createContext(false)
export const useKeyboard = () => useContext(KeyboardContext)
