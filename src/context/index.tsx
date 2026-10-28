import React from 'react';
import { AuthProvider } from './AuthContext';
import { KycGateProvider } from './KycGateContext';
import { SettingsProvider } from './SettingsContext';
import { WalletProvider } from './WalletContext';
import { SecurityProvider } from './SecurityContext';

export * from './AuthContext';
export * from './KycGateContext';
export * from './SettingsContext';
export * from './WalletContext';
export * from './SecurityContext';

/**
 * Root context provider tree for the Gutter app.
 * Nests AuthProvider -> KycGateProvider -> SettingsProvider -> WalletProvider -> SecurityProvider.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <KycGateProvider>
        <SettingsProvider>
          <WalletProvider>
            <SecurityProvider>{children}</SecurityProvider>
          </WalletProvider>
        </SettingsProvider>
      </KycGateProvider>
    </AuthProvider>
  );
}
