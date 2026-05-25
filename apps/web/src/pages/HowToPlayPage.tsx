import { Link } from 'react-router-dom';
import { useT } from '../i18n/index.js';

export function HowToPlayPage() {
  const t = useT();
  return (
    <article className="min-h-screen px-4 py-8 max-w-3xl mx-auto">
      <Link to="/" className="text-sm underline text-text-muted">
        {t('common.backHome')}
      </Link>
      <h1 className="font-display text-3xl mt-4">{t('rules.title')}</h1>

      <Section title={t('rules.s1.title')}>
        <p>{t('rules.s1.body')}</p>
      </Section>

      <Section title={t('rules.s2.title')}>
        <p>{t('rules.s2.body')}</p>
      </Section>

      <Section title={t('rules.s3.title')}>
        <p>{t('rules.s3.body')}</p>
      </Section>

      <Section title={t('rules.s4.title')}>
        <p>{t('rules.s4.body')}</p>
      </Section>

      <Section title={t('rules.s5.title')}>
        <ul className="list-disc list-inside space-y-1">
          <li>{t('rules.s5.l1')}</li>
          <li>{t('rules.s5.l2')}</li>
          <li>{t('rules.s5.l3')}</li>
          <li>{t('rules.s5.l4')}</li>
        </ul>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="font-display text-xl mb-2">{title}</h2>
      <div className="text-sm leading-relaxed">{children}</div>
    </section>
  );
}
