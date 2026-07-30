import React from 'react';
import { Sheet } from '../../design-system/components/index.js';
import { useTranslation } from '../../lib/i18n/index.js';
import './invite-only-faq.css';

const QUESTION_KEYS = ['access', 'why', 'howLong'];

export default function InviteOnlyFaq({ open, onClose }) {
  const { t } = useTranslation();

  return (
    <Sheet open={open} onClose={onClose} title={t('inviteOnlyFaq.title')} closeLabel={t('common.close')}>
      <div className="vitalis-invite-only-faq">
        <p className="vitalis-invite-only-faq-intro">{t('inviteOnlyFaq.intro')}</p>
        {QUESTION_KEYS.map((key) => (
          <div key={key} className="vitalis-invite-only-faq-item">
            <h3>{t(`inviteOnlyFaq.question.${key}`)}</h3>
            <p>{t(`inviteOnlyFaq.answer.${key}`)}</p>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
