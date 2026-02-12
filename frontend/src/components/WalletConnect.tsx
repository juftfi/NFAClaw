'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export function WalletConnect() {
  const { t } = useLanguage();

  return (
    <div className="font-mono">
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          authenticationStatus,
          mounted,
        }) => {
          const ready = mounted && authenticationStatus !== 'loading';
          const connected =
            ready &&
            account &&
            chain &&
            (!authenticationStatus ||
              authenticationStatus === 'authenticated');

          return (
            <div
              {...(!ready && {
                'aria-hidden': true,
                style: {
                  opacity: 0,
                  pointerEvents: 'none' as const,
                  userSelect: 'none' as const,
                },
              })}
            >
              {(() => {
                if (!connected) {
                  return (
                    <button
                      onClick={openConnectModal}
                      className="bg-flap hover:bg-flap-dim text-white px-6 py-2 rounded-none border border-flap-glow font-mono text-sm uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(139,92,246,0.5)] hover:shadow-[0_0_20px_rgba(139,92,246,0.8)]"
                      type="button"
                    >
                      {t('wallet.connect')}
                    </button>
                  );
                }

                if (chain.unsupported) {
                  return (
                    <button
                      onClick={openChainModal}
                      className="bg-red-500 text-white px-4 py-2 rounded-none font-mono text-sm uppercase"
                      type="button"
                    >
                      {t('wallet.wrongNetwork')}
                    </button>
                  );
                }

                return (
                  <div className="flex items-center gap-4">
                    <button
                      onClick={openChainModal}
                      className="flex items-center gap-2 px-4 py-2 border border-border bg-surface hover:bg-surfaceHighlight transition-colors"
                      type="button"
                    >
                      {chain.hasIcon && (
                        <div
                          style={{
                            background: chain.iconBackground,
                            width: 12,
                            height: 12,
                            borderRadius: 999,
                            overflow: 'hidden',
                            marginRight: 4,
                          }}
                        >
                          {chain.iconUrl && (
                            <img
                              alt={chain.name ?? 'Chain icon'}
                              src={chain.iconUrl}
                              style={{ width: 12, height: 12 }}
                            />
                          )}
                        </div>
                      )}
                      <span className="font-mono text-xs text-gray-400 uppercase">
                        {chain.name}
                      </span>
                    </button>

                    <button
                      onClick={openAccountModal}
                      className="px-4 py-2 border border-flap/50 bg-flap/10 hover:bg-flap/20 text-flap-glow font-mono text-sm transition-colors"
                      type="button"
                    >
                      {account.displayName}
                      {account.displayBalance
                        ? ` (${account.displayBalance})`
                        : ''}
                    </button>
                  </div>
                );
              })()}
            </div>
          );
        }}
      </ConnectButton.Custom>
    </div>
  );
}
