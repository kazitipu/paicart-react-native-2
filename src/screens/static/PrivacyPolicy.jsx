import React from 'react';
import ContentPage from '@/components/ContentPage';
import { LEGAL_CONTENT } from '@/data/legalContent';

export default function PrivacyPolicy() {
  return <ContentPage doc={LEGAL_CONTENT.privacyPolicy} />;
}
