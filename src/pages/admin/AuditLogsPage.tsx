import React, { useEffect, useState } from 'react';
import { db } from '../../config/firebase';
import { collection, query, getDocs, limit, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { useParams } from 'react-router-dom';

export const AuditLogsPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!eventId) return;
      setLoading(true);
      try {
        const q = query(
          collection(db, 'auditLogs'), 
          where('eventId', '==', eventId),
          limit(100)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Fetch lookups
        const quizzesQ = query(collection(db, 'quizzes'), where('eventId', '==', eventId));
        const usersQ = query(collection(db, 'users'), where('eventId', '==', eventId));
        const [qSnap, uSnap] = await Promise.all([getDocs(quizzesQ), getDocs(usersQ)]);
        
        const qMap: Record<string, string> = {};
        qSnap.forEach(d => { qMap[d.id] = d.data().name; });
        
        const uMap: Record<string, string> = {};
        uSnap.forEach(d => { uMap[d.id] = d.data().name || d.data().email; });
        
        setLogs(data.map(log => {
          let readableMetadata = { ...log.metadata };
          if (readableMetadata.quizId) {
            readableMetadata.quizName = qMap[readableMetadata.quizId] || readableMetadata.quizId;
            delete readableMetadata.quizId;
          }
          if (readableMetadata.userId) {
            readableMetadata.userName = uMap[readableMetadata.userId] || readableMetadata.userId;
            delete readableMetadata.userId;
          }
          return {
            ...log,
            userName: log.userId === 'admin' ? 'Admin' : (uMap[log.userId] || log.userId),
            metadata: readableMetadata
          };
        }));
      } catch (error) {
        console.error("Error fetching logs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Audit Logs</h1>
        <p className="text-muted-foreground">Monitor system events and user activities.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
          <CardDescription>Showing the last 100 system events.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading logs...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3">Timestamp</th>
                    <th className="px-6 py-3">Event Type</th>
                    <th className="px-6 py-3">User ID</th>
                    <th className="px-6 py-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-border hover:bg-muted/50">
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        <span className={`px-2 py-1 rounded-full text-xs
                          ${log.eventType.includes('Disqualified') ? 'bg-destructive/10 text-destructive' : 
                            log.eventType.includes('Started') ? 'bg-blue-100 text-blue-700' : 'bg-muted text-foreground'}`}>
                          {log.eventType}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{log.userName || log.userId}</td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {log.metadata ? (
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(log.metadata).map(([key, value]) => (
                              <span key={key} className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground ring-1 ring-inset ring-secondary-foreground/10">
                                <span className="font-semibold mr-1 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span> 
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50 italic">No details</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">No logs found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
