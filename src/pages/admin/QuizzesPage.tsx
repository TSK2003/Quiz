import React, { useEffect, useState } from 'react';
import { db } from '../../config/firebase';
import { collection, query, getDocs, doc, deleteDoc, updateDoc, addDoc, where, writeBatch, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Link, useParams } from 'react-router-dom';
import { useToastStore } from '../../store/useToastStore';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

export const QuizzesPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingQuiz, setStartingQuiz] = useState<string | null>(null);
  const { addToast } = useToastStore();
  const [quizToDelete, setQuizToDelete] = useState<string | null>(null);

  const fetchQuizzes = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'quizzes'), where('eventId', '==', eventId));
      const querySnapshot = await getDocs(q);
      const fetchedQuizzes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setQuizzes(fetchedQuizzes.filter((q: any) => q.status !== 'archived'));
    } catch (error) {
      console.error("Error fetching quizzes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, [eventId]);

  const handleDelete = async () => {
    if (!quizToDelete) return;
    try {
      await deleteDoc(doc(db, 'quizzes', quizToDelete));
      setQuizzes(quizzes.filter(q => q.id !== quizToDelete));
      addToast("Quiz deleted successfully", 'success');
    } catch (error) {
      console.error("Error deleting quiz:", error);
      addToast("Failed to delete quiz", 'error');
    } finally {
      setQuizToDelete(null);
    }
  };

  const handleStartQuiz = async (quiz: any) => {
    if (!eventId || startingQuiz) return;
    setStartingQuiz(quiz.id);

    try {
      // 1. Fetch approved users for this course + event
      const usersQ = query(collection(db, 'users'), where('eventId', '==', eventId));
      const usersSnap = await getDocs(usersQ);
      const approvedUsers = usersSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(u => u.courseId === quiz.courseId && u.role === 'participant' && u.status === 'approved');

      if (approvedUsers.length === 0) {
        addToast("No approved users found for this course. Please approve users first.", 'error');
        setStartingQuiz(null);
        return;
      }

      // 2. Fetch question sets for this quiz
      const qSetsQ = query(collection(db, 'questionSets'), where('quizId', '==', quiz.id));
      const qSetsSnap = await getDocs(qSetsQ);

      let setA_Id = '';
      let setB_Id = '';
      qSetsSnap.forEach(d => {
        if (d.data().setName === 'A') setA_Id = d.id;
        if (d.data().setName === 'B') setB_Id = d.id;
      });

      if (!setA_Id || !setB_Id) {
        addToast("Question sets A and B not found for this quiz.", 'error');
        setStartingQuiz(null);
        return;
      }

      // 3. Batch create participant records
      const batch = writeBatch(db);
      let assignedCount = 0;
      let skippedCount = 0;

      approvedUsers.forEach(u => {
        const userSet = u.questionSet; // 'A' or 'B'
        if (!userSet) {
          skippedCount++;
          return;
        }

        const qSetDocId = userSet === 'A' ? setA_Id : setB_Id;
        const participantRef = doc(db, 'participants', `${quiz.id}_${u.id}`);

        batch.set(participantRef, {
          userId: u.id,
          quizId: quiz.id,
          eventId: eventId,
          questionSetId: userSet,
          qSetDocId: qSetDocId,
          status: 'waiting',
          updatedAt: serverTimestamp()
        }, { merge: true });

        assignedCount++;
      });

      // 4. Update quiz status to active
      const updatedAt = new Date().toISOString();
      const quizRef = doc(db, 'quizzes', quiz.id);
      batch.update(quizRef, { status: 'active', isAssigned: true, updatedAt });

      await batch.commit();

      // Audit log
      await addDoc(collection(db, 'auditLogs'), {
        timestamp: new Date().toISOString(),
        userId: 'admin',
        eventType: 'Quiz Started (Auto-Assigned)',
        eventId: eventId,
        metadata: { quizId: quiz.id, assignedCount, skippedCount }
      });

      setQuizzes(quizzes.map(q => q.id === quiz.id ? { ...q, status: 'active', updatedAt } : q));

      if (skippedCount > 0) {
        addToast(`Quiz started! ${assignedCount} participants assigned. ${skippedCount} users skipped (no A/B set assigned).`, 'warning');
      } else {
        addToast(`Quiz started! ${assignedCount} participants assigned successfully.`, 'success');
      }
    } catch (error) {
      console.error("Error starting quiz:", error);
      addToast("Failed to start quiz.", 'error');
    } finally {
      setStartingQuiz(null);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const updatedAt = new Date().toISOString();
      await updateDoc(doc(db, 'quizzes', id), { status: newStatus, updatedAt });
      setQuizzes(quizzes.map(q => q.id === id ? { ...q, status: newStatus, updatedAt } : q));
      addToast(`Quiz status updated to ${newStatus}`, 'success');
    } catch (error) {
      console.error("Error updating quiz status:", error);
      addToast("Failed to update quiz status", 'error');
    }
  };

  const handleDuplicate = async (quiz: any) => {
    try {
      const { id, ...quizData } = quiz;
      const newQuizData = {
        ...quizData,
        name: `${quiz.name} (Copy)`,
        status: 'draft',
        eventId: eventId,
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, 'quizzes'), newQuizData);
      setQuizzes([...quizzes, { id: docRef.id, ...newQuizData }]);
      addToast("Quiz duplicated successfully", 'success');
    } catch (error) {
      console.error("Error duplicating quiz:", error);
      addToast("Failed to duplicate quiz", 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quizzes</h1>
          <p className="text-muted-foreground">Manage your assessments, start/stop them, and manage question sets.</p>
        </div>

        <Link to={`/admin/events/${eventId}/quizzes/create`}>
          <Button>Create New Quiz</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Quizzes</CardTitle>
          <CardDescription>Overview of all quizzes across your courses.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading quizzes...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3">Quiz Name</th>
                    <th className="px-6 py-3">Course</th>
                    <th className="px-6 py-3">Questions</th>
                    <th className="px-6 py-3">Duration</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quizzes.map(quiz => (
                    <tr key={quiz.id} className="border-b border-border hover:bg-muted/50">
                      <td className="px-6 py-4 font-medium">{quiz.name}</td>
                      <td className="px-6 py-4">{quiz.courseName || quiz.courseId}</td>
                      <td className="px-6 py-4">{quiz.totalQuestions}</td>
                      <td className="px-6 py-4">{quiz.duration} mins</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold
                          ${quiz.status === 'active' ? 'bg-green-100 text-green-700' : 
                            quiz.status === 'draft' ? 'bg-amber-100 text-amber-700' : 
                            'bg-gray-100 text-gray-700'}`}>
                          {quiz.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {quiz.status === 'draft' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleStartQuiz(quiz)} 
                              isLoading={startingQuiz === quiz.id}
                              className="bg-green-600 hover:bg-green-700 cursor-pointer"
                            >
                              Start Quiz
                            </Button>
                          )}
                          {quiz.status === 'active' && (
                            <>
                              <Link to={`/live-tv`} target="_blank">
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-md ring-1 ring-blue-500 ring-offset-1 ring-offset-background animate-pulse">Live Monitor</Button>
                              </Link>
                              <Button size="sm" onClick={() => handleUpdateStatus(quiz.id, 'completed')} className="bg-amber-600 hover:bg-amber-700 cursor-pointer text-white">Stop Quiz</Button>
                            </>
                          )}
                          <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => handleDuplicate(quiz)}>Duplicate</Button>

                          <Button size="sm" variant="destructive" className="cursor-pointer" onClick={() => setQuizToDelete(quiz.id)}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {quizzes.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No quizzes found. Create one to get started.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmModal
        isOpen={!!quizToDelete}
        title="Delete Quiz"
        description="Are you sure you want to delete this quiz? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setQuizToDelete(null)}
      />
    </div>
  );
};
