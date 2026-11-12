import React, { useState } from 'react';
import { Check, CreditCard, QrCode, ShieldCheck } from 'lucide-react';
import { AdminSubscription, GeneralSettings, SubscriptionStatus } from '../../types/admin';
import { SubscriptionPaymentRequest, SubscriptionPaymentSettings, SUBSCRIPTION_PLANS } from '../../services/subscriptionPlans';

interface SubscriptionSettingsTabProps {
  subscriptions: AdminSubscription[];
  paymentRequests: SubscriptionPaymentRequest[];
  generalSettings: GeneralSettings;
  paymentSettings: SubscriptionPaymentSettings;
  onUpdateGeneralSettings: (settings: Partial<GeneralSettings>) => Promise<void>;
  onSavePaymentSettings: (settings: SubscriptionPaymentSettings) => Promise<void>;
  onSaveSubscription: (
    username: string,
    subscription: { status: SubscriptionStatus; expiresAt: string | null }
  ) => Promise<void>;
  onReviewPaymentRequest: (id: number, decision: 'approved' | 'rejected') => Promise<void>;
}

const statusClassNames: Record<SubscriptionStatus, string> = {
  active: 'bg-emerald-500/10 text-emerald-400',
  expired: 'bg-amber-500/10 text-amber-300',
  canceled: 'bg-rose-500/10 text-rose-400',
  none: 'bg-[#343b4a] text-[#b2b1ad]'
};

