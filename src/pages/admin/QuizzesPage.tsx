import React, { useEffect, useState } from 'react';
import { db } from '../../config/firebase';
import { collection, query, getDocs, doc, deleteDoc, updateDoc, addDoc, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Link, useParams } from 'react-router-dom';
import { useToastStore } from '../../store/useToastStore';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

export const QuizzesPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToastStore();
  const [quizToDelete, setQuizToDelete] = useState<string | null>(null);

  const fetchQuizzes = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'quizzes'), where('eventId', '==', eventId));
      const querySnapshot = await getDocs(q);
      const fetchedQuizzes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setQuizzes(fetchedQuizzes);
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

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'quizzes', id), { status: newStatus });
      setQuizzes(quizzes.map(q => q.id === id ? { ...q, status: newStatus } : q));
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
                      <td className="px-6 py-4 text-right space-x-2">
                        {quiz.status === 'draft' && (
                          <>
                            <Link to={`/admin/events/${eventId}/quizzes/${quiz.id}/assign`}>
                              <Button size="sm" variant="outline" className="text-primary border-primary hover:bg-primary/10 cursor-pointer">Assign A/B</Button>
                            </Link>
                            <Button size="sm" onClick={() => handleUpdateStatus(quiz.id, 'active')} className="bg-green-600 hover:bg-green-700 cursor-pointer">Start Quiz</Button>
                          </>
                        )}
                        {quiz.status === 'active' && (
                          <>
                            <Link to={`/live-tv`} target="_blank">
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer mr-2 shadow-md ring-1 ring-blue-500 ring-offset-1 ring-offset-background animate-pulse">Live Monitor</Button>
                            </Link>
                            <Button size="sm" onClick={() => handleUpdateStatus(quiz.id, 'draft')} className="bg-amber-600 hover:bg-amber-700 cursor-pointer">Stop Quiz</Button>
                          </>
                        )}
                        <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => handleDuplicate(quiz)}>Duplicate</Button>
                        {quiz.status !== 'archived' && (
                          <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => handleUpdateStatus(quiz.id, 'archived')}>Archive</Button>
                        )}
                        <Button size="sm" variant="destructive" className="cursor-pointer" onClick={() => setQuizToDelete(quiz.id)}>Delete</Button>
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
