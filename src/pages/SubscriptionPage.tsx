import React, { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, CheckCircle2, CreditCard, ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { UserSubscription } from '../types/admin';
import {
  PaymentProvider,
  SUBSCRIPTION_PLANS,
  SubscriptionPaymentRequest,
  SubscriptionPlanId
} from '../services/subscriptionPlans';

export const SubscriptionPage: React.FC = () => {
  const { currentUser, openModal, themeOptions } = useApp();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [requests, setRequests] = useState<SubscriptionPaymentRequest[]>([]);
  const [planId, setPlanId] = useState<SubscriptionPlanId>(SUBSCRIPTION_PLANS[0].id);
  const [provider, setProvider] = useState<PaymentProvider>('gcash');
  const [transactionReference, setTransactionReference] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const loadAccountData = async () => {
    if (!currentUser) {
      setSubscription(null);
      setRequests([]);
      return;
    }
    const [currentSubscription, paymentRequests] = await Promise.all([
      api.getUserSubscription(),
      api.getSubscriptionPaymentRequests()
    ]);
    setSubscription(currentSubscription);
    setRequests(paymentRequests);
  };

  useEffect(() => {
    setError('');
    loadAccountData().catch(loadError => setError(loadError instanceof Error ? loadError.message : 'Could not load subscription details.'));
  }, [currentUser]);

  const paymentSettings = themeOptions.subscriptionPayments;
  const paymentAccount = useMemo(() => provider === 'gcash'
    ? {
      name: paymentSettings.gcashDisplayName,
      number: paymentSettings.gcashAccountNumber,
      qrUrl: paymentSettings.gcashQrImageUrl
    }
    : {
      name: paymentSettings.mayaDisplayName,
      number: paymentSettings.mayaAccountNumber,
      qrUrl: paymentSettings.mayaQrImageUrl
    }, [paymentSettings, provider]);

  const status = subscription?.status || 'none';
  const expiresAt = subscription?.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString() : null;

  const handleSubmitPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitted(false);
    setIsSubmitting(true);
    try {
      await api.createSubscriptionPaymentRequest({ planId, provider, transactionReference });
      setTransactionReference('');
      setSubmitted(true);
      await loadAccountData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not submit payment for review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const planNames = new Map(SUBSCRIPTION_PLANS.map(plan => [plan.id, plan.title]));

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-10 sm:px-6">
      <header className="rounded-3xl border border-[#2e3442] bg-gradient-to-r from-[#242832] to-[#1a1c23] p-6 sm:p-9">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#4f83d3]/15 text-[#4f83d3]">
          {status === 'active' ? <BadgeCheck className="h-6 w-6" /> : <CreditCard className="h-6 w-6" />}
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#4f83d3]">Subscription</p>
        <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Choose your plan</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#b2b1ad]">
          All prices are in Philippine Pesos (PHP). No free trial; renewal is optional. Longer plans offer bigger savings.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${
            status === 'active' ? 'bg-emerald-500/10 text-emerald-400'
              : status === 'expired' ? 'bg-amber-500/10 text-amber-300'
                : status === 'canceled' ? 'bg-rose-500/10 text-rose-400'
                  : 'bg-[#343b4a] text-[#b2b1ad]'
          }`}>{currentUser ? status : 'Sign in required'}</span>
          {expiresAt && <span className="text-xs text-[#858b98]">Access through {expiresAt}</span>}
        </div>
        {!themeOptions.general.subscriptionModeEnabled && (
          <p className="mt-4 rounded-xl border border-[#4f83d3]/20 bg-[#4f83d3]/5 p-3 text-xs text-[#b2b1ad]">
            Subscription mode is currently disabled. You can still submit a renewal request, but payment is optional for playback right now.
          </p>
        )}
      </header>

      <section>
        <h2 className="mb-3 text-lg font-bold text-white">Subscription plans</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {SUBSCRIPTION_PLANS.map(plan => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setPlanId(plan.id)}
              aria-pressed={planId === plan.id}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                planId === plan.id
                  ? 'border-[#4f83d3] bg-[#4f83d3]/10 ring-1 ring-[#4f83d3]'
                  : 'border-[#343b4a] bg-[#242832] hover:border-[#4f83d3]/60'
              }`}
            >
              <span className="block text-xs font-semibold text-[#b2b1ad]">{plan.title}</span>
              <span className="mt-2 block text-xl font-extrabold text-white">₱{plan.pricePhp}</span>
              <span className="mt-1 block text-[10px] text-[#858b98]">PHP · optional renewal</span>
              {plan.months >= 3 && (
                <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Better value
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="rounded-3xl border border-[#2e3442] bg-[#242832] p-5 sm:p-6">
          <h2 className="text-base font-bold text-white">Pay with GCash or Maya</h2>
          {!currentUser ? (
            <div className="mt-4 rounded-2xl bg-[#1a1c23] p-5 text-center">
              <p className="text-sm text-[#b2b1ad]">Sign in to submit a payment for review.</p>
              <button onClick={() => openModal('login')} className="mt-4 rounded-xl bg-gradient-flixer px-5 py-2.5 text-sm font-semibold text-white">
                Sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitPayment} className="mt-4 space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-[#b2b1ad]">Payment method</span>
                <select
                  value={provider}
                  onChange={event => setProvider(event.target.value as PaymentProvider)}
                  className="w-full rounded-xl border border-[#3e4555] bg-[#1a1c23] px-3 py-3 text-sm text-white"
                >
                  <option value="gcash">GCash</option>
                  <option value="maya">Maya</option>
                </select>
              </label>

              <div className="rounded-2xl border border-[#343b4a] bg-[#1a1c23] p-4">
                {paymentAccount.qrUrl && (
                  <img src={paymentAccount.qrUrl} alt={`${provider} payment QR`} className="mx-auto mb-4 max-h-52 rounded-xl bg-white object-contain p-2" />
                )}
                {paymentAccount.name || paymentAccount.number ? (
                  <dl className="space-y-2 text-xs">
                    {paymentAccount.name && <div className="flex justify-between gap-3"><dt className="text-[#858b98]">Account name</dt><dd className="text-right font-semibold text-white">{paymentAccount.name}</dd></div>}
                    {paymentAccount.number && <div className="flex justify-between gap-3"><dt className="text-[#858b98]">Account number</dt><dd className="text-right font-semibold text-white">{paymentAccount.number}</dd></div>}
                  </dl>
                ) : (
                  <p className="text-xs leading-relaxed text-amber-200">
                    {provider === 'gcash' ? 'GCash' : 'Maya'} payment details have not been configured yet. Please check back later or contact the site administrator.
                  </p>
                )}
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-[#b2b1ad]">Transaction reference</span>
                <input
                  value={transactionReference}
                  onChange={event => setTransactionReference(event.target.value)}
                  required
                  minLength={4}
                  maxLength={120}
                  placeholder="Enter the reference shown after payment"
                  className="w-full rounded-xl border border-[#3e4555] bg-[#1a1c23] px-3 py-3 text-sm text-white placeholder:text-[#6c757d]"
                />
              </label>

              <p className="text-[11px] leading-relaxed text-[#858b98]">
                Select {planNames.get(planId)} · PHP {SUBSCRIPTION_PLANS.find(plan => plan.id === planId)?.pricePhp}. Submit only after transferring the exact amount. An administrator will verify the transaction; access starts only after approval.
              </p>
              {error && <p className="text-xs text-rose-400" role="alert">{error}</p>}
              {submitted && <p className="text-xs text-emerald-400" role="status">Payment submitted for review. Your subscription is not active until approved.</p>}
              <button
                type="submit"
                disabled={isSubmitting || (!paymentAccount.number && !paymentAccount.qrUrl)}
                className="w-full rounded-xl bg-gradient-flixer px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting…' : 'Submit payment for review'}
              </button>
            </form>
          )}
        </section>

        <section className="rounded-3xl border border-[#2e3442] bg-[#242832] p-5 sm:p-6">
          <h2 className="mb-4 text-base font-bold text-white">Payment requests</h2>
          {!currentUser ? (
            <p className="text-sm text-[#858b98]">Sign in to view your payment requests.</p>
          ) : requests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#3e4555] p-8 text-center">
              <ShieldAlert className="mx-auto mb-2 h-6 w-6 text-[#858b98]" />
              <p className="text-sm text-[#858b98]">No payment requests yet.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {requests.map(request => (
                <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#343b4a] bg-[#1a1c23] p-3">
                  <span>
                    <span className="block text-xs font-semibold text-white">
                      {planNames.get(request.planId) || request.planId} · {request.provider.toUpperCase()}
                    </span>
                    <span className="mt-1 block text-[10px] text-[#858b98]">
                      Ref: {request.transactionReference} · {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                    request.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400'
                      : request.status === 'rejected' ? 'bg-rose-500/10 text-rose-400'
                        : 'bg-amber-500/10 text-amber-300'
                  }`}>{request.status}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-[10px] leading-relaxed text-[#858b98]">
            Payment details and transaction references are provided by users and require manual verification. Submitting a request does not activate a subscription.
          </p>
        </section>
      </div>
    </main>
  );
};
