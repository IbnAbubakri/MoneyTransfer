"use client";

import { useEffect, useState } from "react";
import { getAuditLogs } from "@/lib/database";
import { AuditLog, Profile } from "@/lib/types";
import { ScrollText, Search } from "lucide-react";

type AuditLogWithProfile = AuditLog & { profiles: Profile };

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getAuditLogs().then((data) => {
      setLogs(data);
      setLoading(false);
    });
  }, []);

  const filtered = logs.filter(
    (log) =>
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(search.toLowerCase()) ||
      log.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.profiles?.email?.toLowerCase().includes(search.toLowerCase())
  );

  const actionColors: Record<string, string> = {
    status_changed_completed: "text-primary bg-primary/10",
    status_changed_cancelled: "text-destructive bg-destructive/10",
    status_changed_rejected: "text-destructive bg-destructive/10",
    status_changed_payment_confirmed: "text-primary bg-primary/10",
    status_changed_payment_under_review: "text-accent-foreground bg-accent",
    chat_message: "text-accent-foreground bg-accent",
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">{logs.length} recorded actions</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs..."
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
          <ScrollText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-card-foreground">No audit logs found</h3>
          <p className="text-muted-foreground">
            {search ? "Try a different search term" : "Actions will be recorded here"}
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Time
                  </th>
                  <th scope="col" className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    User
                  </th>
                  <th scope="col" className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Action
                  </th>
                  <th scope="col" className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Entity
                  </th>
                  <th scope="col" className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-accent transition-colors">
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-card-foreground">
                          {log.profiles?.full_name || "System"}
                        </p>
                        <p className="text-xs text-muted-foreground">{log.profiles?.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          actionColors[log.action] || "text-muted-foreground bg-accent"
                        }`}
                      >
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {log.entity_type}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs truncate">
                      {log.entity_id && (
                        <span className="font-mono text-xs">{log.entity_id.slice(0, 8)}...</span>
                      )}
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
