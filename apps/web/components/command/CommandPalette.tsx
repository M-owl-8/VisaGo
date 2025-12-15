'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Command } from 'cmdk';
import { Search, ArrowRight } from 'lucide-react';
import { getCommands, filterCommands } from '@/lib/commands/commands';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const allCommands = useMemo(() => getCommands(router, t), [router, t]);
  const filteredCommands = useMemo(
    () => filterCommands(allCommands, query),
    [allCommands, query]
  );

  // Group commands by category
  const commandsByCategory = useMemo(() => {
    const grouped: Record<string, typeof filteredCommands> = {
      navigation: [],
      actions: [],
      settings: [],
    };

    filteredCommands.forEach((cmd) => {
      grouped[cmd.category].push(cmd);
    });

    return grouped;
  }, [filteredCommands]);

  const handleSelect = (command: any) => {
    command.action();
    onClose();
    setQuery('');
  };

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        setQuery('');
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-[20vh] px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
          setQuery('');
        }
      }}
    >
      <Command
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/20 bg-midnight/95 shadow-2xl backdrop-blur-xl"
        shouldFilter={false} // We handle filtering ourselves
      >
        {/* Search Input */}
        <div className="flex items-center border-b border-white/10 px-4">
          <Search size={20} className="mr-3 text-white/60" />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder={t('commands.searchPlaceholder', 'Type a command or search...')}
            className="flex-1 bg-transparent py-4 text-sm text-white placeholder:text-white/40 outline-none"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded bg-white/10 px-1.5 text-xs text-white/60">
            Esc
          </kbd>
        </div>

        {/* Commands List */}
        <Command.List className="max-h-[400px] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <Command.Empty className="py-12 text-center text-sm text-white/60">
              {t('commands.noResults', 'No commands found')}
            </Command.Empty>
          ) : (
            <>
              {/* Navigation Commands */}
              {commandsByCategory.navigation.length > 0 && (
                <Command.Group
                  heading={t('commands.navigation', 'Navigation')}
                  className="mb-2"
                >
                  {commandsByCategory.navigation.map((cmd) => {
                    const Icon = cmd.icon;
                    return (
                      <Command.Item
                        key={cmd.id}
                        value={cmd.id}
                        onSelect={() => handleSelect(cmd)}
                        className="flex cursor-pointer items-center justify-between rounded-lg px-4 py-3 transition hover:bg-white/10 aria-selected:bg-white/10"
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={18} className="text-white/60" />
                          <span className="text-sm text-white">{cmd.label}</span>
                        </div>
                        {cmd.shortcut && (
                          <kbd className="text-xs text-white/50">{cmd.shortcut}</kbd>
                        )}
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              )}

              {/* Action Commands */}
              {commandsByCategory.actions.length > 0 && (
                <Command.Group
                  heading={t('commands.actions', 'Actions')}
                  className="mb-2"
                >
                  {commandsByCategory.actions.map((cmd) => {
                    const Icon = cmd.icon;
                    return (
                      <Command.Item
                        key={cmd.id}
                        value={cmd.id}
                        onSelect={() => handleSelect(cmd)}
                        className="flex cursor-pointer items-center justify-between rounded-lg px-4 py-3 transition hover:bg-white/10 aria-selected:bg-white/10"
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={18} className="text-primary" />
                          <span className="text-sm text-white">{cmd.label}</span>
                        </div>
                        {cmd.shortcut && (
                          <kbd className="text-xs text-white/50">{cmd.shortcut}</kbd>
                        )}
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              )}

              {/* Settings Commands */}
              {commandsByCategory.settings.length > 0 && (
                <Command.Group heading={t('commands.settings', 'Settings')}>
                  {commandsByCategory.settings.map((cmd) => {
                    const Icon = cmd.icon;
                    return (
                      <Command.Item
                        key={cmd.id}
                        value={cmd.id}
                        onSelect={() => handleSelect(cmd)}
                        className="flex cursor-pointer items-center justify-between rounded-lg px-4 py-3 transition hover:bg-white/10 aria-selected:bg-white/10"
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={18} className="text-white/60" />
                          <span className="text-sm text-white">{cmd.label}</span>
                        </div>
                        {cmd.shortcut && (
                          <kbd className="text-xs text-white/50">{cmd.shortcut}</kbd>
                        )}
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              )}
            </>
          )}
        </Command.List>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-xs text-white/50">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-white/10 px-1.5 py-0.5">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-white/10 px-1.5 py-0.5">↵</kbd> Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-white/10 px-1.5 py-0.5">Esc</kbd> Close
            </span>
          </div>
        </div>
      </Command>
    </div>
  );
}

