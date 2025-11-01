'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/store'

interface MentionInputProps {
  value: string
  setValue: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

interface SearchUser {
  id: string
  username: string
  fullName?: string | null
  avatar?: string | null
  isVerified?: boolean
}

export default function MentionInput({
  value,
  setValue,
  placeholder = 'Yorum ekle...',
  disabled = false,
  className = '',
}: MentionInputProps) {
  const { accessToken } = useAuthStore()
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionPosition, setMentionPosition] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // User search query
  const { data: suggestions = [], isLoading: isSearching } = useQuery<SearchUser[]>({
    queryKey: ['mention-search', mentionQuery],
    queryFn: async () => {
      if (!mentionQuery.trim() || !accessToken) return []
      const response = await api.get('/search/users', {
        params: { q: mentionQuery.trim(), limit: 5 },
      })
      return response.data
    },
    enabled: !!mentionQuery.trim() && !!accessToken && showSuggestions,
    staleTime: 0,
  })

  // Detect @mention in input
  useEffect(() => {
    const cursorPos = inputRef.current?.selectionStart || 0
    const textBeforeCursor = value.substring(0, cursorPos)
    const match = textBeforeCursor.match(/@(\w*)$/)

    if (match && !disabled) {
      setMentionQuery(match[1])
      setShowSuggestions(true)
      setMentionPosition(cursorPos - match[1].length - 1) // -1 for @
    } else {
      setShowSuggestions(false)
      setMentionQuery('')
    }
  }, [value, disabled])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (username: string) => {
    const cursorPos = inputRef.current?.selectionStart || 0
    const textBeforeCursor = value.substring(0, cursorPos)
    const textAfterCursor = value.substring(cursorPos)

    // Find the last @ and replace everything after it
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    if (lastAtIndex !== -1) {
      const beforeMention = value.substring(0, lastAtIndex)
      const newValue = `${beforeMention}@${username} ${textAfterCursor}`
      setValue(newValue)
      setShowSuggestions(false)

      // Focus back to input and set cursor position
      setTimeout(() => {
        inputRef.current?.focus()
        const newCursorPos = lastAtIndex + username.length + 2 // +2 for @ and space
        inputRef.current?.setSelectionRange(newCursorPos, newCursorPos)
      }, 10)
    }
  }

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff7b00]/20 focus:border-[#ff7b00] text-sm transition-all w-full ${className}`}
      />

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute bottom-full mb-1 bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-lg shadow-xl rounded-xl w-full max-h-48 overflow-y-auto border border-gray-200/70 dark:border-gray-700/40 z-50"
        >
          {isSearching ? (
            <div className="px-3 py-4 text-center">
              <div className="w-5 h-5 border-2 border-[#ff7b00] border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 text-center">
              Kullanıcı bulunamadı
            </div>
          ) : (
            suggestions.map((user) => (
              <div
                key={user.id}
                onClick={() => handleSelect(user.username)}
                className="px-3 py-2 text-sm hover:bg-orange-50 dark:hover:bg-orange-500/10 cursor-pointer transition-colors flex items-center gap-2"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                      {user.username[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    @{user.username}
                    {user.isVerified && (
                      <span className="ml-1 text-blue-500">✓</span>
                    )}
                  </p>
                  {user.fullName && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user.fullName}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

