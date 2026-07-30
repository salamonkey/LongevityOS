import React, { useCallback, useState } from 'react';
import { Sheet, Button } from '../../design-system/components/index.js';
import { useTranslation } from '../../lib/i18n/index.js';
import {
  ALLOWED_FEEDBACK_CATEGORIES,
  FEEDBACK_DESCRIPTION_MAX_LENGTH,
  validateFeedbackReportInput,
} from './model.js';
import './feedback-sheet.css';

const CATEGORY_LABEL_KEYS = {
  bug: 'feedback.categoryBug',
  feedback: 'feedback.categoryFeedback',
  idea: 'feedback.categoryIdea',
  other: 'feedback.categoryOther',
};

export default function FeedbackSheet({ open = false, onClose, onSubmit, pending = false, errorMessage = '' }) {
  const { t } = useTranslation();
  const [category, setCategory] = useState(ALLOWED_FEEDBACK_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submittedAt, setSubmittedAt] = useState(0);

  // Memoized: Sheet's focus-management effect re-runs whenever this identity
  // changes, which would steal focus back to the close button on every
  // keystroke if this were redefined inline on each render.
  const handleClose = useCallback(() => {
    if (pending) return;
    onClose?.();
  }, [pending, onClose]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const { valid, errors } = validateFeedbackReportInput({ category, description });
    setFieldErrors(errors);
    if (!valid) return;

    const succeeded = await onSubmit({ category, description });
    if (succeeded) {
      setDescription('');
      setSubmittedAt(Date.now());
    }
  };

  return (
    <Sheet open={open} onClose={handleClose} title={t('feedback.sheetTitle')} closeLabel={t('common.close')}>
      <form className="vitalis-feedback-sheet-form" onSubmit={handleSubmit}>
        <span className="vitalis-settings-row-label">{t('feedback.categoryLabel')}</span>
        <div className="vitalis-seg">
          {ALLOWED_FEEDBACK_CATEGORIES.map((value) => (
            <button
              key={value}
              type="button"
              className={category === value ? 'is-active' : ''}
              onClick={() => setCategory(value)}
            >
              {t(CATEGORY_LABEL_KEYS[value])}
            </button>
          ))}
        </div>
        {fieldErrors.category ? (
          <p className="sl001-field-error" role="alert">{t(`feedback.${fieldErrors.category}`)}</p>
        ) : null}

        <label className="vitalis-feedback-sheet-label" htmlFor="feedback-description">
          {t('feedback.descriptionLabel')}
        </label>
        <textarea
          id="feedback-description"
          className="vitalis-feedback-sheet-textarea"
          value={description}
          placeholder={t('feedback.descriptionPlaceholder')}
          onChange={(event) => setDescription(event.target.value)}
        />
        {fieldErrors.description ? (
          <p className="sl001-field-error" role="alert">
            {t(`feedback.${fieldErrors.description}`, { max: FEEDBACK_DESCRIPTION_MAX_LENGTH })}
          </p>
        ) : null}

        {errorMessage ? <p className="sl001-field-error" role="alert">{errorMessage}</p> : null}
        {submittedAt ? <p className="vitalis-settings-saved" role="status">{t('feedback.submitSuccess')}</p> : null}

        <Button type="submit" variant="primary" fullWidth disabled={pending}>
          {pending ? t('feedback.submitting') : t('feedback.submit')}
        </Button>
      </form>
    </Sheet>
  );
}
