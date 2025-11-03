import { PublicI18nProvider } from '@/components/i18n-public-provider';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PublicI18nProvider>
      {children}
    </PublicI18nProvider>
  );
}