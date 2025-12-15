'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { 
  Lock, 
  Monitor,
  Edit3
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth';
import { useApplications } from '@/lib/hooks/useApplications';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user, isSignedIn, fetchUserProfile, updateProfile } = useAuthStore();
  const { applications } = useApplications({ autoFetch: isSignedIn });
  
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (!isSignedIn) {
      router.push('/login');
      return;
    }
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchUserProfile().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-white/70">{t('common.loading')}</div>
      </div>
    );
  }

  const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email?.split('@')[0] || 'User';
  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U';
  
  const activeApplications = applications.filter(app => app.status !== 'completed' && app.status !== 'cancelled').length;

  const handleEdit = (field: string) => {
    setIsEditing(field);
    setEditValues({ [field]: (user as any)[field] || '' });
  };

  const handleSave = async (field: string) => {
    setIsSaving(true);
    try {
      await updateProfile({ [field]: editValues[field] });
      setIsEditing(null);
      setEditValues({});
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(null);
    setEditValues({});
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Identity Header */}
      <div className="glass-panel relative overflow-hidden border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-6 shadow-[0_25px_55px_rgba(1,7,17,0.65)] backdrop-blur-xl sm:p-8">
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-primary-dark blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
          {/* Avatar Circle */}
          <div className="relative">
            <div className="flex h-18 w-18 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-2xl font-bold text-white shadow-[0_20px_40px_rgba(62,166,255,0.3)]">
              <span>{initials}</span>
            </div>
          </div>

          {/* Name */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">{displayName}</h1>
            <p className="mt-1 text-sm text-white/60">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Account Status Card */}
      <div className="glass-panel grid grid-cols-1 gap-4 border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl sm:grid-cols-3">
        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_currentColor]" />
            <p className="text-xs font-medium uppercase tracking-wider text-white/50">
              {i18n.language === 'uz' ? 'Hisob holati' : i18n.language === 'ru' ? 'Статус' : 'Status'}
            </p>
          </div>
          <p className="text-lg font-semibold text-white">
            {i18n.language === 'uz' ? 'Faol' : i18n.language === 'ru' ? 'Активен' : 'Active'}
          </p>
        </div>

        <button
          onClick={() => router.push('/applications')}
          className="rounded-xl border border-white/5 bg-white/[0.03] p-4 text-left transition-all hover:border-white/10 hover:bg-white/[0.05] active:scale-95"
        >
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/50">
            {i18n.language === 'uz' ? 'Arizalar' : i18n.language === 'ru' ? 'Заявки' : 'Applications'}
          </p>
          <p className="text-lg font-semibold text-white">{activeApplications} {i18n.language === 'uz' ? 'ta faol' : i18n.language === 'ru' ? 'активных' : 'active'}</p>
        </button>

        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/50">
            {i18n.language === 'uz' ? "O'rtacha" : i18n.language === 'ru' ? 'Средний' : 'Average'}
          </p>
          <p className="text-lg font-semibold text-white">
            {applications.length > 0 
              ? Math.round(applications.reduce((sum, app) => sum + (app.progressPercentage || 0), 0) / applications.length)
              : 0}%
          </p>
        </div>
      </div>

      {/* Personal Information */}
      <div className="glass-panel border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
        <h2 className="mb-6 text-lg font-semibold text-white">
          {i18n.language === 'uz' ? "Shaxsiy ma'lumotlar" : i18n.language === 'ru' ? 'Личные данные' : 'Personal Information'}
        </h2>
        <div className="space-y-4">
          {/* First Name */}
          <ProfileField
            label={i18n.language === 'uz' ? 'Ism' : i18n.language === 'ru' ? 'Имя' : 'First name'}
            value={user.firstName || t('profile.notProvided')}
            isEditing={isEditing === 'firstName'}
            editValue={editValues.firstName}
            onEdit={() => handleEdit('firstName')}
            onChange={(val) => setEditValues({ ...editValues, firstName: val })}
            onSave={() => handleSave('firstName')}
            onCancel={handleCancel}
            isSaving={isSaving}
          />

          {/* Last Name */}
          <ProfileField
            label={i18n.language === 'uz' ? 'Familiya' : i18n.language === 'ru' ? 'Фамилия' : 'Last name'}
            value={user.lastName || t('profile.notProvided')}
            isEditing={isEditing === 'lastName'}
            editValue={editValues.lastName}
            onEdit={() => handleEdit('lastName')}
            onChange={(val) => setEditValues({ ...editValues, lastName: val })}
            onSave={() => handleSave('lastName')}
            onCancel={handleCancel}
            isSaving={isSaving}
          />

          {/* Email */}
          <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 transition-all hover:border-white/10">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/50">
                Email
              </label>
              <p className="text-sm font-medium text-white">{user.email}</p>
            </div>
            <div className="text-xs text-white/30">
              {i18n.language === 'uz' ? "O'zgartirib bo'lmaydi" : i18n.language === 'ru' ? 'Неизменяемый' : 'Immutable'}
            </div>
          </div>

          {/* Phone */}
          <ProfileField
            label={i18n.language === 'uz' ? 'Telefon' : i18n.language === 'ru' ? 'Телефон' : 'Phone'}
            value={user.phone || t('profile.notProvided')}
            isEditing={isEditing === 'phone'}
            editValue={editValues.phone}
            onEdit={() => handleEdit('phone')}
            onChange={(val) => setEditValues({ ...editValues, phone: val })}
            onSave={() => handleSave('phone')}
            onCancel={handleCancel}
            isSaving={isSaving}
          />
        </div>
      </div>

      {/* Security & Access */}
      <div className="glass-panel border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
        <h2 className="mb-6 text-lg font-semibold text-white">
          {i18n.language === 'uz' ? 'Xavfsizlik va kirish' : i18n.language === 'ru' ? 'Безопасность и доступ' : 'Security & Access'}
        </h2>
        <div className="space-y-4">
          {/* Password */}
          <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/50">
                {i18n.language === 'uz' ? 'Parol' : i18n.language === 'ru' ? 'Пароль' : 'Password'}
              </label>
              <p className="text-sm font-medium text-white">••••••••</p>
              <p className="mt-1 text-xs text-white/40">
                {i18n.language === 'uz' ? "3 oy oldin o'zgartirilgan" : i18n.language === 'ru' ? 'Изменён 3 месяца назад' : 'Changed 3 months ago'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white"
              onClick={() => {/* TODO: Password change modal */}}
            >
              <Lock size={14} className="mr-1.5" />
              {i18n.language === 'uz' ? "O'zgartirish" : i18n.language === 'ru' ? 'Изменить' : 'Change'}
            </Button>
          </div>

          {/* Active Sessions */}
          <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/50">
                {i18n.language === 'uz' ? 'Faol seanslar' : i18n.language === 'ru' ? 'Активные сеансы' : 'Active sessions'}
              </label>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_currentColor]" />
                <p className="text-sm font-medium text-white">Windows · Chrome</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white"
              onClick={() => {/* TODO: Sessions drawer */}}
            >
              <Monitor size={14} className="mr-1.5" />
              {i18n.language === 'uz' ? "Ko'rish" : i18n.language === 'ru' ? 'Показать' : 'View'}
            </Button>
          </div>

          {/* 2FA Placeholder */}
          <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 opacity-50">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/50">
                {i18n.language === 'uz' ? 'Ikki bosqichli tekshirish' : i18n.language === 'ru' ? 'Двухфакторная аутентификация' : 'Two-factor authentication'}
              </label>
              <p className="text-sm font-medium text-white">
                {i18n.language === 'uz' ? "O'rnatilmagan" : i18n.language === 'ru' ? 'Не настроено' : 'Not set up'}
              </p>
            </div>
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-white/30">
              {i18n.language === 'uz' ? 'Tez orada' : i18n.language === 'ru' ? 'Скоро' : 'Coming soon'}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}

interface ProfileFieldProps {
  label: string;
  value: string;
  isEditing: boolean;
  editValue: string;
  onEdit: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

function ProfileField({
  label,
  value,
  isEditing,
  editValue,
  onEdit,
  onChange,
  onSave,
  onCancel,
  isSaving,
}: ProfileFieldProps) {
  if (isEditing) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/50">
            {label}
          </label>
          <input
            type="text"
            value={editValue}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-white/30"
            autoFocus
            disabled={isSaving}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="h-8 bg-primary text-white hover:bg-primary/80"
          >
            {isSaving ? '...' : '✓'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isSaving}
            className="h-8 text-white/70 hover:text-white"
          >
            ✕
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 transition-all hover:border-white/10">
      <div className="flex-1">
        <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-white/50">
          {label}
        </label>
        <p className="text-sm font-medium text-white">{value}</p>
      </div>
      <button
        onClick={onEdit}
        className="opacity-0 transition-opacity group-hover:opacity-100"
      >
        <Edit3 size={14} className="text-white/40 transition-colors hover:text-white/70" />
      </button>
    </div>
  );
}
