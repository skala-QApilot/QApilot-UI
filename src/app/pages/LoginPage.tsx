import React, { useState } from 'react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

interface LoginPageProps {
  onLogin: () => void;
  onBack: () => void;
}

export function LoginPage({ onLogin, onBack }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">

      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-10 h-[72px] border-b border-[#f0f0f0] flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-[#9ca3af] hover:text-[#374151] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          홈으로
        </button>
        <span className="text-[18px] font-extrabold text-[#3615CF] tracking-tight">QApilot</span>
        <p className="text-sm text-[#9ca3af]">
          계정이 없으신가요?{' '}
          <button onClick={onLogin} className="text-[#3615CF] font-semibold hover:underline">
            회원가입
          </button>
        </p>
      </nav>

      {/* ── Form area ── */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">

          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-[#1a1a2e] mb-1.5">다시 오셨군요 👋</h2>
            <p className="text-sm text-[#9ca3af]">계정 정보를 입력해 주세요</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5">이메일</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="hello@example.com"
                className="w-full px-4 py-3 rounded-xl border border-[#e5e7eb] bg-[#f9f8ff] focus:bg-white focus:border-[#3615CF]/50 focus:ring-2 focus:ring-[#3615CF]/10 focus:outline-none text-sm text-[#1a1a2e] placeholder-[#c4c9d4] transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#374151]">비밀번호</label>
                <button type="button" className="text-[11px] text-[#3615CF] hover:underline font-medium">
                  비밀번호 찾기
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-[#e5e7eb] bg-[#f9f8ff] focus:bg-white focus:border-[#3615CF]/50 focus:ring-2 focus:ring-[#3615CF]/10 focus:outline-none text-sm text-[#1a1a2e] placeholder-[#c4c9d4] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" className="w-3.5 h-3.5 rounded accent-[#3615CF]" />
              <span className="text-xs text-[#6b7280]">로그인 상태 유지</span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-3.5 bg-[#3615CF] text-white font-bold rounded-xl text-sm hover:bg-[#3615CF]/90 shadow-md shadow-[#3615CF]/20 hover:shadow-[#3615CF]/30 transition-all"
            >
              로그인
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#f0f0f0]" />
              <span className="text-[11px] text-[#c4c9d4] font-medium">또는</span>
              <div className="flex-1 h-px bg-[#f0f0f0]" />
            </div>

            {/* Google SSO */}
            <button
              type="button"
              className="w-full py-3 border border-[#e5e7eb] rounded-xl text-sm text-[#374151] hover:bg-[#f9f8ff] hover:border-[#C5C0EC] transition-all font-medium flex items-center justify-center gap-2.5"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google로 로그인
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
