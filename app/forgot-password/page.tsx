'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMessage(
        res.data?.message ||
          'Eğer bu e-posta ile kayıtlı bir hesabınız varsa, şifre sıfırlama bağlantısı e-posta adresinize gönderildi.'
      );
      
      // Development modunda mail gönderimi başarısız olduğunda kullanıcıya bilgi ver
      if (res.data?.developmentMode && res.data?.resetUrl) {
        setMessage(
          `⚠️ Development Modu: Mail gönderimi başarısız oldu. SMTP ayarlarını kontrol edin.\n\n` +
          `Şifre sıfırlama linki:\n${res.data.resetUrl}\n\n` +
          `Bu linki kopyalayıp tarayıcıda açabilirsiniz.`
        );
      }
    } catch (err: any) {
      setError('İşlem sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0d0d0d] p-4 z-50">
      <div className="w-full max-w-md rounded-2xl bg-[#111111] p-6 shadow-xl border border-white/5">
        <h1 className="text-2xl font-semibold text-white mb-2">Şifremi Unuttum</h1>
        <p className="text-xs text-gray-400 mb-6">
          E-posta adresinizi girin, şifrenizi sıfırlamanız için size güvenli bir bağlantı gönderelim.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-300 mb-1">E-posta Adresi</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-[#1a1a1a] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
              placeholder="ornek@mail.com"
            />
          </div>

          {message && (
            <div className="space-y-2">
              <p className="text-xs text-emerald-400 whitespace-pre-line">{message}</p>
            </div>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-sm font-medium text-black py-2 transition-colors"
          >
            {isLoading ? 'Gönderiliyor...' : 'Bağlantı Gönder'}
          </button>
        </form>

        <div className="mt-4 text-xs text-gray-400">
          Giriş ekranına dönmek için{' '}
          <a href="/login" className="text-amber-400 hover:text-amber-300">
            tıklayın
          </a>
          .
        </div>
      </div>
    </div>
  );
}

