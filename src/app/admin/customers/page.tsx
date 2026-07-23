"use client";

import { useEffect, useState } from "react";
import { getAllCustomers, updateCustomerStatus } from "@/lib/database";
import { Profile } from "@/lib/types";
import { Users, UserCheck, UserX, Search } from "lucide-react";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const data = await getAllCustomers();
      if (!cancelled) {
        setCustomers(data);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const handleToggle = async (customerId: string, currentStatus: boolean, name: string) => {
    const action = currentStatus ? "deactivate" : "activate";
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${name}?${currentStatus ? " This will block all their transactions." : ""}`)) return;
    setTogglingId(customerId);
    await updateCustomerStatus(customerId, !currentStatus);
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId ? { ...c, is_active: !currentStatus } : c
      )
    );
    setTogglingId(null);
  };

  const filtered = customers.filter(
    (c) =>
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">Customers</h1>
          <p className="text-muted-foreground mt-1">{customers.length} registered customers</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers..."
            aria-label="Search customers"
            className="pl-10 pr-4 py-2 border border-input rounded-lg text-sm focus:ring-2 focus:ring-ring focus:border-ring outline-none w-64"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-card-foreground">No customers found</h3>
          <p className="text-muted-foreground">
            {search ? "Try a different search term" : "No customers have signed up yet"}
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Customer
                  </th>
                  <th scope="col" className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Email
                  </th>
                  <th scope="col" className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Joined
                  </th>
                  <th scope="col" className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Action
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((customer) => (
                  <tr key={customer.id} className="hover:bg-accent transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                          {customer.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <span className="text-sm font-medium text-card-foreground">
                          {customer.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{customer.email}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(customer.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          customer.is_active
                            ? "text-primary bg-primary/10"
                            : "text-destructive bg-destructive/10"
                        }`}
                      >
                        {customer.is_active ? (
                          <UserCheck className="w-3 h-3" />
                        ) : (
                          <UserX className="w-3 h-3" />
                        )}
                        {customer.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleToggle(customer.id, customer.is_active, customer.full_name)}
                        disabled={togglingId === customer.id}
                        aria-label={customer.is_active ? `Deactivate ${customer.full_name}` : `Activate ${customer.full_name}`}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          customer.is_active
                            ? "text-destructive bg-destructive/10 hover:bg-destructive/20"
                            : "text-primary bg-primary/10 hover:bg-primary/20"
                        } disabled:opacity-50`}
                      >
                        {togglingId === customer.id
                          ? "..."
                          : customer.is_active
                          ? "Deactivate"
                          : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
