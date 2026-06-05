import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthStore } from '../../store/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export const ParticipantResultsPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const { user } = useAuthStore();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResult = async () => {
      if (!quizId || !user) return;
      try {
        const resultDoc = await getDoc(doc(db, 'results', `${quizId}_${user.uid}`));
        if (resultDoc.exists()) {
          setResult(resultDoc.data());
        }
      } catch (error) {
        console.error("Error fetching results", error);
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [quizId, user]);

  if (loading) return <div className="p-12 text-center">Loading Results...</div>;

  if (!result) {
    return (
      <div className="text-center p-12">
        <h2 className="text-2xl font-bold">Results Not Found</h2>
        <p className="text-muted-foreground mt-2">We couldn't find your results for this assessment.</p>
        <Link to="/participant/dashboard">
          <Button className="mt-4">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pt-8 w-full">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Assessment Results</h1>
        <p className="text-muted-foreground">Detailed breakdown of your performance.</p>
      </div>

      <Card className="overflow-hidden">
        <div className={`h-3 w-full ${result.isDisqualified ? 'bg-destructive' : 'bg-primary'}`}></div>
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl">
            {result.isDisqualified ? 'Disqualified' : 'Completed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          
          <div className="flex justify-center">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center border-4 ${result.isDisqualified ? 'border-destructive text-destructive' : 'border-primary text-primary'}`}>
              <div className="text-center">
                <span className="text-3xl font-bold">{Math.round(result.percentage)}</span>
                <span className="text-sm">%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-2xl font-bold">{result.score}</div>
              <div className="text-sm text-muted-foreground">Total Score</div>
            </div>
            <div className="bg-green-100 text-green-800 p-4 rounded-lg">
              <div className="text-2xl font-bold">{result.correctAnswers}</div>
              <div className="text-sm">Correct</div>
            </div>
            <div className="bg-red-100 text-red-800 p-4 rounded-lg">
              <div className="text-2xl font-bold">{result.wrongAnswers}</div>
              <div className="text-sm">Wrong</div>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-2xl font-bold">{result.score + result.wrongAnswers}</div>
              <div className="text-sm text-muted-foreground">Attempted</div>
            </div>
          </div>

          {result.isDisqualified && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-center font-medium">
              You were disqualified from this assessment due to multiple rule violations.
            </div>
          )}

          <div className="flex justify-center pt-4">
            <Link to="/participant/dashboard">
              <Button variant="outline">Return to Dashboard</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
