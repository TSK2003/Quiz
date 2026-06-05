import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthStore } from '../../store/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CheckCircle2, XCircle } from 'lucide-react';

export const ParticipantResultsPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const { user } = useAuthStore();
  const [result, setResult] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResultData = async () => {
      if (!quizId || !user) return;
      try {
        // Fetch Result Summary
        const resultDoc = await getDoc(doc(db, 'results', `${quizId}_${user.uid}`));
        if (resultDoc.exists()) {
          setResult(resultDoc.data());
        }

        // Fetch Participant's saved answers & question set ID
        const participantDoc = await getDoc(doc(db, 'participants', `${quizId}_${user.uid}`));
        if (participantDoc.exists()) {
          const pData = participantDoc.data();
          setAnswers(pData.answers || {});
          
          if (pData.qSetDocId) {
            // Fetch Actual Questions
            const qSetDoc = await getDoc(doc(db, 'questionSets', pData.qSetDocId));
            if (qSetDoc.exists()) {
              const qsData = qSetDoc.data();
              const loadedQuestions = qsData.questions.map((q: any, index: number) => ({ id: `q${index}`, ...q }));
              setQuestions(loadedQuestions);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching detailed results", error);
      } finally {
        setLoading(false);
      }
    };
    fetchResultData();
  }, [quizId, user]);

  if (loading) return <div className="p-12 text-center text-muted-foreground animate-pulse">Loading Detailed Results...</div>;

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
    <div className="max-w-4xl mx-auto space-y-8 pt-8 w-full pb-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Assessment Results</h1>
        <p className="text-muted-foreground">Detailed breakdown of your performance.</p>
      </div>

      <Card className="overflow-hidden shadow-md border-0 ring-1 ring-border/50">
        <div className={`h-3 w-full ${result.isDisqualified ? 'bg-destructive' : 'bg-primary'}`}></div>
        <CardHeader className="text-center pb-2 bg-secondary/20">
          <CardTitle className="text-2xl">
            {result.isDisqualified ? 'Disqualified' : 'Completed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          
          <div className="flex justify-center">
            <div className={`w-36 h-36 rounded-full flex items-center justify-center border-[6px] shadow-inner ${result.isDisqualified ? 'border-destructive/20 text-destructive' : 'border-primary/20 text-primary'}`}>
              <div className="text-center">
                <span className="text-4xl font-black">{Math.round(result.percentage)}</span>
                <span className="text-lg font-bold text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-muted/50 border border-border/50 p-4 rounded-xl">
              <div className="text-2xl font-bold">{result.score}</div>
              <div className="text-sm font-medium text-muted-foreground">Total Score</div>
            </div>
            <div className="bg-success/10 border border-success/20 text-success-foreground p-4 rounded-xl">
              <div className="text-2xl font-bold">{result.correctAnswers}</div>
              <div className="text-sm font-medium">Correct</div>
            </div>
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl">
              <div className="text-2xl font-bold">{result.wrongAnswers}</div>
              <div className="text-sm font-medium">Wrong</div>
            </div>
            <div className="bg-muted/50 border border-border/50 p-4 rounded-xl">
              <div className="text-2xl font-bold">{result.score + result.wrongAnswers}</div>
              <div className="text-sm font-medium text-muted-foreground">Attempted</div>
            </div>
          </div>

          {result.isDisqualified && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-center font-medium border border-destructive/20">
              You were disqualified from this assessment due to multiple rule violations.
            </div>
          )}
        </CardContent>
      </Card>

      {!result.isDisqualified && questions.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold tracking-tight">Question Breakdown</h2>
          <div className="space-y-4">
            {questions.map((q, index) => {
              const userAnswer = answers[q.id];
              const isCorrect = userAnswer === q.correctAnswer;
              const isSkipped = !userAnswer;

              return (
                <Card key={q.id} className={`overflow-hidden border-l-4 ${isCorrect ? 'border-l-success' : isSkipped ? 'border-l-muted-foreground' : 'border-l-destructive'}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 mt-1">
                        {isCorrect ? (
                          <CheckCircle2 className="w-6 h-6 text-success" />
                        ) : isSkipped ? (
                          <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/50 flex items-center justify-center text-xs font-bold text-muted-foreground">-</div>
                        ) : (
                          <XCircle className="w-6 h-6 text-destructive" />
                        )}
                      </div>
                      <div className="flex-1 space-y-4">
                        <div className="space-y-1">
                          <span className="text-sm font-semibold text-muted-foreground">Question {index + 1}</span>
                          <p className="text-base font-medium leading-relaxed">{q.question}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {['A', 'B', 'C', 'D'].map((opt: string) => {
                            const optionKey = `option${opt}` as keyof typeof q;
                            const optionText = q[optionKey] as string;
                            const isSelected = userAnswer === opt;
                            const isActuallyCorrect = q.correctAnswer === opt;
                            
                            let optionClass = "p-3 rounded-lg border text-sm font-medium transition-colors text-black ";
                            
                            if (isActuallyCorrect) {
                              optionClass += "bg-success/10 border-success/30 ring-1 ring-success/50";
                            } else if (isSelected && !isActuallyCorrect) {
                              optionClass += "bg-destructive/10 border-destructive/30 ring-1 ring-destructive/50";
                            } else {
                              optionClass += "bg-muted/30 border-border/50 opacity-60";
                            }

                            return (
                              <div key={opt} className={optionClass}>
                                <span className="font-bold mr-2">{opt}.</span>
                                {optionText}
                                {isActuallyCorrect && <span className="ml-2 text-xs font-bold uppercase tracking-wider opacity-80">(Correct Answer)</span>}
                                {isSelected && !isActuallyCorrect && <span className="ml-2 text-xs font-bold uppercase tracking-wider opacity-80">(Your Answer)</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-center pt-4">
        <Link to="/participant/dashboard">
          <Button size="lg" className="rounded-full px-8 shadow-md hover:shadow-lg">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};
