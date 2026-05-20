import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth.js';
import logoIcon from '../assets/logo-icon.svg';
import '../styles/auth.css';

const registerSchema = z
  .object({
    name: z.string().min(2, 'O nome deve conter no mínimo 2 caracteres'),
    companyName: z.string().min(2, 'O nome da empresa deve conter no mínimo 2 caracteres'),
    email: z.string().min(1, 'E-mail é obrigatório').email('E-mail inválido'),
    password: z.string().min(6, 'A senha deve conter no mínimo 6 caracteres'),
    confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const { signUp, user, loading, prefilledEmail, setPrefilledEmail } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  useEffect(() => {
    if (prefilledEmail) {
      setValue('email', prefilledEmail);
    }
  }, [prefilledEmail, setValue]);

  useEffect(() => {
    if (user && user.backendUser && user.tenant) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await signUp(data.email, data.password, data.name, data.companyName);
      toast.success('Conta criada com sucesso! Seja bem-vindo.');
      setPrefilledEmail('');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      let msg = 'Erro ao criar conta. Tente novamente.';
      if (error.code === 'auth/email-already-in-use') {
        msg = 'Este e-mail já está em uso.';
      } else if (error.code === 'auth/invalid-email') {
        msg = 'E-mail inválido.';
      } else if (error.code === 'auth/weak-password') {
        msg = 'A senha escolhida é muito fraca.';
      } else if (error.response?.data?.message) {
        msg = error.response.data.message;
      }
      toast.error(msg);
    }
  };

  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
          <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container" style={{ minHeight: '110vh', padding: 'var(--space-8) var(--space-4)' }}>
      <div className="auth-card">
        <div className="auth-logo-wrapper">
          <div className="auth-logo">
            <img src={logoIcon} alt="Orçalink Logo" />
            <span>Orçalink</span>
          </div>
        </div>

        <div className="auth-header">
          <h1 className="auth-title">Crie sua conta</h1>
          <p className="auth-subtitle">Comece a gerenciar suas cotações hoje mesmo</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Seu Nome</label>
            <input
              id="name"
              type="text"
              placeholder="Ex: João Silva"
              className={`form-input ${errors.name ? 'form-input-error' : ''}`}
              {...register('name')}
            />
            {errors.name && <span className="error-message">{errors.name.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="companyName">Nome da Empresa</label>
            <input
              id="companyName"
              type="text"
              placeholder="Ex: Minha Empresa LTDA"
              className={`form-input ${errors.companyName ? 'form-input-error' : ''}`}
              {...register('companyName')}
            />
            {errors.companyName && <span className="error-message">{errors.companyName.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">E-mail Corporativo</label>
            <input
              id="email"
              type="email"
              placeholder="seu@email.com"
              className={`form-input ${errors.email ? 'form-input-error' : ''}`}
              {...register('email')}
            />
            {errors.email && <span className="error-message">{errors.email.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              className={`form-input ${errors.password ? 'form-input-error' : ''}`}
              {...register('password')}
            />
            {errors.password && <span className="error-message">{errors.password.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">Confirmar Senha</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Confirme sua senha"
              className={`form-input ${errors.confirmPassword ? 'form-input-error' : ''}`}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && <span className="error-message">{errors.confirmPassword.message}</span>}
          </div>

          <button type="submit" disabled={isSubmitting} className="auth-btn-primary">
            {isSubmitting ? 'Registrando...' : 'Criar Conta'}
          </button>

          <p className="auth-terms-text">
            Ao se registrar, você concorda com nossos{' '}
            <a href="#" className="auth-footer-link">Termos de Uso</a> e{' '}
            <a href="#" className="auth-footer-link">Política de Privacidade</a>.
          </p>
        </form>

        <div className="auth-divider">ou</div>

        <div className="auth-footer">
          Já possui uma conta?{' '}
          <Link to="/login" className="auth-footer-link">
            Fazer login
          </Link>
        </div>
      </div>
    </div>
  );
};
