import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, CheckCircle2 } from 'lucide-react';

export const ParticipantDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [availableQuizzes, setAvailableQuizzes] = useState<any[]>([]);
  const [historyQuizzes, setHistoryQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.eventId || !user?.courseId || !user?.uid) return;
      try {
        // 1. Fetch all quizzes for this course
        const q = query(
          collection(db, 'quizzes'),
          where('eventId', '==', user.eventId),
          where('courseId', '==', user.courseId)
        );
        const querySnapshot = await getDocs(q);
        const allQuizzes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

        const available: any[] = [];
        const history: any[] = [];

        // 2. For each quiz, check if user has a participant record or result
        for (const quiz of allQuizzes) {
          const participantDoc = await getDoc(doc(db, 'participants', `${quiz.id}_${user.uid}`));
          const resultDoc = await getDoc(doc(db, 'results', `${quiz.id}_${user.uid}`));
          
          let hasCompleted = false;
          let isDisqualified = false;
          let score = 0;

          if (participantDoc.exists()) {
            const pData = participantDoc.data();
            if (pData.status === 'completed' || pData.status === 'disqualified') {
              hasCompleted = true;
              isDisqualified = pData.status === 'disqualified';
            }
          }

          if (resultDoc.exists()) {
            score = resultDoc.data().score;
            isDisqualified = resultDoc.data().isDisqualified;
            hasCompleted = true;
          }

          if (hasCompleted) {
            history.push({ ...quiz, score, isDisqualified });
          } else if (quiz.status === 'active') {
            available.push(quiz);
          }
        }

        setAvailableQuizzes(available);
        setHistoryQuizzes(history);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [user]);

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading your dashboard...</div>;
  }

  return (
    <div className="space-y-10 w-full pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {user?.name}. Here are your assessments.</p>
      </div>

      {/* Available Assessments Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" /> 
          Available Assessments
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {availableQuizzes.length === 0 ? (
            <Card className="col-span-full border-dashed bg-muted/30">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium">No Active Assessments</h3>
                <p className="text-muted-foreground mt-1">There are no active assessments right now. Please wait for an administrator to start one.</p>
              </CardContent>
            </Card>
          ) : (
            availableQuizzes.map((quiz) => (
              <Card key={quiz.id} className="overflow-hidden border-primary/20 shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-primary h-2 w-full animate-pulse"></div>
                <CardHeader>
                  <CardTitle className="text-xl">{quiz.name}</CardTitle>
                  <CardDescription className="line-clamp-2">{quiz.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm mb-6 text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    <span className="font-medium">Questions: {quiz.totalQuestions}</span>
                    <span className="font-medium text-primary">Duration: {quiz.duration}m</span>
                  </div>
                  <Button className="w-full text-base" onClick={() => navigate(`/participant/quiz/${quiz.id}/waiting`)}>
                    Enter Waiting Room
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* History Section */}
      <section className="space-y-4 pt-4 border-t border-border/50">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-muted-foreground" /> 
          Assessment History
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {historyQuizzes.length === 0 ? (
            <div className="col-span-full p-8 text-center text-muted-foreground border rounded-xl border-dashed">
              You haven't completed any assessments yet.
            </div>
          ) : (
            historyQuizzes.map((quiz) => (
              <Card key={quiz.id} className="overflow-hidden bg-card/50">
                <div className={`h-1.5 w-full ${quiz.isDisqualified ? 'bg-destructive/50' : 'bg-success/50'}`}></div>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg line-clamp-1">{quiz.name}</h3>
                      <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium ${quiz.isDisqualified ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
                        {quiz.isDisqualified ? 'Disqualified' : 'Completed'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-2xl font-bold">{quiz.score}</span>
                      <span className="text-xs text-muted-foreground">Score</span>
                    </div>
                  </div>
                  <Link to={`/participant/results/${quiz.id}`}>
                    <Button variant="outline" className="w-full">
                      View Detailed Results
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

    </div>
  );
};
