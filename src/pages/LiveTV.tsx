import React, { useEffect, useState } from 'react';
import { db } from '../config/firebase';
import { collection, query, onSnapshot, getDocs, where } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

import logo from '../assets/hero.png';

export const LiveTV: React.FC = () => {
  const [results, setResults] = useState<any[]>([]);

  const [courses, setCourses] = useState<Record<string, string>>({});
  const [activeUsers, setActiveUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const coursesSnap = await getDocs(collection(db, 'courses'));
        const coursesMap: Record<string, string> = {};
        coursesSnap.forEach(doc => {
          coursesMap[doc.id] = doc.data().name;
        });
        setCourses(coursesMap);
      } catch (err) {
        console.error("Failed to fetch courses for Live TV:", err);
      }
    };
    
    const fetchActiveUsers = async () => {
      try {
        // First get the active event
        const eventsQuery = query(collection(db, 'events'), where('status', '==', 'active'));
        const eventSnap = await getDocs(eventsQuery);
        if (eventSnap.empty) return;
        const activeEventId = eventSnap.docs[0].id;

        // Get all users for the active event
        const usersQuery = query(collection(db, 'users'), where('eventId', '==', activeEventId));
        const unsubscribeUsers = onSnapshot(usersQuery, (snap) => {
          const userIds = new Set(snap.docs.map(doc => doc.id));
          setActiveUsers(userIds);
        });
        return unsubscribeUsers;
      } catch (err) {
        console.error("Failed to fetch active users for Live TV:", err);
      }
    };

    fetchCourses();
    const unsubPromise = fetchActiveUsers();
    
    return () => {
      unsubPromise.then(unsub => {
        if (unsub) unsub();
      });
    };
  }, []);

  useEffect(() => {
    // Listen to all results dynamically
    const q = query(collection(db, 'results'));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      let data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      // Filter out results for users that have been deleted or don't belong to the active event
      data = data.filter(result => activeUsers.has(result.userId));
      
      // Sort by score descending, then time
      data.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return new Date(a.completedAt || 0).getTime() - new Date(b.completedAt || 0).getTime();
      });
      
      setResults(data.slice(0, 10)); // Top 10
    });

    return () => unsubscribe();
  }, [activeUsers]);

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col overflow-hidden selection:bg-primary/30">
      <header className="px-12 py-8 bg-slate-50 border-b border-slate-200 flex justify-between items-center shadow-sm z-10">
        <div className="flex items-center gap-6">
          <img src={logo} alt="AESCION Logo" className="h-14 w-auto" />
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
              LIVE LEADERBOARD
            </h1>
            <p className="text-slate-500 mt-2 text-lg font-medium">Real-time Assessment Standings</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex h-4 w-4 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
          </div>
          <span className="text-xl font-medium tracking-widest uppercase text-red-500">LIVE</span>
        </div>
      </header>

      <main className="flex-1 p-12 bg-slate-50/50">
        <div className="max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-[100px_1fr_2fr_150px] gap-6 px-8 py-4 text-slate-500 font-bold uppercase tracking-wider text-sm border-b border-slate-200">
            <div>Rank</div>
            <div>Student Name</div>
            <div>Course</div>
            <div className="text-right">Score</div>
          </div>

          <div className="mt-4 space-y-4">
            <AnimatePresence>
              {results.map((result, index) => (
                <motion.div
                  key={result.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  className={`grid grid-cols-[100px_1fr_2fr_150px] gap-6 px-8 py-6 items-center rounded-2xl border bg-white shadow-sm transition-all ${
                    index === 0 ? 'bg-gradient-to-r from-amber-50 to-amber-100/50 border-amber-200 shadow-[0_4px_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-400' :
                    index === 1 ? 'border-slate-300 shadow-[0_4px_15px_rgba(0,0,0,0.05)] bg-slate-50' :
                    index === 2 ? 'border-amber-200/50 bg-orange-50/30' :
                    'border-slate-100 hover:border-slate-200 hover:shadow-md'
                  }`}
                >
                  <div className={`text-3xl font-black ${
                    index === 0 ? 'text-amber-500 drop-shadow-sm' :
                    index === 1 ? 'text-slate-400' :
                    index === 2 ? 'text-amber-600/80' :
                    'text-slate-300'
                  }`}>
                    #{index + 1}
                  </div>
                  <div className="text-2xl font-bold truncate text-slate-800">{result.userName}</div>
                  <div className="text-lg text-slate-500 font-medium truncate">{courses[result.courseId] || result.courseId}</div>
                  <div className="text-right">
                    <span className={`text-3xl font-black ${
                      result.isDisqualified ? 'text-red-500' : 'text-blue-600'
                    }`}>
                      {result.isDisqualified ? 'DQ' : result.score}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {results.length === 0 && (
              <div className="text-center py-20 text-slate-500 text-xl font-medium">
                Waiting for results...
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
