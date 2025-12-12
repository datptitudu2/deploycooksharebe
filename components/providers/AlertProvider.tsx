import React from 'react';
import { useAlertService } from '@/services/alertService';

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const { AlertComponent } = useAlertService();

  return (
    <>
      {children}
      {AlertComponent}
    </>
  );
}

