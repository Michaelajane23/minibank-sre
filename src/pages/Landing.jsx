import React from 'react';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">MB</div>
            <span className="font-bold text-xl text-gray-900">MiniBank</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">Log in</Link>
            <Link to="/signup" className="text-sm font-medium bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition">Get started</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight">
          Banking that works<br />
          <span className="text-brand-600">for you</span>
        </h1>
        <p className="mt-6 text-xl text-gray-500 max-w-2xl mx-auto">
          A modern current account with instant spending notifications, savings pots, and fee-free spending worldwide.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link to="/signup" className="bg-brand-600 text-white px-8 py-3.5 rounded-xl font-semibold text-lg hover:bg-brand-700 transition shadow-lg shadow-brand-600/25">
            Open an account
          </Link>
          <Link to="/login" className="text-gray-600 px-8 py-3.5 rounded-xl font-semibold text-lg border border-gray-200 hover:border-gray-300 transition">
            Sign in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">Everything you need from a bank</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: 'Instant notifications', desc: 'Know when money comes in and goes out with real-time transaction alerts.' },
              { title: 'Savings pots', desc: 'Set money aside for goals. Create pots for holidays, bills, or a rainy day.' },
              { title: 'Spending insights', desc: 'Automatically categorised transactions help you understand where your money goes.' },
              { title: 'Fee-free transfers', desc: 'Send money to friends instantly. No hidden charges, no delays.' },
              { title: 'Card controls', desc: 'Freeze your card instantly if you lose it. Unfreeze when you find it.' },
              { title: 'Bank-grade security', desc: 'Your money is protected with 256-bit encryption and biometric authentication.' }
            ].map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-lg text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Your money is safe</h2>
          <p className="text-lg text-gray-500 mb-12">
            Protected by FSCS up to £85,000. Regulated by the FCA. Your security is our priority.
          </p>
          <div className="flex items-center justify-center gap-12 text-gray-400 text-sm font-medium">
            <span>FSCS Protected</span>
            <span>FCA Regulated</span>
            <span>256-bit Encryption</span>
            <span>Open Banking</span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-600 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to switch?</h2>
          <p className="text-brand-100 text-lg mb-8">Open your account in minutes. No paperwork, no branch visits.</p>
          <Link to="/signup" className="inline-block bg-white text-brand-700 px-8 py-3.5 rounded-xl font-semibold text-lg hover:bg-gray-50 transition">
            Get started free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-400">
          © 2024 MiniBank Ltd. All rights reserved. MiniBank is a demo banking platform.
        </div>
      </footer>
    </div>
  );
}
