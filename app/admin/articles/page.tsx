'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Trash2, Eye } from 'lucide-react'
import ConfirmModal from '@/components/common/ConfirmModal'

interface Article {
  id: string
  title: string
  excerpt: string | null
  isPublished: boolean
  views: number
  createdAt: string
  author: {
    id: string
    username: string
    avatar: string | null
  }
}

export default function AdminArticles() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => {
    fetchArticles()
  }, [page])

  const fetchArticles = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/admin/articles?page=${page}&limit=20`)
      setArticles(response.data.articles)
      setTotal(response.data.total)
    } catch (error) {
      console.error('Error fetching articles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (articleId: string) => {
    try {
      await api.delete(`/admin/articles/${articleId}`)
      setArticles(articles.filter((a) => a.id !== articleId))
      setConfirmDelete(null)
    } catch (error) {
      console.error('Error deleting article:', error)
      alert('Makale silinirken bir hata oluştu')
      setConfirmDelete(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff7b00]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold dark:text-white text-gray-900">Makaleler</h2>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700/40 shadow-sm dark:bg-[#111] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-[#0d0d0d] border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Başlık
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Yazar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Görüntülenme
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {articles.map((article) => (
                <tr key={article.id} className="hover:bg-gray-50 dark:hover:bg-[#0d0d0d]">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium dark:text-white text-gray-900">
                        {article.title}
                      </p>
                      {article.excerpt && (
                        <p className="text-xs dark:text-gray-400 text-gray-600 mt-1 max-w-md truncate">
                          {article.excerpt}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {article.author.avatar ? (
                        <img
                          src={article.author.avatar}
                          alt={article.author.username}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[#ff7b00] flex items-center justify-center text-white text-xs font-semibold">
                          {article.author.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm dark:text-gray-300 text-gray-700">
                        {article.author.username}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        article.isPublished
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {article.isPublished ? 'Yayında' : 'Taslak'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-sm dark:text-gray-300 text-gray-700">
                      <Eye className="w-4 h-4" />
                      {article.views}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-gray-400 text-gray-600">
                    {new Date(article.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setConfirmDelete(article.id)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-sm dark:text-gray-400 text-gray-600">
            Toplam {total} makale
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-[#0d0d0d] bg-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
            >
              Önceki
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * 20 >= total}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-[#0d0d0d] bg-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors"
            >
              Sonraki
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={!!confirmDelete}
        title="Makaleyi Sil"
        message="Bu makaleyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmText="Sil"
        cancelText="İptal"
        variant="danger"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}

