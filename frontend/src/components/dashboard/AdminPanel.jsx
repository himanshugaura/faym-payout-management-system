import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

export function AdminPanel({ userId, onAdminAction, refreshTrigger }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) loadSales();
  }, [userId, refreshTrigger]);

  const loadSales = async () => {
    try {
      const res = await api.getSalesByUser(userId);
      setSales(res.data);
    } catch (err) {
      toast.error('Failed to load sales for admin view');
    }
  };

  const handleReconcile = async (saleId, status) => {
    try {
      await api.reconcileSale(saleId, status);
      toast.success(`Sale marked as ${status}`);
      await loadSales();
      onAdminAction();
    } catch (err) {
      toast.error(err.message || 'Failed to reconcile sale');
    }
  };

  const handleAdvancePayout = async () => {
    setLoading(true);
    try {
      const res = await api.triggerAdvancePayout(userId);
      if (res.data.salesProcessed > 0) {
        toast.success(`Processed ${res.data.salesProcessed} sales for ₹${(Number(res.data.totalAdvancePaise) / 100).toFixed(2)}`);
      } else {
        toast.info('No pending sales eligible for advance payout');
      }
      await loadSales();
      onAdminAction();
    } catch (err) {
      toast.error(err.message || 'Advance payout failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetCooldown = async () => {
    setLoading(true);
    try {
      await api.resetWithdrawalCooldown(userId);
      toast.success('24-hour withdrawal limit has been reset for testing!');
      onAdminAction();
    } catch (err) {
      toast.error('Failed to reset cooldown');
    } finally {
      setLoading(false);
    }
  };

  const getAdvanceAmount = (sale) => {
    const advanceTx = sale.walletTransactions?.filter(tx => tx.type === 'ADVANCE_CREDIT') || [];
    return advanceTx.reduce((sum, tx) => sum + Number(tx.amountPaise), 0);
  };

  const pendingSales = sales.filter(s => s.status === 'PENDING');
  const reconciledSales = sales.filter(s => s.status !== 'PENDING');

  return (
    <div className="flex flex-col h-full gap-6">
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Reconciliation Panel</CardTitle>
          <CardDescription>Approve or reject pending sales. The system auto-calculates final payouts and clawbacks.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {pendingSales.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">Pending Sales ({pendingSales.length})</h3>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Brand</TableHead>
                      <TableHead>Earning</TableHead>
                      <TableHead>Advance Paid</TableHead>
                      <TableHead>If Approved</TableHead>
                      <TableHead>If Rejected</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingSales.map(sale => {
                      const earning = Number(sale.earningPaise);
                      const advancePaid = getAdvanceAmount(sale);
                      const finalPayout = earning - advancePaid;
                      return (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">{sale.brand}</TableCell>
                          <TableCell>₹{(earning / 100).toFixed(2)}</TableCell>
                          <TableCell>
                            {advancePaid > 0
                              ? <span className="text-green-600 font-medium">₹{(advancePaid / 100).toFixed(2)}</span>
                              : <span className="text-muted-foreground">₹0.00</span>
                            }
                          </TableCell>
                          <TableCell>
                            <span className="text-green-600 font-medium">+₹{(finalPayout / 100).toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground ml-1">(₹{(earning / 100).toFixed(2)} - ₹{(advancePaid / 100).toFixed(2)})</span>
                          </TableCell>
                          <TableCell>
                            {advancePaid > 0
                              ? <span className="text-red-600 font-medium">-₹{(advancePaid / 100).toFixed(2)}</span>
                              : <span className="text-muted-foreground">No clawback</span>
                            }
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleReconcile(sale.id, 'APPROVED')}>Approve</Button>
                            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleReconcile(sale.id, 'REJECTED')}>Reject</Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {reconciledSales.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">Reconciled Sales ({reconciledSales.length})</h3>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Brand</TableHead>
                      <TableHead>Earning</TableHead>
                      <TableHead>Advance Paid</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Final Adjustment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reconciledSales.map(sale => {
                      const earning = Number(sale.earningPaise);
                      const advancePaid = getAdvanceAmount(sale);
                      const isApproved = sale.status === 'APPROVED';
                      const adjustment = isApproved ? earning - advancePaid : -advancePaid;
                      return (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">{sale.brand}</TableCell>
                          <TableCell>₹{(earning / 100).toFixed(2)}</TableCell>
                          <TableCell>₹{(advancePaid / 100).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={isApproved ? 'default' : 'destructive'}>
                              {sale.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`font-bold ${adjustment >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {adjustment >= 0 ? '+' : ''}₹{(adjustment / 100).toFixed(2)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {reconciledSales.length > 0 && (
                <div className="bg-muted/30 rounded-lg p-4 border text-sm mt-3">
                  <div className="flex justify-between font-semibold">
                    <span>Total Final Payout</span>
                    <span className={(() => {
                      const total = reconciledSales.reduce((sum, s) => {
                        const e = Number(s.earningPaise);
                        const a = getAdvanceAmount(s);
                        return sum + (s.status === 'APPROVED' ? e - a : -a);
                      }, 0);
                      return total >= 0 ? 'text-green-600' : 'text-red-600';
                    })()}>
                      ₹{(reconciledSales.reduce((sum, s) => {
                        const e = Number(s.earningPaise);
                        const a = getAdvanceAmount(s);
                        return sum + (s.status === 'APPROVED' ? e - a : -a);
                      }, 0) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {sales.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No sales found. Switch to User Dashboard to create sales first.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-orange-500/30 bg-orange-500/5 dark:bg-orange-500/10">
        <CardHeader>
          <CardTitle className="text-lg text-orange-600 dark:text-orange-400">System Jobs / Operations</CardTitle>
          <CardDescription>
            These controls simulate background processes or administrative overrides.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button onClick={handleAdvancePayout} disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white">
            Simulate Advance Payout Job
          </Button>
          <Button variant="outline" onClick={handleResetCooldown} disabled={loading} className="border-orange-600/50 text-orange-600 dark:text-orange-400 hover:bg-orange-600/10">
            Reset 24h Withdrawal Limit
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
