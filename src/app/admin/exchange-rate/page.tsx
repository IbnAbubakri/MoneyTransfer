"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getActiveExchangeRate,
  updateExchangeRate,
  getAllExchangeRates,
} from "@/lib/database";
import { ExchangeRate } from "@/lib/types";
import { TrendingUp, Save, Check, AlertCircle } from "lucide-react";

export default function AdminExchangeRatePage() {
  const { profile } = useAuth();
  const [currentRate, setCurrentRate] = useState<ExchangeRate | null>(null);
  const [rateHistory, setRateHistory] = useState<ExchangeRate[]>([]);
  const [newRate, setNewRate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getActiveExchangeRate(), getAllExchangeRates()]).then(
      ([active, history]) => {
        setCurrentRate(active);
        setRateHistory(history);
        setNewRate(active?.rate?.toString() || "430");
        setLoading(false);
      }
    );
  }, []);

  const handleSave = async () => {
    if (!profile || !newRate) return;
    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate <= 0) {
      setError("Please enter a valid rate");
      return;
    }

    setSaving(true);
    setError("");
    const ok = await updateExchangeRate(rate, profile.id);

    if (ok) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      const [active, history] = await Promise.all([
        getActiveExchangeRate(),
        getAllExchangeRates(),
      ]);
      setCurrentRate(active);
      setRateHistory(history);
    } else {
      setError("Failed to update exchange rate");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-card-foreground">Exchange Rate</h1>
        <p className="text-muted-foreground mt-1">Manage SAR to NGN exchange rate</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Current Active Rate</p>
            <p className="text-3xl font-bold text-card-foreground">
              ₦{currentRate?.rate?.toLocaleString() || "—"} <span className="text-base font-normal text-muted-foreground/60">per SAR</span>
            </p>
          </div>
        </div>

        <div className="border-t border-border pt-6">
          <label className="block text-sm font-medium text-foreground/80 mb-2">
            Update Rate (NGN per 1 SAR)
          </label>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 font-medium">
                ₦
              </span>
              <input
                type="number"
                value={newRate}
                onChange={(e) => {
                  setNewRate(e.target.value);
                  setError("");
                }}
                step="0.01"
                className="w-full pl-8 pr-4 py-3 text-lg font-semibold border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving || newRate === currentRate?.rate?.toString()}
              className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : success ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {success ? "Saved!" : "Update Rate"}
            </button>
          </div>
          {error && (
            <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-card-foreground">Rate History</h2>
        </div>
        {rateHistory.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">No rate history yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                    Rate
                  </th>
                  <th scope="col" className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                    Status
                  </th>
                  <th scope="col" className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rateHistory.map((r) => (
                  <tr key={r.id} className="hover:bg-accent">
                    <td className="px-6 py-3 text-sm font-semibold text-card-foreground">
                      ₦{r.rate.toLocaleString()}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          r.is_active
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground bg-accent"
                        }`}
                      >
                        {r.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
