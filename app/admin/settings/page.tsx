'use client'

import { Settings, Bell, Shield, Database, Palette } from 'lucide-react'

export default function AdminSettingsPage() {
  const settingsCategories = [
    {
      title: 'Genel Ayarlar',
      icon: Settings,
      items: [
        { label: 'Site Adı', value: 'Feellink', editable: true },
        { label: 'Site Açıklaması', value: 'Modern sosyal medya platformu', editable: true },
        { label: 'Yönetici Email', value: 'admin@feellink.com', editable: true },
      ],
    },
    {
      title: 'Bildirim Ayarları',
      icon: Bell,
      items: [
        { label: 'Email Bildirimleri', value: 'Aktif', editable: true, type: 'toggle' },
        { label: 'Push Bildirimleri', value: 'Aktif', editable: true, type: 'toggle' },
        { label: 'SMS Bildirimleri', value: 'Pasif', editable: true, type: 'toggle' },
      ],
    },
    {
      title: 'Güvenlik',
      icon: Shield,
      items: [
        { label: 'İki Faktörlü Doğrulama', value: 'Aktif', editable: true, type: 'toggle' },
        { label: 'IP Whitelist', value: 'Pasif', editable: true, type: 'toggle' },
        { label: 'Oturum Zaman Aşımı', value: '30 dakika', editable: true },
      ],
    },
    {
      title: 'Veritabanı',
      icon: Database,
      items: [
        { label: 'Son Yedekleme', value: '2 saat önce', editable: false },
        { label: 'Veritabanı Boyutu', value: '2.5 GB', editable: false },
        { label: 'Otomatik Yedekleme', value: 'Aktif', editable: true, type: 'toggle' },
      ],
    },
    {
      title: 'Tasarım',
      icon: Palette,
      items: [
        { label: 'Tema', value: 'Açık Mod', editable: true },
        { label: 'Aksan Rengi', value: 'Mavi (#3b82f6)', editable: true },
        { label: 'Font Ailesi', value: 'Inter', editable: true },
      ],
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Ayarlar</h2>
        <p className="text-gray-500">Sistem ayarlarını yönetin</p>
      </div>

      <div className="space-y-6">
        {settingsCategories.map((category, categoryIndex) => {
          const Icon = category.icon
          return (
            <div key={categoryIndex} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <Icon size={20} className="text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-800">{category.title}</h3>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {category.items.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="px-6 py-4 hover:bg-gray-50 transition-colors duration-150"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-800 mb-1">{item.label}</div>
                        <div className="text-xs text-gray-500">{item.value}</div>
                      </div>
                      {item.editable && (
                        <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors duration-150 text-sm font-medium">
                          {item.type === 'toggle' ? 'Değiştir' : 'Düzenle'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Shield size={20} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Güvenlik Uyarısı</h3>
            <p className="text-sm text-blue-700 mb-4">
              Ayarları değiştirirken dikkatli olun. Bazı değişiklikler sistemin genel işleyişini
              etkileyebilir.
            </p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150 text-sm font-medium">
              Dökümantasyonu Görüntüle
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}




