import React, { useState } from 'react';

/**
 * Modern Auth Component
 * Green Theme - Light Professional Design
 */
const Auth = ({ onAuthSubmit }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onAuthSubmit({
        name: fullName,
        email: email,
        userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      });
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block">
            <div className="text-6xl mb-6 animate-bounce">🧠</div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Welcome Back</h1>
          <p className="text-gray-600">Sign up to start learning with AI</p>
        </div>

        {/* Card */}
        <div className="card shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-4 flex items-center gap-3 animate-shake">
                <span className="text-red-600">⚠️</span>
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Full Name Input */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">👤</span>
                <input
                  id="name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your name"
                  className="pl-12 pr-4 py-3 text-gray-900 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:shadow-lg focus:shadow-green-500/20 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">✉️</span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="pl-12 pr-4 py-3 text-gray-900 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:shadow-lg focus:shadow-green-500/20 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn btn-primary py-3 text-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="inline-block animate-spin">⚡</span>
                  Creating Account...
                </>
              ) : (
                <>
                  <span>Get Started</span>
                  <span>→</span>
                </>
              )}
            </button>

            {/* Features List */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-3 text-gray-700">
                <span className="text-xl">✨</span>
                <span className="text-sm">AI-powered concept extraction</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <span className="text-xl">🎯</span>
                <span className="text-sm">Adaptive quizzes tailored to you</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <span className="text-xl">📊</span>
                <span className="text-sm">Track progress and insights</span>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-sm mt-8">
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
};

export default Auth;
