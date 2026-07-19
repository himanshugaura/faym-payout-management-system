import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export function WalletPanel({ userId, refreshTrigger }) {
  const [wallet, setWallet] = useState(null);
  const [amount, setAmount] = useState(50); 
  const [loading, setLoading] = useState(false);
  const [simulationMode, setSimulationMode] = useState('RANDOM');

  useEffect(() => {
    if (userId) loadWallet();
  }, [userId, refreshTrigger]);

  const loadWallet = async () => {
    try {
      const res = await api.getWalletHistory(userId);
      setWallet(res.data);
    } catch (err) {
      toast.error('Failed to load wallet');
    }
  };


  const handleWithdrawal = async (e) => {
    e.preventDefault();
    if (amount <= 0) return toast.error('Enter valid amount');
    setLoading(true);
    try {
      const payload = { userId, amountPaise: amount * 100 };
      if (simulationMode !== 'RANDOM') {
        payload.forceStatus = simulationMode;
      }
      const res = await api.initiateWithdrawal(payload);
      
      const gw = res.data.gateway;
      if (gw.status === 'SUCCESS') {
        toast.success(`Withdrawal Successful! (Ref: ${gw.ref})`);
      } else {
        toast.error(`Withdrawal Failed: ${gw.failureReason}. Amount auto-refunded.`);
      }
      setAmount(50);
      await loadWallet();
    } catch (err) {
      // Typically the 24 hour restriction
      toast.error(err.message || 'Withdrawal rejected');
    } finally {
      setLoading(false);
    }
  };

  const formatType = (type) => {
    switch(type) {
      case 'ADVANCE_CREDIT': return { label: 'Advance (+)', color: 'default' };
      case 'FINAL_CREDIT': return { label: 'Final (+)', color: 'default' };
      case 'WITHDRAWAL_DEBIT': return { label: 'Withdrawal (-)', color: 'secondary' };
      case 'WITHDRAWAL_REFUND': return { label: 'Refund (+)', color: 'default' };
      case 'REJECTION_ADJUSTMENT': return { label: 'Clawback (-)', color: 'destructive' };
      case 'RECOVERY_DEDUCTION': return { label: 'Debt Recovery (-)', color: 'destructive' };
      default: return { label: type, color: 'outline' };
    }
  };

  if (!wallet) {
    return (
      <Card className="h-full flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Select a user to view wallet</p>
      </Card>
    );
  }

  const balance = (Number(wallet.balancePaise) / 100).toFixed(2);
  const pendingRecovery = (Number(wallet.pendingRecoveryPaise || 0) / 100).toFixed(2);

  return (
    <div className="flex flex-col h-full gap-6">
      <Card className="flex-1 flex flex-col relative overflow-hidden">
        {pendingRecovery > 0 && (
          <div className="bg-destructive text-destructive-foreground px-4 py-2 text-sm font-medium flex justify-between items-center">
            <span>⚠️ Pending Debt Recovery (Will be deducted from future payouts)</span>
            <span>-₹{pendingRecovery}</span>
          </div>
        )}
      <CardHeader className="bg-primary/5 pb-8 border-b">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-4xl font-bold tracking-tight">₹{balance}</CardTitle>
            <CardDescription className="mt-2">Available Balance</CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-6">
        <form onSubmit={handleWithdrawal} className="flex gap-4 items-end bg-muted/30 p-4 rounded-lg border">
          <div className="space-y-2 flex-1">
            <Label>Withdraw Funds (₹)</Label>
            <Input type="number" min="1" max={Number(wallet.balancePaise) / 100} value={amount} onChange={e => setAmount(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Gateway Simulation</Label>
            <select 
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={simulationMode}
              onChange={e => setSimulationMode(e.target.value)}
            >
              <option value="RANDOM">Random (70% Success)</option>
              <option value="SUCCESS">Force Success</option>
              <option value="FAILED">Force Failure</option>
            </select>
          </div>
          <Button type="submit" disabled={loading || wallet.balancePaise <= 0}>Withdraw</Button>
        </form>

        <div className="space-y-3">
          <h3 className="font-semibold text-lg tracking-tight">Transaction Ledger</h3>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wallet.walletTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">No transactions yet</TableCell>
                  </TableRow>
                )}
                {wallet.walletTransactions.map(tx => {
                  const t = formatType(tx.type);
                  const isPositive = !tx.type.includes('DEBIT') && !tx.type.includes('ADJUSTMENT') && !tx.type.includes('DEDUCTION');
                  return (
                    <TableRow key={tx.id}>
                      <TableCell><Badge variant={t.color}>{t.label}</Badge></TableCell>
                      <TableCell className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? '+' : '-'}₹{(Number(tx.amountPaise) / 100).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {tx.type === 'WITHDRAWAL_REFUND' && tx.withdrawal?.failureReason 
                          ? `Failed: ${tx.withdrawal.failureReason}` 
                          : tx.type.includes('CREDIT') && tx.sale?.brand 
                            ? `Sale: ${tx.sale.brand}` 
                            : '-'}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
      </Card>
    </div>
  );
}
