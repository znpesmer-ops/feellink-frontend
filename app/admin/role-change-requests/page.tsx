'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, Clock, User, MessageSquare, Shield, X } from 'lucide-react'
import { ROLE_METADATA } from '@/lib/role-utils'
import type { UserRoleCode } from '@/types/capabilities'

interface RoleChangeRequest {
  id: string
  userId: string
  requestedRole: UserRoleCode
  message?: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewedBy?: string | null
  reviewedAt?: string | null
  reviewNote?: string | null
  createdAt: string
  user: {
    id: string
    username: string
    fullName?: string | null
    email: string
    roles: UserRoleCode[]
  }
  reviewer?: {
    id: string
    username: string
    fullName?: string | null
  } | null
}

export default function RoleChangeRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('all')
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()
  
  // Modal state
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: 'approve' | 'reject' | null
    requestId: string | null
    reviewNote: string
  }>({
    isOpen: false,
    type: null,
    requestId: null,
    reviewNote: '',
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['role-change-requests', statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      params.append('page', page.toString())
      params.append('limit', '20')
      
      const response = await api.get(`/admin/role-change-requests?${params.toString()}`)
      return response.data
    },
  })

  const approveMutation = useMutation({
    mutationFn: async ({ requestId, reviewNote }: { requestId: string; reviewNote?: string }) => {
      return api.patch(`/admin/role-change-requests/${requestId}/approve`, { reviewNote })
    },
    onSuccess: () => {
      toast.success('Rol değişikliği talebi onaylandı')
      queryClient.invalidateQueries({ queryKey: ['role-change-requests'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      // Modal'ı kapat
      setModalState({ isOpen: false, type: null, requestId: null, reviewNote: '' })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Onaylama işlemi başarısız oldu')
      // Hata durumunda modal açık kalır
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reviewNote }: { requestId: string; reviewNote?: string }) => {
      return api.patch(`/admin/role-change-requests/${requestId}/reject`, { reviewNote })
    },
    onSuccess: () => {
      toast.success('Rol değişikliği talebi reddedildi')
      queryClient.invalidateQueries({ queryKey: ['role-change-requests'] })
      // Modal'ı kapat
      setModalState({ isOpen: false, type: null, requestId: null, reviewNote: '' })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Reddetme işlemi başarısız oldu')
      // Hata durumunda modal açık kalır
    },
  })

  const handleOpenModal = (type: 'approve' | 'reject', requestId: string) => {
    setModalState({
      isOpen: true,
      type,
      requestId,
      reviewNote: '',
    })
  }

  const handleCloseModal = () => {
    if (!approveMutation.isPending && !rejectMutation.isPending) {
      setModalState({ isOpen: false, type: null, requestId: null, reviewNote: '' })
    }
  }

  const handleSubmit = () => {
    if (!modalState.requestId || !modalState.type) return

    const reviewNote = modalState.reviewNote.trim() || undefined

    if (modalState.type === 'approve') {
      approveMutation.mutate({
        requestId: modalState.requestId,
        reviewNote,
      })
    } else {
      rejectMutation.mutate({
        requestId: modalState.requestId,
        reviewNote,
      })
    }
  }

  const requests: RoleChangeRequest[] = data?.requests || []
  const total = data?.total || 0
  const totalPages = data?.totalPages || 1

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Rol Değişiklik Talepleri
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Kullanıcıların rol değişikliği taleplerini görüntüleyin ve yönetin.
        </p>
      </div>

      {/* Filtreler */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => {
            setStatusFilter('all')
            setPage(1)
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            statusFilter === 'all'
              ? 'bg-[#ff7b00] text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Tümü ({total})
        </button>
        <button
          onClick={() => {
            setStatusFilter('PENDING')
            setPage(1)
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            statusFilter === 'PENDING'
              ? 'bg-yellow-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <Clock size={16} />
          Bekleyen
        </button>
        <button
          onClick={() => {
            setStatusFilter('APPROVED')
            setPage(1)
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            statusFilter === 'APPROVED'
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <CheckCircle size={16} />
          Onaylanan
        </button>
        <button
          onClick={() => {
            setStatusFilter('REJECTED')
            setPage(1)
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            statusFilter === 'REJECTED'
              ? 'bg-red-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <XCircle size={16} />
          Reddedilen
        </button>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff7b00]"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p>Henüz rol değişikliği talebi bulunmuyor.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <User size={20} className="text-gray-500 dark:text-gray-400" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        @{request.user.username}
                      </p>
                      {request.user.fullName && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {request.user.fullName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Mevcut Rol</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {request.user.roles?.[0]
                          ? ROLE_METADATA[request.user.roles[0]]?.label || request.user.roles[0]
                          : 'Belirtilmemiş'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">İstenen Rol</p>
                      <p className="text-sm font-medium text-[#ff7b00]">
                        {ROLE_METADATA[request.requestedRole]?.label || request.requestedRole}
                      </p>
                    </div>
                  </div>

                  {request.message && (
                    <div className="mb-4">
                      <div className="flex items-start gap-2">
                        <MessageSquare size={16} className="text-gray-500 dark:text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Açıklama</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{request.message}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {request.reviewNote && (
                    <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Admin Notu</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{request.reviewNote}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      Talep: {new Date(request.createdAt).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {request.reviewedAt && (
                      <span>
                        İncelendi: {new Date(request.reviewedAt).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                    {request.reviewer && (
                      <span>İnceleyen: @{request.reviewer.username}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {request.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleOpenModal('approve', request.id)}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <CheckCircle size={16} />
                        Onayla
                      </button>
                      <button
                        onClick={() => handleOpenModal('reject', request.id)}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <XCircle size={16} />
                        Reddet
                      </button>
                    </>
                  )}
                  {request.status === 'APPROVED' && (
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium flex items-center gap-2">
                      <CheckCircle size={16} />
                      Onaylandı
                    </span>
                  )}
                  {request.status === 'REJECTED' && (
                    <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium flex items-center gap-2">
                      <XCircle size={16} />
                      Reddedildi
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Önceki
          </button>
          <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
            Sayfa {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sonraki
          </button>
        </div>
      )}

      {/* Admin Notu Modal */}
      {modalState.isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={handleCloseModal}
        >
          <div
            className="w-full max-w-md bg-[#0f172a] dark:bg-gray-800 rounded-xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-gray-400" />
                <h2 className="text-xl font-semibold text-white">
                  Rol Değişikliği – Admin Notu
                </h2>
              </div>
              <button
                onClick={handleCloseModal}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                className="text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                  <MessageSquare className="w-4 h-4 text-gray-400" />
                  {modalState.type === 'approve' ? 'Onay Notu' : 'Red Nedeni'} (Opsiyonel)
                </label>
                <textarea
                  value={modalState.reviewNote}
                  onChange={(e) =>
                    setModalState((prev) => ({ ...prev, reviewNote: e.target.value }))
                  }
                  placeholder={
                    modalState.type === 'approve'
                      ? 'Kullanıcıya iletilecek kısa admin notu...'
                      : 'Red nedeni (kullanıcıya iletilecek)...'
                  }
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff7b00] resize-none"
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleCloseModal}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  İptal
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                    modalState.type === 'approve'
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  {approveMutation.isPending || rejectMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      İşleniyor...
                    </>
                  ) : modalState.type === 'approve' ? (
                    <>
                      <CheckCircle size={16} />
                      Onayla
                    </>
                  ) : (
                    <>
                      <XCircle size={16} />
                      Reddet
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

