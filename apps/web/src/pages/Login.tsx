import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth.js';
import logoIcon from '../assets/logo-icon.svg';
import '../styles/auth.css';

const loginSchema = z.object({
  email: z.string().min(1, 'E-mail é obrigatório').email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve conter no mínimo 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const { signIn, user, loading, setPrefilledEmail } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (user) {
      if (user.backendUser && user.tenant) {
        navigate('/dashboard');
      } else {
        // Logado no Firebase mas sem registro local
        setPrefilledEmail(user.firebaseUser.email || '');
        navigate('/register');
      }
    }
  }, [user, navigate, setPrefilledEmail]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      const session = await signIn(data.email, data.password);
      if (!session.backendUser) {
        setPrefilledEmail(data.email);
        toast.error('Usuário não localizado no banco de dados local. Conclua o registro.');
        navigate('/register');
      } else {
        toast.success('Bem-vindo de volta ao Orçalink!');
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      let msg = 'Erro ao realizar login. Verifique suas credenciais.';
      if (
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/invalid-credential'
      ) {
        msg = 'E-mail ou senha incorretos.';
      } else if (error.code === 'auth/too-many-requests') {
        msg = 'Acesso temporariamente bloqueado devido a muitas tentativas. Tente mais tarde.';
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
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo-wrapper">
          <div className="auth-logo">
            <img src={logoIcon} alt="Orçalink Logo" />
            <span>Orçalink</span>
          </div>
        </div>

        <div className="auth-header">
          <h1 className="auth-title">Bem-vindo de volta</h1>
          <p className="auth-subtitle">Faça login para acessar seu painel</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="email">E-mail</label>
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
              placeholder="********"
              className={`form-input ${errors.password ? 'form-input-error' : ''}`}
              {...register('password')}
            />
            {errors.password && <span className="error-message">{errors.password.message}</span>}
          </div>

          <Link to="/forgot-password" className="forgot-password-link">
            Esqueceu a senha?
          </Link>

          <button type="submit" disabled={isSubmitting} className="auth-btn-primary">
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="auth-divider">ou</div>

        <div className="auth-footer">
          Não tem uma conta?{' '}
          <Link to="/register" className="auth-footer-link">
            Criar conta
          </Link>
        </div>
      </div>
    </div>
  );
};
