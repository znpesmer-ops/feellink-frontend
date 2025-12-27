'use client'

import { useState, useEffect } from 'react'
import type React from 'react'
import { Settings, Shield, Database, Palette, Info } from 'lucide-react'
import { SettingsModal } from '@/components/admin/SettingsModal'
import api from '@/lib/api'
import toast from 'react-hot-toast'

type ModalKey = 'siteName' | 'siteDescription' | 'adminEmail' | null

export default function AdminSettingsPage() {
  const [modal, setModal] = useState<ModalKey>(null)
  const [settings, setSettings] = useState({
    siteName: 'Feellink',
    siteDescription: 'Modern sosyal medya platformu',
    adminEmail: 'admin@feellink.com',
  })
  const [isLoading, setIsLoading] = useState(false)

  // 🔒 İlk yüklemede database'den gerçek değerleri çek
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true)
        const res = await api.get('/admin/settings')
        if (res.data?.success && res.data?.data) {
          setSettings((prev) => ({
            ...prev,
            ...res.data.data,
          }))
        }
      } catch (error) {
        console.error('Ayarlar yüklenemedi:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const handleSave = async (key: string, value: string) => {
    try {
      // 🔒 KRİTİK: Response kontrolü - success flag olmadan toast gösterme
      const res = await api.patch(`/admin/settings/${key}`, { value })
      
      // ✅ DB yazıldı mı kontrol et
      if (!res.data?.success) {
        throw new Error('Güncelleme başarısız - backend success flag false')
      }

      // ✅ Kesin commit oldu - state güncelle
      const updatedValue = res.data?.data?.value || value
      setSettings((prev) => ({ ...prev, [key]: updatedValue }))
      
      // ✅ Toast sadece DB yazıldıktan sonra
      toast.success('Ayar başarıyla güncellendi')
    } catch (error: any) {
      console.error('Ayar güncellenemedi:', error)
      toast.error(error.response?.data?.message || error.message || 'Ayar güncellenemedi')
      throw error
    }
  }

  // 🔒 Feature Flags - Gizlenecek bölümler (ileride tek satırla geri açılabilir)
  const featureFlags = {
    adminSecuritySettings: false, // Güvenlik bölümü
    adminDatabaseSettings: false, // Veritabanı bölümü
    adminDesignSettings: false,   // Tasarım bölümü
  }

  const settingsCategories = [
    {
      key: 'general',
      title: 'Genel Ayarlar',
      icon: Settings,
      items: [
        { label: 'Site Adı', value: settings.siteName, editable: true, key: 'siteName' },
        { label: 'Site Açıklaması', value: settings.siteDescription, editable: true, key: 'siteDescription' },
        { label: 'Yönetici Email', value: settings.adminEmail, editable: true, key: 'adminEmail', type: 'email' },
      ],
    },
    {
      key: 'security',
      title: 'Güvenlik',
      icon: Shield,
      items: [
        { label: 'İki Faktörlü Doğrulama', value: 'Aktif', editable: true, type: 'toggle' },
        { label: 'IP Whitelist', value: 'Pasif', editable: true, type: 'toggle' },
        { label: 'Oturum Zaman Aşımı', value: '30 dakika', editable: true },
      ],
      featureFlag: 'adminSecuritySettings',
    },
    {
      key: 'database',
      title: 'Veritabanı',
      icon: Database,
      items: [
        { label: 'Son Yedekleme', value: '2 saat önce', editable: false },
        { label: 'Veritabanı Boyutu', value: '2.5 GB', editable: false },
        { label: 'Otomatik Yedekleme', value: 'Aktif', editable: true, type: 'toggle' },
      ],
      featureFlag: 'adminDatabaseSettings',
    },
    {
      key: 'design',
      title: 'Tasarım',
      icon: Palette,
      items: [
        { label: 'Tema', value: 'Açık Mod', editable: true },
        { label: 'Aksan Rengi', value: 'Mavi (#3b82f6)', editable: true },
        { label: 'Font Ailesi', value: 'Inter', editable: true },
      ],
      featureFlag: 'adminDesignSettings',
    },
  ]

  // 🔒 Gizlenecek bölümleri filtrele (render seviyesinde)
  const visibleCategories = settingsCategories.filter((category) => {
    if (category.featureFlag) {
      return featureFlags[category.featureFlag as keyof typeof featureFlags] === true
    }
    return true // Feature flag yoksa her zaman göster
  })

  return (
    <div className="px-4 lg:px-6 py-4">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-[var(--text)] mb-2">Ayarlar</h2>
        <p className="text-[var(--sub)]">Sistem ayarlarını yönetin</p>
      </div>

      <div className="space-y-6">
        {visibleCategories.map((category, categoryIndex) => {
          const Icon = category.icon
          return (
            <div key={categoryIndex} className="bg-[var(--panel)] dark:bg-[var(--panel)] rounded-2xl shadow-sm border border-[var(--border)] dark:border-[var(--border)] overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 dark:bg-[var(--muted)] border-b border-gray-200 dark:border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <Icon size={20} className="text-blue-600 dark:text-blue-400" />
                  <h3 className="text-lg font-semibold text-[var(--text)]">{category.title}</h3>
                </div>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-[var(--border)]">
                {category.items.map((item, itemIndex) => {
                  const ItemIcon = 'icon' in item && item.icon ? (item.icon as React.ComponentType<{ size?: number; className?: string }>) : null
                  return (
                    <div
                      key={itemIndex}
                      className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-[var(--muted)] transition-colors duration-150"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {ItemIcon && <ItemIcon size={16} className="text-blue-600 dark:text-blue-400" />}
                            <div className="text-sm font-medium text-[var(--text)]">{item.label}</div>
                          </div>
                          <div className="text-xs text-[var(--sub)] mb-1">{item.value}</div>
                          {'description' in item && item.description && (
                            <div className="text-xs text-[var(--sub)] opacity-75 mt-1 flex items-start gap-1">
                              <Info size={12} className="mt-0.5 flex-shrink-0" />
                              <span>{item.description}</span>
                            </div>
                          )}
                        </div>
                        {item.editable && 'key' in item && (
                          <button
                            onClick={() => {
                              setModal(item.key as ModalKey)
                            }}
                            className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors duration-150 text-sm font-medium whitespace-nowrap"
                          >
                            {item.type === 'toggle' ? 'Değiştir' : 'Düzenle'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
            <Shield size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">Güvenlik Uyarısı</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Ayarları değiştirirken dikkatli olun. Bazı değişiklikler sistemin genel işleyişini
              etkileyebilir.
            </p>
          </div>
        </div>
      </div>

      {/* Settings Modals */}
      {modal === 'siteName' && (
        <SettingsModal
          title="Site Adı"
          value={settings.siteName}
          onSave={(value) => handleSave('site-name', value)}
          onClose={() => setModal(null)}
          placeholder="Site adını girin"
        />
      )}

      {modal === 'siteDescription' && (
        <SettingsModal
          title="Site Açıklaması"
          value={settings.siteDescription}
          onSave={(value) => handleSave('site-description', value)}
          onClose={() => setModal(null)}
          type="textarea"
          placeholder="Site açıklamasını girin"
        />
      )}

      {modal === 'adminEmail' && (
        <SettingsModal
          title="Yönetici Email"
          value={settings.adminEmail}
          onSave={(value) => handleSave('admin-email', value)}
          onClose={() => setModal(null)}
          type="email"
          placeholder="admin@feellink.com"
        />
      )}
    </div>
  )
}





