export const SubscriptionSettingsTab: React.FC<SubscriptionSettingsTabProps> = ({
  subscriptions,
  paymentRequests,
  generalSettings,
  paymentSettings,
  onUpdateGeneralSettings,
  onSavePaymentSettings,
  onSaveSubscription,
  onReviewPaymentRequest
}) => {
  const [savingUsername, setSavingUsername] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isUpdatingSubscriptionMode, setIsUpdatingSubscriptionMode] = useState(false);
  const [isSavingPaymentSettings, setIsSavingPaymentSettings] = useState(false);
  const [reviewingRequestId, setReviewingRequestId] = useState<number | null>(null);

  const handleSave = async (subscription: AdminSubscription, form: HTMLFormElement) => {
    const formData = new FormData(form);
    const status = String(formData.get('status')) as SubscriptionStatus;
    const expiresAt = String(formData.get('expiresAt') || '');
    setSavingUsername(subscription.username);
    setError('');
    try {
      await onSaveSubscription(subscription.username, {
        status,
        expiresAt: expiresAt || null
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not update subscription.');
    } finally {
      setSavingUsername(null);
    }
  };

  const handleSavePaymentSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setIsSavingPaymentSettings(true);
    setError('');
    try {
      await onSavePaymentSettings({
        gcashDisplayName: String(formData.get('gcashDisplayName') || '').trim(),
        gcashAccountNumber: String(formData.get('gcashAccountNumber') || '').trim(),
        gcashQrImageUrl: String(formData.get('gcashQrImageUrl') || '').trim(),
        mayaDisplayName: String(formData.get('mayaDisplayName') || '').trim(),
        mayaAccountNumber: String(formData.get('mayaAccountNumber') || '').trim(),
        mayaQrImageUrl: String(formData.get('mayaQrImageUrl') || '').trim()
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save payment settings.');
    } finally {
      setIsSavingPaymentSettings(false);
    }
  };

  const handleReviewPayment = async (request: SubscriptionPaymentRequest, decision: 'approved' | 'rejected') => {
    setReviewingRequestId(request.id);
    setError('');
    try {
      await onReviewPaymentRequest(request.id, decision);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Could not review payment request.');
    } finally {
      setReviewingRequestId(null);
    }
  };

  return (
    <div className="space-y-6 text-xs text-[#e9ecef]">
      <section className="rounded-3xl border border-[#2e3442] bg-[#242832] p-5 shadow-xl sm:p-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[#db6937]/15 p-2 text-[#db6937]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Enable Subscription Mode</h2>
              <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-[#b2b1ad]">
                When enabled, the server only authorizes playback for signed-in accounts with an active, unexpired subscription. Catalog browsing stays public.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-[#3e4555] bg-[#1a1c23] px-4 py-3">
            <span className={`min-w-14 text-right text-[11px] font-bold uppercase tracking-wider ${
              generalSettings.subscriptionModeEnabled ? 'text-emerald-400' : 'text-[#858b98]'
            }`}>
              {generalSettings.subscriptionModeEnabled ? 'ON' : 'OFF'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={generalSettings.subscriptionModeEnabled}
              aria-busy={isUpdatingSubscriptionMode}
              aria-label="Enable Subscription Mode"
              disabled={isUpdatingSubscriptionMode}
              onClick={async () => {
                const enabled = !generalSettings.subscriptionModeEnabled;
                setError('');
                setIsUpdatingSubscriptionMode(true);
                try {
                  await onUpdateGeneralSettings({ subscriptionModeEnabled: enabled });
                } catch (updateError) {
                  setError(updateError instanceof Error ? updateError.message : 'Could not update subscription mode.');
                } finally {
                  setIsUpdatingSubscriptionMode(false);
                }
              }}
              className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f83d3] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1c23] disabled:cursor-wait disabled:opacity-70 ${
                generalSettings.subscriptionModeEnabled
                  ? 'border-emerald-400/50 bg-emerald-500/30'
                  : 'border-[#4b5261] bg-[#343b4a]'
              }`}
            >
              <span className={`absolute h-6 w-6 rounded-full shadow-md transition-all duration-200 ${
                generalSettings.subscriptionModeEnabled
                  ? 'left-[calc(100%-1.625rem)] bg-emerald-400'
                  : 'left-1 bg-[#aeb4c0]'
              }`} />
            </button>
          </div>
        </div>
        <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[10px] leading-relaxed text-amber-200/80">
          Playback authorization is checked by this server. Because the configured player may use a third-party host, a URL already issued by that host may remain usable there; immediate revocation requires provider-side signed or authenticated playback.
        </p>
        {error && <p className="mt-3 text-xs text-rose-400" role="alert">{error}</p>}
      </section>

      <section className="rounded-3xl border border-[#2e3442] bg-[#242832] p-5 shadow-xl sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-bold text-white">
          <QrCode className="h-5 w-5 text-[#4f83d3]" /> GCash & Maya payment details
        </h2>
        <p className="mt-1 text-[11px] text-[#b2b1ad]">
          These details are shown to users on the subscription page. Only configure accounts you control.
        </p>
        <form onSubmit={handleSavePaymentSettings} className="mt-5 grid gap-5 lg:grid-cols-2">
          {([
            { key: 'gcash', label: 'GCash' },
            { key: 'maya', label: 'Maya' }
          ] as const).map(method => (
            <fieldset key={method.key} className="space-y-3 rounded-2xl border border-[#343b4a] bg-[#1a1c23] p-4">
              <legend className="px-2 text-sm font-bold text-white">{method.label}</legend>
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-[#b2b1ad]">Account display name</span>
                <input
                  name={`${method.key}DisplayName`}
                  defaultValue={paymentSettings[`${method.key}DisplayName`]}
                  maxLength={120}
                  className="w-full rounded-xl border border-[#3e4555] bg-[#242832] px-3 py-2.5 text-xs text-white"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-[#b2b1ad]">Mobile/account number</span>
                <input
                  name={`${method.key}AccountNumber`}
                  defaultValue={paymentSettings[`${method.key}AccountNumber`]}
                  maxLength={40}
                  className="w-full rounded-xl border border-[#3e4555] bg-[#242832] px-3 py-2.5 text-xs text-white"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-[#b2b1ad]">QR image URL (optional)</span>
                <input
                  name={`${method.key}QrImageUrl`}
                  type="text"
                  defaultValue={paymentSettings[`${method.key}QrImageUrl`]}
                  maxLength={500}
                  placeholder="https://…"
                  className="w-full rounded-xl border border-[#3e4555] bg-[#242832] px-3 py-2.5 text-xs text-white placeholder:text-[#6c757d]"
                />
              </label>
            </fieldset>
          ))}
          <div className="flex flex-col gap-3 lg:col-span-2 sm:flex-row sm:items-center sm:justify-between">
            {error && <p className="text-xs text-rose-400" role="alert">{error}</p>}
            <button
              type="submit"
              disabled={isSavingPaymentSettings}
              className="rounded-xl bg-[#4f83d3] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#db6937] disabled:opacity-50 sm:ml-auto"
            >
              {isSavingPaymentSettings ? 'Saving…' : 'Save payment details'}
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-3xl border border-[#2e3442] bg-[#242832] shadow-xl">
        <div className="border-b border-[#2e3442] p-5">
          <h2 className="text-base font-bold text-white">Manual payment review</h2>
          <p className="mt-1 text-[11px] text-amber-200">
            Verify each transfer in GCash or Maya before approving. Approval immediately activates or extends the user's plan.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead className="bg-[#1e2129] text-[10px] uppercase tracking-wider text-[#b2b1ad]">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Plan / Method</th>
                <th className="px-4 py-3">Transaction reference</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2129]">
              {paymentRequests.map(request => {
                const plan = SUBSCRIPTION_PLANS.find(item => item.id === request.planId);
                return (
                  <tr key={request.id}>
                    <td className="px-4 py-3">
                      <span className="block font-semibold text-white">{request.displayName || request.username}</span>
                      <span className="text-[10px] text-[#858b98]">{request.email}</span>
                    </td>
                    <td className="px-4 py-3 text-white">
                      {plan?.title || request.planId} · PHP {plan?.pricePhp ?? '—'} · {request.provider.toUpperCase()}
                      <span className="mt-1 block text-[10px] text-[#858b98]">{new Date(request.createdAt).toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-white">{request.transactionReference}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        request.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400'
                          : request.status === 'rejected' ? 'bg-rose-500/10 text-rose-400'
                            : 'bg-amber-500/10 text-amber-300'
                      }`}>{request.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      {request.status === 'pending' ? (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => void handleReviewPayment(request, 'approved')}
                            disabled={reviewingRequestId === request.id}
                            className="rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white disabled:opacity-50"
                          >Approve</button>
                          <button
                            type="button"
                            onClick={() => void handleReviewPayment(request, 'rejected')}
                            disabled={reviewingRequestId === request.id}
                            className="rounded-lg bg-rose-600/80 px-3 py-2 font-semibold text-white disabled:opacity-50"
                          >Reject</button>
                        </div>
                      ) : <span className="block text-right text-[#858b98]">{request.reviewedAt ? new Date(request.reviewedAt).toLocaleString() : '—'}</span>}
                    </td>
                  </tr>
                );
              })}
              {paymentRequests.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-[#858b98]">No payment requests to review.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-[#2e3442] bg-[#242832] shadow-xl">
        <div className="flex items-center justify-between border-b border-[#2e3442] p-5">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-white">
              <CreditCard className="h-5 w-5 text-[#4f83d3]" /> User subscriptions
            </h2>
            <p className="mt-1 text-[11px] text-[#b2b1ad]">
              Manage access manually. Expiration is checked on every playback authorization request.
            </p>
          </div>
          <span className="rounded-full bg-[#1a1c23] px-3 py-1 text-[10px] text-[#b2b1ad]">{subscriptions.length} accounts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-[#1e2129] text-[10px] uppercase tracking-wider text-[#b2b1ad]">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3 text-right">Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2129]">
              {subscriptions.map(subscription => (
                <tr key={subscription.username}>
                  <td className="px-4 py-3">
                    <span className="block font-semibold text-white">{subscription.displayName || subscription.username}</span>
                    <span className="text-[10px] text-[#858b98]">{subscription.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClassNames[subscription.status]}`}>
                      {subscription.status === 'none' ? 'No subscription' : subscription.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <form
                      id={`subscription-${subscription.username}`}
                      onSubmit={event => {
                        event.preventDefault();
                        void handleSave(subscription, event.currentTarget);
                      }}
                      className="flex items-center gap-2"
                    >
                      <select
                        name="status"
                        defaultValue={subscription.status}
                        className="rounded-lg border border-[#3e4555] bg-[#1a1c23] px-2 py-2 text-white"
                        aria-label={`Subscription status for ${subscription.username}`}
                      >
                        <option value="none">No subscription</option>
                        <option value="active">Active</option>
                        <option value="expired">Expired</option>
                        <option value="canceled">Canceled</option>
                      </select>
                      <input
                        name="expiresAt"
                        type="date"
                        defaultValue={subscription.expiresAt ? subscription.expiresAt.slice(0, 10) : ''}
                        className="rounded-lg border border-[#3e4555] bg-[#1a1c23] px-2 py-2 text-white"
                        aria-label={`Expiration date for ${subscription.username}`}
                      />
                    </form>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="submit"
                      form={`subscription-${subscription.username}`}
                      disabled={savingUsername === subscription.username}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#4f83d3] px-3 py-2 font-semibold text-white hover:bg-[#db6937] disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {savingUsername === subscription.username ? 'Saving…' : 'Save'}
                    </button>
                  </td>
                </tr>
              ))}
              {subscriptions.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-[#858b98]">No user accounts found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
