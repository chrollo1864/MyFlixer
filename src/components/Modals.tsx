import React, { useEffect, useState } from 'react';
import { X, Lock, Mail, User, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

export const Modals: React.FC = () => {
  const { activeModal, closeModal, login, verifyRegistration, showToast, selectedMovie } = useApp();

  // Login form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isVerifyingRegistration, setIsVerifyingRegistration] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Report video state
  const [reportIssues, setReportIssues] = useState<string[]>([]);
  const [reportNote, setReportNote] = useState('');

  // Contact / Request form state
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown(current => Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  if (!activeModal) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isRegistering && isVerifyingRegistration) {
        await verifyRegistration(email.trim(), verificationCode.trim());
        setVerificationCode('');
        setPassword('');
        setIsVerifyingRegistration(false);
      } else if (isRegistering) {
        await api.register(username.trim(), email.trim(), password);
        setIsVerifyingRegistration(true);
        setVerificationCode('');
        setPassword('');
        setResendCooldown(60);
        showToast(`A verification code was sent to ${email.trim()}.`);
      } else {
        await login(username.trim(), password);
        setPassword('');
      }
    } catch (error: any) {
      showToast(error.message || 'Authentication failed.');
    }
  };

  const handleResendRegistrationCode = async () => {
    try {
      await api.resendRegistrationCode(email.trim());
      setResendCooldown(60);
      showToast(`A new verification code was sent to ${email.trim()}.`);
    } catch (error: any) {
      showToast(error.message || 'Could not resend verification code.');
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.submitReportForm({
      movieId: selectedMovie?.id || 'unknown',
      issueType: reportIssues.join(', ') || 'Streaming issue',
      details: reportNote
    });
    showToast('Report submitted to server team. Thank you!');
    setReportIssues([]);
    setReportNote('');
    closeModal();
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeModal === 'request') {
      await api.submitRequestForm({
        email: contactEmail,
        title: contactSubject,
        type: 'movie',
        note: contactMessage
      });
      showToast('Your content request has been registered in the database!');
    } else {
      await api.submitContactForm({
        email: contactEmail,
        subject: contactSubject,
        message: contactMessage
      });
      showToast('Your message has been sent. We will reply via email!');
    }
    setContactEmail('');
    setContactSubject('');
    setContactMessage('');
    closeModal();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#292d38] border border-[#3e4555] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
        
        {/* Close Button */}
        <button
          onClick={closeModal}
          className="absolute top-5 right-5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 1. Login / Register Modal */}
        {activeModal === 'login' && (
          <div>
            <div className="text-center space-y-1 mb-5">
              <h3 className="text-2xl font-bold text-white">
                {isVerifyingRegistration ? 'Verify your email' : isRegistering ? 'Create an Account' : 'Welcome to MyFlixer'}
              </h3>
              <p className="text-xs text-[#b2b1ad]">
                {isVerifyingRegistration
                  ? `Enter the six-digit code sent to ${email}.`
                  : isRegistering
                  ? 'Sign up to build your watchlist and track viewing progress' 
                  : 'Sign in to access your synchronized bookmarks'}
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              {isVerifyingRegistration ? (
                <div className="space-y-1">
                  <label htmlFor="registration-code" className="text-xs font-semibold text-[#b2b1ad] uppercase tracking-wider">
                    Verification Code
                  </label>
                  <input
                    id="registration-code"
                    type="text"
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl px-3 py-3 text-center text-lg tracking-[0.4em] text-white focus:outline-none focus:border-[#4f83d3]"
                  />
                </div>
              ) : (
                <>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#b2b1ad] uppercase tracking-wider">
                  {isRegistering ? 'Username' : 'Username or Email'}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete={isRegistering ? 'username' : 'username'}
                    placeholder={isRegistering ? 'Choose a username...' : 'Enter your username or email...'}
                    className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl pl-10 pr-3 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-[#4f83d3]"
                  />
                </div>
              </div>

              {isRegistering && <div className="space-y-1">
                <label className="text-xs font-semibold text-[#b2b1ad] uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl pl-10 pr-3 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-[#4f83d3]"
                  />
                </div>
              </div>}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#b2b1ad] uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    minLength={isRegistering ? 8 : undefined}
                    maxLength={128}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isRegistering ? 'At least 8 characters' : 'Enter your password'}
                    className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl pl-10 pr-3 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-[#4f83d3]"
                  />
                </div>
              </div>
                </>
              )}

              <button
                type="submit"
                className="w-full mt-4 bg-gradient-flixer text-white font-semibold py-3 rounded-full text-sm shadow-lg hover:opacity-95 transition-opacity cursor-pointer"
              >
                {isVerifyingRegistration ? 'Verify Email' : isRegistering ? 'Sign Up' : 'Sign In'}
              </button>
            </form>

            {isVerifyingRegistration && (
              <div className="flex items-center justify-between gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => void handleResendRegistrationCode()}
                  disabled={resendCooldown > 0}
                  className="text-[#4f83d3] hover:underline disabled:text-[#6c757d] disabled:no-underline"
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsVerifyingRegistration(false);
                    setVerificationCode('');
                  }}
                  className="text-[#b2b1ad] hover:text-white"
                >
                  Change details
                </button>
              </div>
            )}

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setIsVerifyingRegistration(false);
                  setVerificationCode('');
                }}
                className="text-xs text-[#4f83d3] hover:underline cursor-pointer"
              >
                {isRegistering 
                  ? isVerifyingRegistration ? 'Back to sign in' : 'Already have an account? Sign In'
                  : "Don't have an account yet? Register"}
              </button>
            </div>
          </div>
        )}

        {/* 2. Report Broken Video Modal */}
        {activeModal === 'report' && (
          <div>
            <div className="flex items-center gap-2 text-amber-400 mb-1">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-lg font-bold text-white">Report Stream Issue</h3>
            </div>
            <p className="text-xs text-[#b2b1ad] mb-4">
              Help us keep the stream links working. Please select the issues you encountered:
            </p>

            <form onSubmit={handleReportSubmit} className="space-y-3">
              <div className="space-y-2 text-xs text-[#e9ecef]">
                {[
                  'Video stream does not load',
                  'Audio is out of synchronization',
                  'Subtitles are missing or wrong language',
                  'Frequent buffering or low resolution',
                  'Wrong movie or episode playing'
                ].map((issue) => (
                  <label key={issue} className="flex items-center gap-2.5 p-2 rounded-xl bg-[#1a1c23] hover:bg-[#22262f] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reportIssues.includes(issue)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setReportIssues([...reportIssues, issue]);
                        } else {
                          setReportIssues(reportIssues.filter(i => i !== issue));
                        }
                      }}
                      className="rounded text-[#4f83d3] focus:ring-0"
                    />
                    <span>{issue}</span>
                  </label>
                ))}
              </div>

              <textarea
                value={reportNote}
                onChange={(e) => setReportNote(e.target.value)}
                placeholder="Optional notes or timestamp where problem occurred..."
                rows={2}
                className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl p-2.5 text-xs text-white focus:outline-none resize-none"
              />

              <button
                type="submit"
                className="w-full bg-[#db6937] hover:bg-[#db6937]/90 text-white font-semibold py-2.5 rounded-full text-xs shadow cursor-pointer transition-colors"
              >
                Submit Report
              </button>
            </form>
          </div>
        )}

        {/* 3. Contact Support / Request Form Modal */}
        {(activeModal === 'contact' || activeModal === 'request') && (
          <div>
            <div className="text-center space-y-1 mb-4">
              <h3 className="text-xl font-bold text-white">
                {activeModal === 'request' ? 'Request a Movie or Show' : 'Contact Support'}
              </h3>
              <p className="text-xs text-[#b2b1ad]">
                {activeModal === 'request' 
                  ? 'Let us know which movie, anime, or series you would like added' 
                  : 'Have a question or feedback? We reply within 24 hours'}
              </p>
            </div>

            <form onSubmit={handleContactSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-[#b2b1ad]">Your Email</label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-[#b2b1ad]">Subject</label>
                <input
                  type="text"
                  required
                  value={contactSubject}
                  onChange={(e) => setContactSubject(e.target.value)}
                  placeholder={activeModal === 'request' ? "e.g. Add Deadpool & Wolverine (2024)" : "e.g. Inquiries about subtitles"}
                  className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-[#b2b1ad]">What can we help you with?</label>
                <textarea
                  required
                  rows={3}
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Details, IMDB link, or description..."
                  className="w-full bg-[#1a1c23] border border-[#3e4555] rounded-xl p-2.5 text-xs text-white focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-flixer text-white font-semibold py-2.5 rounded-full text-xs shadow cursor-pointer transition-opacity"
              >
                Send Message
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
