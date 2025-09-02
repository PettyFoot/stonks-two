'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

interface CalculatorInputs {
  accountBalance: string;
  riskPercentage: string;
  entryPrice: string;
  stopLoss: string;
  targetPrice: string;
}

interface CalculatorResults {
  positionSize: number;
  dollarRisk: number;
  dollarProfit: number;
  riskRewardRatio: number;
  sharesQuantity: number;
  isValid: boolean;
}

export default function TradingCalculatorComponent() {
  const [inputs, setInputs] = useState<CalculatorInputs>({
    accountBalance: '10000',
    riskPercentage: '2',
    entryPrice: '100',
    stopLoss: '95',
    targetPrice: '110'
  });

  const calculateResults = useCallback((): CalculatorResults => {
    const balance = parseFloat(inputs.accountBalance) || 0;
    const riskPct = parseFloat(inputs.riskPercentage) || 0;
    const entry = parseFloat(inputs.entryPrice) || 0;
    const stop = parseFloat(inputs.stopLoss) || 0;
    const target = parseFloat(inputs.targetPrice) || 0;

    if (balance <= 0 || riskPct <= 0 || entry <= 0 || stop <= 0 || target <= 0) {
      return {
        positionSize: 0,
        dollarRisk: 0,
        dollarProfit: 0,
        riskRewardRatio: 0,
        sharesQuantity: 0,
        isValid: false
      };
    }

    const dollarRisk = (balance * riskPct) / 100;
    const riskPerShare = Math.abs(entry - stop);
    const profitPerShare = Math.abs(target - entry);
    const sharesQuantity = Math.floor(dollarRisk / riskPerShare);
    const positionSize = sharesQuantity * entry;
    const dollarProfit = sharesQuantity * profitPerShare;
    const riskRewardRatio = profitPerShare / riskPerShare;

    return {
      positionSize,
      dollarRisk,
      dollarProfit,
      riskRewardRatio,
      sharesQuantity,
      isValid: true
    };
  }, [inputs]);

  const results = calculateResults();

  const handleInputChange = (field: keyof CalculatorInputs, value: string) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const formatNumber = (num: number, decimals = 2) => 
    num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  return (
    <div className="space-y-8">
      {/* Input Section */}
      <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-[var(--theme-primary-text)] flex items-center">
            <Calculator className="h-6 w-6 mr-3" />
            Trading Calculator Inputs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="accountBalance" className="text-sm font-medium">
                Account Balance ($)
              </Label>
              <Input
                id="accountBalance"
                type="number"
                value={inputs.accountBalance}
                onChange={(e) => handleInputChange('accountBalance', e.target.value)}
                placeholder="10000"
                className="text-lg"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="riskPercentage" className="text-sm font-medium">
                Risk Per Trade (%)
              </Label>
              <Input
                id="riskPercentage"
                type="number"
                step="0.1"
                value={inputs.riskPercentage}
                onChange={(e) => handleInputChange('riskPercentage', e.target.value)}
                placeholder="2"
                className="text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="entryPrice" className="text-sm font-medium">
                Entry Price ($)
              </Label>
              <Input
                id="entryPrice"
                type="number"
                step="0.01"
                value={inputs.entryPrice}
                onChange={(e) => handleInputChange('entryPrice', e.target.value)}
                placeholder="100.00"
                className="text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stopLoss" className="text-sm font-medium">
                Stop Loss ($)
              </Label>
              <Input
                id="stopLoss"
                type="number"
                step="0.01"
                value={inputs.stopLoss}
                onChange={(e) => handleInputChange('stopLoss', e.target.value)}
                placeholder="95.00"
                className="text-lg"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="targetPrice" className="text-sm font-medium">
                Target Price ($)
              </Label>
              <Input
                id="targetPrice"
                type="number"
                step="0.01"
                value={inputs.targetPrice}
                onChange={(e) => handleInputChange('targetPrice', e.target.value)}
                placeholder="110.00"
                className="text-lg"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-[var(--theme-primary-text)] flex items-center">
            <TrendingUp className="h-6 w-6 mr-3" />
            Calculation Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          {results.isValid ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-[var(--theme-tertiary)]/10 p-6 rounded-lg">
                <div className="flex items-center mb-3">
                  <DollarSign className="h-5 w-5 text-[var(--theme-tertiary)] mr-2" />
                  <h3 className="font-semibold text-[var(--theme-primary-text)]">Position Size</h3>
                </div>
                <p className="text-2xl font-bold text-[var(--theme-primary-text)]">
                  {formatCurrency(results.positionSize)}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {formatNumber(results.sharesQuantity, 0)} shares
                </p>
              </div>

              <div className="bg-red-50 p-6 rounded-lg">
                <div className="flex items-center mb-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                  <h3 className="font-semibold text-red-800">Risk Amount</h3>
                </div>
                <p className="text-2xl font-bold text-red-800">
                  {formatCurrency(results.dollarRisk)}
                </p>
                <p className="text-sm text-red-600 mt-1">
                  Maximum loss on this trade
                </p>
              </div>

              <div className="bg-green-50 p-6 rounded-lg">
                <div className="flex items-center mb-3">
                  <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                  <h3 className="font-semibold text-green-800">Potential Profit</h3>
                </div>
                <p className="text-2xl font-bold text-green-800">
                  {formatCurrency(results.dollarProfit)}
                </p>
                <p className="text-sm text-green-600 mt-1">
                  If target price is reached
                </p>
              </div>

              <div className="md:col-span-2 lg:col-span-3 bg-[var(--theme-primary)]/10 p-6 rounded-lg">
                <h3 className="font-semibold text-[var(--theme-primary-text)] mb-3 flex items-center">
                  <Calculator className="h-5 w-5 mr-2" />
                  Risk/Reward Ratio
                </h3>
                <div className="flex items-center space-x-4">
                  <div className="text-3xl font-bold text-[var(--theme-primary-text)]">
                    1:{formatNumber(results.riskRewardRatio)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {results.riskRewardRatio >= 2 ? (
                      <span className="text-green-600 font-medium">✓ Good ratio</span>
                    ) : results.riskRewardRatio >= 1.5 ? (
                      <span className="text-yellow-600 font-medium">⚠ Acceptable ratio</span>
                    ) : (
                      <span className="text-red-600 font-medium">⚠ Poor ratio</span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  For every $1 risked, you could potentially make ${formatNumber(results.riskRewardRatio)}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertTriangle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                Enter Valid Values
              </h3>
              <p className="text-gray-500">
                Please fill in all fields with positive numbers to see your calculation results.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips Section */}
      <Card className="bg-yellow-50 border-yellow-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl text-yellow-800 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Trading Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-yellow-800">
          <p><strong>Risk Management:</strong> Never risk more than 1-3% of your account on a single trade.</p>
          <p><strong>Risk/Reward:</strong> Aim for at least a 1:2 risk/reward ratio (risk $1 to potentially make $2).</p>
          <p><strong>Position Sizing:</strong> Use position sizing to control your risk, not your potential profit.</p>
          <p><strong>Stop Losses:</strong> Always set a stop loss before entering a trade to limit potential losses.</p>
        </CardContent>
      </Card>
    </div>
  );
}