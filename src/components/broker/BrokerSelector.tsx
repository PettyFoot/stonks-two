'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Building2, 
  Plus, 
  Check, 
  Loader2,
  Globe,
  Tag
} from 'lucide-react';

interface BrokerAlias {
  id: string;
  alias: string;
}

interface BrokerCsvFormat {
  id: string;
  formatName: string;
  usageCount: number;
  lastUsed?: string;
}

interface Broker {
  id: string;
  name: string;
  website?: string;
  aliases: BrokerAlias[];
  csvFormats: BrokerCsvFormat[];
}

interface BrokerSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBroker: (broker: Broker, brokerName: string) => void;
  onCreateBroker: (brokerName: string) => void;
  importBatchId?: string;
  fileName?: string;
}

export default function BrokerSelector({
  isOpen,
  onClose,
  onSelectBroker,
  onCreateBroker,
  importBatchId,
  fileName
}: BrokerSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [filteredBrokers, setFilteredBrokers] = useState<Broker[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<Broker | null>(null);
  const [customBrokerName, setCustomBrokerName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Load brokers on component mount
  useEffect(() => {
    if (isOpen) {
      console.log('🔍 BrokerSelector opened, loading brokers...');
      loadBrokers();
    }
  }, [isOpen]);

  // Filter brokers based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      console.log('📋 No search query, showing all brokers');
      setFilteredBrokers(brokers);
      return;
    }

    console.log(`🔎 Filtering brokers with query: "${searchQuery}"`);
    const query = searchQuery.toLowerCase();
    const filtered = brokers.filter(broker => 
      broker.name.toLowerCase().includes(query) ||
      broker.aliases.some(alias => alias.alias.toLowerCase().includes(query))
    );
    console.log(`✅ Found ${filtered.length} matching brokers`);
    setFilteredBrokers(filtered);
  }, [searchQuery, brokers]);

  const loadBrokers = async () => {
    setIsLoading(true);
    try {
      console.log('📡 Fetching brokers from API...');
      const response = await fetch('/api/brokers');
      
      if (!response.ok) {
        throw new Error('Failed to load brokers');
      }

      const data = await response.json();
      console.log(`✅ Loaded ${data.brokers.length} brokers`);
      setBrokers(data.brokers);
      setFilteredBrokers(data.brokers);
      
    } catch (error) {
      console.error('💥 Failed to load brokers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = async (value: string) => {
    setSearchQuery(value);
    
    // If query is long enough, search the API
    if (value.trim().length > 2) {
      setIsSearching(true);
      try {
        console.log(`🔍 Searching API for: "${value}"`);
        const response = await fetch(`/api/brokers?q=${encodeURIComponent(value)}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`🔎 API search returned ${data.brokers.length} results`);
          setBrokers(data.brokers);
        }
      } catch (error) {
        console.error('🔍 Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleSelectBroker = (broker: Broker) => {
    console.log(`✅ Selected broker: ${broker.name} (ID: ${broker.id})`);
    setSelectedBroker(broker);
  };

  const handleConfirmSelection = () => {
    if (selectedBroker) {
      console.log(`🚀 Confirming broker selection: ${selectedBroker.name}`);
      onSelectBroker(selectedBroker, selectedBroker.name);
    }
  };

  const handleCreateCustomBroker = () => {
    if (customBrokerName.trim()) {
      console.log(`➕ Creating custom broker: ${customBrokerName}`);
      onCreateBroker(customBrokerName.trim());
    }
  };

  const handleClose = () => {
    console.log('❌ BrokerSelector closing, resetting state');
    setSearchQuery('');
    setSelectedBroker(null);
    setCustomBrokerName('');
    setShowCreateForm(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Select Your Broker
          </DialogTitle>
          <DialogDescription>
            {fileName && (
              <span className="block text-sm text-muted-foreground mb-2">
                File: <code className="bg-muted px-1 rounded">{fileName}</code>
              </span>
            )}
            Choose your broker to properly map the CSV columns using AI. If your broker isn't listed, you can add it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for your broker (e.g., Interactive Brokers, Schwab, TD Ameritrade)..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
            )}
          </div>

          {/* Brokers List */}
          <ScrollArea className="flex-1 max-h-[400px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading brokers...</span>
              </div>
            ) : filteredBrokers.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No brokers found matching your search.' : 'No brokers available.'}
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setShowCreateForm(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Broker
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredBrokers.map((broker) => (
                  <Card 
                    key={broker.id}
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedBroker?.id === broker.id ? 'ring-2 ring-primary bg-primary/5' : ''
                    }`}
                    onClick={() => handleSelectBroker(broker)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium">{broker.name}</h3>
                            {selectedBroker?.id === broker.id && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          
                          {broker.website && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                              <Globe className="h-3 w-3" />
                              <span>{broker.website}</span>
                            </div>
                          )}
                          
                          {broker.aliases.length > 0 && (
                            <div className="flex items-center gap-2 mb-2">
                              <Tag className="h-3 w-3 text-muted-foreground" />
                              <div className="flex flex-wrap gap-1">
                                {broker.aliases.slice(0, 3).map((alias) => (
                                  <Badge key={alias.id} variant="secondary" className="text-xs">
                                    {alias.alias}
                                  </Badge>
                                ))}
                                {broker.aliases.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{broker.aliases.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {broker.csvFormats.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {broker.csvFormats.length} CSV format{broker.csvFormats.length !== 1 ? 's' : ''} available
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Create Custom Broker Form */}
          {showCreateForm && (
            <Card className="border-dashed bg-background">
              <CardContent className="p-4">
                <h4 className="font-medium mb-3">Add New Broker</h4>
                <div className="space-y-3">
                  <Input
                    placeholder="Enter broker name (e.g., My Custom Broker)"
                    value={customBrokerName}
                    onChange={(e) => setCustomBrokerName(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleCreateCustomBroker}
                      disabled={!customBrokerName.trim()}
                      size="sm"
                    >
                      Create & Select
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCreateForm(false)}
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Broker
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmSelection}
              disabled={!selectedBroker}
            >
              Continue with {selectedBroker?.name || 'Selected Broker'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}