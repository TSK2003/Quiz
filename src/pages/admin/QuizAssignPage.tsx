import React, { useEffect, useState } from 'react';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, doc, getDoc, writeBatch, serverTimestamp, addDoc } from 'firebase/firestore';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useToastStore } from '../../store/useToastStore';

export const QuizAssignPage: React.FC = () => {
  const { quizId, eventId } = useParams<{ quizId: string, eventId: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({}); // userId -> 'A' | 'B'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToastStore();

  useEffect(() => {
    const fetchData = async () => {
      if (!quizId || !eventId) return;
      setLoading(true);
      try {
        const quizDoc = await getDoc(doc(db, 'quizzes', quizId));
        if (!quizDoc.exists()) {
          navigate('/admin/quizzes');
          return;
        }
        const quizData = quizDoc.data();
        setQuiz({ id: quizDoc.id, ...quizData });

        // Fetch approved participants for this course and event
        const usersQ = query(
          collection(db, 'users'), 
          where('courseId', '==', quizData.courseId),
          where('eventId', '==', eventId),
          where('role', '==', 'participant'),
          where('status', '==', 'approved')
        );
        const usersSnap = await getDocs(usersQ);
        const usersList = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setParticipants(usersList);

        // Fetch existing assignments if any
        const assignmentsQ = query(collection(db, 'participants'), where('quizId', '==', quizId), where('eventId', '==', eventId));
        const assignmentsSnap = await getDocs(assignmentsQ);
        const currentAssignments: Record<string, string> = {};
        assignmentsSnap.forEach(d => {
          const data = d.data();
          if (data.questionSetId) {
            currentAssignments[data.userId] = data.questionSetId;
          }
        });
        setAssignments(currentAssignments);

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [quizId, navigate]);

  const handleAssign = (userId: string, set: string) => {
    setAssignments(prev => ({ ...prev, [userId]: set }));
  };

  const handleSaveAssignments = async () => {
    if (!quizId) return;
    setSaving(true);
    try {
      // Find question sets for this quiz
      const qSetsQ = query(collection(db, 'questionSets'), where('quizId', '==', quizId));
      const qSetsSnap = await getDocs(qSetsQ);
      
      let setA_Id = '';
      let setB_Id = '';
      
      qSetsSnap.forEach(d => {
        if (d.data().setName === 'A') setA_Id = d.id;
        if (d.data().setName === 'B') setB_Id = d.id;
      });

      // Save assignments
      const batch = writeBatch(db);

      participants.forEach(p => {
        const assignedSet = assignments[p.id];
        if (!assignedSet) return; // Skip unassigned
        
        const qSetId = assignedSet === 'A' ? setA_Id : setB_Id;
        const participantRef = doc(db, 'participants', `${quizId}_${p.id}`);
        
        batch.set(participantRef, {
          userId: p.id,
          quizId: quizId,
          eventId: eventId,
          questionSetId: assignedSet,
          qSetDocId: qSetId,
          status: 'waiting',
          updatedAt: serverTimestamp()
        }, { merge: true });
      });

      await batch.commit();

      await addDoc(collection(db, 'auditLogs'), {
        timestamp: new Date().toISOString(),
        userId: 'admin',
        eventType: 'Quiz Assigned A/B',
        eventId: eventId,
        metadata: { quizId, assignedCount: participants.length }
      });

      addToast("Assignments saved successfully!", 'success');
      navigate(`/admin/events/${eventId}/quizzes`);
    } catch (error) {
      console.error("Error saving assignments:", error);
      addToast("Failed to save assignments.", 'error');
    } finally {
      setSaving(false);
    }
  };

  const assignAll = (set: 'A' | 'B') => {
    const newAssignments = { ...assignments };
    participants.forEach(p => {
      newAssignments[p.id] = set;
    });
    setAssignments(newAssignments);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assign Question Sets</h1>
        <p className="text-muted-foreground">Assign Question Set A or B to participants for: <strong>{quiz?.name}</strong></p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Participants List</CardTitle>
            <CardDescription>Manually assign Set A or Set B to each participant.</CardDescription>
          </div>
          <div className="space-x-2">
            <Button variant="outline" size="sm" onClick={() => assignAll('A')}>Assign All to A</Button>
            <Button variant="outline" size="sm" onClick={() => assignAll('B')}>Assign All to B</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted text-muted-foreground">
                <tr>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3 text-center">Assignment</th>
                </tr>
              </thead>
              <tbody>
                {participants.map(p => (
                  <tr key={p.id} className="border-b border-border hover:bg-muted/50">
                    <td className="px-6 py-4 font-medium">{p.name}</td>
                    <td className="px-6 py-4">{p.email}</td>
                    <td className="px-6 py-4 flex justify-center space-x-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name={`set_${p.id}`} 
                          checked={assignments[p.id] === 'A'} 
                          onChange={() => handleAssign(p.id, 'A')}
                          className="w-4 h-4 text-primary focus:ring-primary"
                        />
                        <span className={`font-medium ${assignments[p.id] === 'A' ? 'text-primary' : 'text-muted-foreground'}`}>Set A</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name={`set_${p.id}`} 
                          checked={assignments[p.id] === 'B'} 
                          onChange={() => handleAssign(p.id, 'B')}
                          className="w-4 h-4 text-primary focus:ring-primary"
                        />
                        <span className={`font-medium ${assignments[p.id] === 'B' ? 'text-primary' : 'text-muted-foreground'}`}>Set B</span>
                      </label>
                    </td>
                  </tr>
                ))}
                {participants.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                      No approved participants found for this course.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <Button variant="outline" onClick={() => navigate(`/admin/events/${eventId}/quizzes`)}>Cancel</Button>
            <Button onClick={handleSaveAssignments} isLoading={saving}>Save Assignments</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
