'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings, Columns, Trash2 } from 'lucide-react';
import ColumnSettingsModal from '@/components/ColumnSettingsModal';
import { ColumnConfiguration } from '@/types';

interface TradesSettingsMenuProps {
  onColumnsChange: (columns: ColumnConfiguration[]) => void;
  className?: string;
}

export default function TradesSettingsMenu({
  onColumnsChange,
  className = ''
}: TradesSettingsMenuProps) {
  const router = useRouter();
  const columnModalTriggerRef = useRef<HTMLButtonElement>(null);

  const handleDeleteTrades = () => {
    router.push('/delete');
  };

  const handleOpenColumnSettings = () => {
    // Trigger the hidden column settings button
    columnModalTriggerRef.current?.click();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className={`h-8 ${className}`}>
            <Settings className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleOpenColumnSettings}>
            <Columns className="mr-2 h-4 w-4" />
            <span>Columns</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDeleteTrades}>
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete Trades</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Hidden Column Settings Modal trigger */}
      <div style={{ display: 'none' }}>
        <ColumnSettingsModal
          onColumnsChange={onColumnsChange}
          trigger={<button ref={columnModalTriggerRef} />}
        />
      </div>
    </>
  );
}
