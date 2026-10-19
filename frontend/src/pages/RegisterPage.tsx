import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(form);
      navigate('/dashboard', { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create the account.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-form-card">
      <span className="eyebrow">Get started</span>
      <h2>Create your account</h2>
      <p className="form-intro">Your academic records stay scoped to you.</p>
      <form onSubmit={handleSubmit}>
        <label>
          Name
          <input autoComplete="name" value={form.name} onChange={(event) => update('name', event.target.value)} required />
        </label>
        <label>
          Email
          <input autoComplete="email" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} required />
        </label>
        <label>
          Password
          <input autoComplete="new-password" minLength={10} type="password" value={form.password} onChange={(event) => update('password', event.target.value)} required />
        </label>
        <label>
          Confirm password
          <input autoComplete="new-password" type="password" value={form.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} required />
        </label>
        {error ? <div className="form-error" role="alert">{error}</div> : null}
        <button className="primary-button" disabled={submitting} type="submit">
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="form-switch">
        Already registered? <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
}
