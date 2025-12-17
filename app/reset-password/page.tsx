'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // 🔒 Güvenlik: Reset sayfası yüklendiğinde mevcut auth state'i temizle
  // Bu sayede reset linkiyle gelen biri asla logged-in state'e düşmez
  useEffect(() => {
    clearAuth();
  }, [clearAuth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Geçersiz veya eksik bağlantı. Lütfen e-postanızdaki linki kullanın.');
      return;
    }

    if (password.length < 8) {
      setError('Şifreniz en az 8 karakter olmalı.');
      return;
    }

    if (password !== passwordConfirm) {
      setError('Şifreler birbiriyle eşleşmiyor.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.post('/auth/reset-password', { token, password });
      setMessage(res.data?.message || 'Şifreniz başarıyla güncellendi.');

      // ✅ Reset sonrası sadece login sayfasına yönlendir
      // ❌ Auth state set etme, token oluşturma, session başlatma YAPILMAZ
      setTimeout(() => {
        router.replace('/login?reset=success');
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          'Bağlantınız geçersiz veya süresi dolmuş olabilir. Lütfen yeniden şifre sıfırlama talebi oluşturun.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0d0d0d] p-4 z-50">
      <div className="w-full max-w-md rounded-2xl bg-[#111111] p-6 shadow-xl border border-white/5">
        <h1 className="text-2xl font-semibold text-white mb-2">Yeni Şifre Oluştur</h1>
        <p className="text-xs text-gray-400 mb-6">
          Güvenli bir şifre belirleyin. Bu şifre ile Feellink hesabınıza giriş yapabileceksiniz.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-300 mb-1">Yeni Şifre</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-[#1a1a1a] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
              placeholder="Yeni şifreniz"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-300 mb-1">Yeni Şifre (Tekrar)</label>
            <input
              type="password"
              required
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className="w-full rounded-xl bg-[#1a1a1a] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
              placeholder="Yeni şifrenizi tekrar girin"
            />
          </div>

          {message && <p className="text-xs text-emerald-400">{message}</p>}
          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-sm font-medium text-black py-2 transition-colors"
          >
            {isLoading ? 'Kaydediliyor...' : 'Şifremi Güncelle'}
          </button>
        </form>
      </div>
    </div>
  );
}

