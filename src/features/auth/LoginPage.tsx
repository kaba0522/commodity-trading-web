import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Field } from '../../components/common/controls';
import {
  OTP_LENGTH,
  RESEND_COOLDOWN_S,
  authService,
  isValidPhone,
} from '../../services/authService';
import { useAuth } from '../../store/AuthContext';

/**
 * Admin sign-in. Invite-only + OTP, matching the product story from the
 * original panel ("they can sign in with OTP straight away").
 * Live backend: POST /auth/login { phone: "+91…" } then
 * POST /auth/verify-otp { phone, otp } (dev backend accepts 1111).
 * Demo mode keeps the local OTP flow with the code shown on-screen.
 */
export function LoginPage() {
  const { user, requestOtp, verifyOtp, isLive } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { from?: string; expired?: boolean } | null;
  const from = state?.from ?? '/dash';
  const expired = state?.expired === true;

  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  if (user) return <Navigate to={from} replace />;

  const setDigits = (raw: string) => {
    setPhone(raw.replace(/\D/g, '').slice(0, 10));
    setError(null);
  };
  // Display grouping: 98108 71966. Stored state stays digits-only.
  const grouped = phone.length > 5 ? `${phone.slice(0, 5)} ${phone.slice(5)}` : phone;
  const showPhoneError = (touched || submitAttempted) && !isValidPhone(phone);

  const sendCode = async () => {
    setSubmitAttempted(true);
    if (!isValidPhone(phone)) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await requestOtp(phone);
      setDemoCode(res.demoCode);
      setStep('code');
      setCooldown(RESEND_COOLDOWN_S);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the code. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async () => {
    setBusy(true);
    setError(null);
    try {
      await verifyOtp(phone, code);
      navigate(from, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, background: 'var(--color-neutral-200)',
    }}
    >
      <div style={{ width: 420, maxWidth: '100%' }}>
        <div style={{ marginBottom: 18, textAlign: 'center' }}>
          <div style={{ fontSize: 11, letterSpacing: '.16em', color: 'var(--color-accent-700)', fontWeight: 700 }}>
            KKPK PLATFORM
          </div>
          <h1 style={{ fontSize: 26, margin: '6px 0 4px' }}>Admin console</h1>
          <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
            Invite-only. Sign in with an OTP sent to your mobile number.
          </p>
        </div>

        {expired ? (
          <div className="callout-info" role="status" style={{ marginBottom: 14 }}>
            <strong>Session expired.</strong> Your sign-in is no longer valid. Please sign in again.
          </div>
        ) : null}

        <div className="panel panel-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {step === 'phone' ? (
            <>
              <Field
                label="Mobile number"
                required
                error={error ?? (showPhoneError ? 'Enter a valid 10-digit mobile number.' : null)}
              >
                <div style={{ display: 'flex', gap: 7 }}>
                  <div className="input" style={{ width: 52, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>+91</div>
                  <input
                    className="input"
                    placeholder="98108 71966"
                    type="tel"
                    value={phone}
                    onChange={(e) => setDigits(e.target.value)}
                    onBlur={() => setTouched(true)}
                    onKeyDown={(e) => { if (e.key === 'Enter') void sendCode(); }}
                    inputMode="numeric"
                    autoComplete="tel-national"
                    pattern="[0-9]*"
                    maxLength={10}
                    autoFocus
                    required
                    style={{ minHeight: 44 }}
                    aria-invalid={showPhoneError || undefined}
                  />
                </div>
              </Field>
              <button
                className="btn btn-primary btn-block"
                onClick={() => void sendCode()}
                disabled={busy}
                style={{ minHeight: 44, fontSize: 14 }}
              >
                {busy ? 'Sending…' : 'Send OTP'}
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13 }}>
                Code sent to <strong>+91 {grouped}</strong>.{' '}
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 13, padding: 0 }}
                  onClick={() => { setStep('phone'); setCode(''); setError(null); }}
                >
                  Change number
                </button>
              </div>
              <Field label="4-digit code" required error={error}>
                <input
                  className="input"
                  placeholder="••••"
                  type="tel"
                  value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH)); setError(null); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') void submitCode(); }}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={OTP_LENGTH}
                  required
                  autoFocus
                  style={{ minHeight: 44, letterSpacing: 4, fontSize: 18, textAlign: 'center' }}
                />
              </Field>
              {demoCode && authService.isDemoMode() ? (
                <div className="callout-info">
                  <strong>Demo build</strong> — SMS delivery is not configured, so your code is{' '}
                  <strong style={{ fontSize: 16, letterSpacing: 2 }}>{demoCode}</strong>.
                  It expires in 5 minutes.
                </div>
              ) : null}
              {isLive ? (
                <div className="callout-info">
                  Only invited numbers can sign in. Non-admin roles are blocked from this console.
                </div>
              ) : null}
              <button className="btn btn-primary btn-block" onClick={() => void submitCode()} disabled={busy} style={{ minHeight: 44, fontSize: 14 }}>
                {busy ? 'Verifying…' : 'Sign in'}
              </button>
              <button
                className="btn btn-secondary btn-block"
                onClick={() => void sendCode()}
                disabled={busy || cooldown > 0}
                style={{ minHeight: 40, fontSize: 13 }}
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              </button>
            </>
          )}
        </div>

        <p className="text-muted" style={{ fontSize: 11.5, textAlign: 'center', marginTop: 14 }}>
          New here? An existing admin must invite you from Users &amp; access first.
        </p>
      </div>
    </div>
  );
}
