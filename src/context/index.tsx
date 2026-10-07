import React from 'react';
import { AuthProvider } from './AuthContext';
import { KycGateProvider } from './KycGateContext';
import { SettingsProvider } from './SettingsContext';
import { WalletProvider } from './WalletContext';

export * from './AuthContext';
export * from './KycGateContext';
export * from './SettingsContext';
export * from './WalletContext';

/**
 * Root context provider tree for the Gutter app.
 * Nests AuthProvider -> KycGateProvider -> SettingsProvider -> WalletProvider.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <KycGateProvider>
        <SettingsProvider>
          <WalletProvider>{children}</WalletProvider>
        </SettingsProvider>
      </KycGateProvider>
    </AuthProvider>
  );
}
