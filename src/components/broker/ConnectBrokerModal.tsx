'use client';

import React from 'react';
import SnapTradeConnector from './SnapTradeConnector';

interface ConnectBrokerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionComplete: () => void;
}

export default function ConnectBrokerModal({
  isOpen,
  onClose,
  onConnectionComplete
}: ConnectBrokerModalProps) {

  return (
    <SnapTradeConnector
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onConnectionComplete}
    />
  );
}