import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

import { useNavigate } from 'react-router-dom';

export const ParticipantDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [availableQuizzes, setAvailableQuizzes] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuizzes = async () => {
      if (!user?.eventId || !user?.courseId) return;
      try {
        const q = query(
          collection(db, 'quizzes'),
          where('eventId', '==', user.eventId),
          where('courseId', '==', user.courseId),
          where('status', '==', 'active')
        );
        const querySnapshot = await getDocs(q);
        const quizzes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAvailableQuizzes(quizzes);
      } catch (error) {
        console.error("Error fetching quizzes:", error);
      }
    };
    fetchQuizzes();
  }, [user]);

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.name}. Here are your available assessments.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {availableQuizzes.length === 0 ? (
          <Card className="col-span-full border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-medium">No Active Assessments</h3>
              <p className="text-muted-foreground mt-1">There are no active assessments assigned to your course right now. Please wait for an administrator to start one.</p>
            </CardContent>
          </Card>
        ) : (
          availableQuizzes.map((quiz) => (
            <Card key={quiz.id} className="overflow-hidden">
              <div className="bg-primary h-2 w-full"></div>
              <CardHeader>
                <CardTitle>{quiz.name}</CardTitle>
                <CardDescription>{quiz.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-sm mb-4 text-muted-foreground">
                  <span>Questions: {quiz.totalQuestions}</span>
                  <span>Duration: {quiz.duration} mins</span>
                </div>
                <Button className="w-full" onClick={() => navigate(`/participant/quiz/${quiz.id}/waiting`)}>Enter Waiting Room</Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
