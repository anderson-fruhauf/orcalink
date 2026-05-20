import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth.js';
import logoIcon from '../assets/logo-icon.svg';
import '../styles/auth.css';

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'E-mail é obrigatório').email('E-mail inválido'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const ForgotPassword: React.FC = () => {
  const { sendPasswordReset } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await sendPasswordReset(data.email);
      toast.success('E-mail de redefinição enviado! Verifique sua caixa de entrada.');
      navigate('/login');
    } catch (error: any) {
      console.error('Password reset error:', error);
      let msg = 'Erro ao enviar e-mail de redefinição. Tente novamente.';
      if (error.code === 'auth/user-not-found') {
        // Por segurança e UX, podemos mostrar sucesso genérico ou mensagem amigável
        msg = 'Se este e-mail estiver cadastrado, uma mensagem de redefinição será enviada.';
        toast.success(msg);
        navigate('/login');
        return;
      } else if (error.code === 'auth/invalid-email') {
        msg = 'E-mail inválido.';
      }
      toast.error(msg);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo-wrapper">
          <div className="auth-logo">
            <img src={logoIcon} alt="Orçalink Logo" />
            <span>Orçalink</span>
          </div>
        </div>

        <div className="auth-header">
          <div className="auth-icon-circle">
            {/* Key / Lock icon simple placeholder */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h1 className="auth-title">Esqueceu a senha?</h1>
          <p className="auth-subtitle">Não se preocupe! Insira seu e-mail para receber as instruções de recuperação.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="email">E-mail Cadastrado</label>
            <input
              id="email"
              type="email"
              placeholder="seu@email.com"
              className={`form-input ${errors.email ? 'form-input-error' : ''}`}
              {...register('email')}
            />
            {errors.email && <span className="error-message">{errors.email.message}</span>}
          </div>

          <button type="submit" disabled={isSubmitting} className="auth-btn-primary">
            {isSubmitting ? 'Enviando...' : 'Enviar Instruções'}
          </button>
        </form>

        <Link to="/login" className="auth-back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Voltar para o Login
        </Link>
      </div>
    </div>
  );
};
