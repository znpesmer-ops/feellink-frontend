'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface OnboardingStep {
  id: string
  target: string // CSS selector
  message: string
  position: 'top' | 'bottom' | 'left' | 'right'
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'explore',
    target: 'a[href="/explore"]',
    message: 'Etkinlikleri ve deneyimleri burada keşfet.',
    position: 'bottom'
  },
  {
    id: 'interaction',
    target: '.like-btn, button[class*="like"]',
    message: 'Bir etkinliğe duygu bırak – sadece izleme.',
    position: 'top'
  },
  {
    id: 'events',
    target: 'a[href="/events"]',
    message: 'Kendi etkinliğini oluştur veya katıl.',
    position: 'bottom'
  }
]

export function Onboarding() {
  const [currentStep, setCurrentStep] = useState<number | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    // LocalStorage kontrolü
    const hasSeenOnboarding = localStorage.getItem('feellink_onboarded')
    if (hasSeenOnboarding) {
      return
    }

    // İlk adımı göster
    setTimeout(() => {
      showStep(0)
    }, 500)
  }, [])

  const showStep = (stepIndex: number) => {
    if (stepIndex >= onboardingSteps.length) {
      // Onboarding tamamlandı
      localStorage.setItem('feellink_onboarded', 'true')
      setCurrentStep(null)
      setTooltipPosition(null)
      return
    }

    const step = onboardingSteps[stepIndex]
    const element = document.querySelector(step.target)

    if (!element) {
      // Element bulunamadı, bir sonraki adıma geç
      showStep(stepIndex + 1)
      return
    }

    const rect = element.getBoundingClientRect()
    let top = 0
    let left = 0

    switch (step.position) {
      case 'top':
        top = rect.top - 60
        left = rect.left + rect.width / 2
        break
      case 'bottom':
        top = rect.bottom + 12
        left = rect.left + rect.width / 2
        break
      case 'left':
        top = rect.top + rect.height / 2
        left = rect.left - 200
        break
      case 'right':
        top = rect.top + rect.height / 2
        left = rect.right + 12
        break
    }

    setTooltipPosition({ top, left })
    setCurrentStep(stepIndex)
  }

  const handleNext = () => {
    if (currentStep !== null) {
      showStep(currentStep + 1)
    }
  }

  const handleSkip = () => {
    localStorage.setItem('feellink_onboarded', 'true')
    setCurrentStep(null)
    setTooltipPosition(null)
  }

  if (currentStep === null || !tooltipPosition) {
    return null
  }

  const step = onboardingSteps[currentStep]

  return (
    <div
      className="onboard-tooltip fixed z-[1000]"
      style={{
        top: `${tooltipPosition.top}px`,
        left: `${tooltipPosition.left}px`,
        transform: 'translateX(-50%)'
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-gray-900 dark:text-gray-100 font-medium flex-1">
          {step.message}
        </p>
        <button
          onClick={handleSkip}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {currentStep + 1} / {onboardingSteps.length}
        </span>
        <button
          onClick={handleNext}
          className="px-3 py-1.5 bg-brand-orange hover:bg-brand-orange/90 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {currentStep === onboardingSteps.length - 1 ? 'Anladım' : 'Sonraki'}
        </button>
      </div>
    </div>
  )
}

