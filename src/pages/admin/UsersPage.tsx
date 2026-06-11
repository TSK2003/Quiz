import React, { useEffect, useState } from 'react';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useParams } from 'react-router-dom';
import { useToastStore } from '../../store/useToastStore';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

export const UsersPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [users, setUsers] = useState<any[]>([]);
  const [courses, setCourses] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [searchName, setSearchName] = useState('');
  const { addToast } = useToastStore();
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const fetchData = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      // Fetch Courses
      const coursesQ = query(collection(db, 'courses'), where('eventId', '==', eventId));
      const coursesSnap = await getDocs(coursesQ);
      const fetchedCourses = coursesSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      setCourses(fetchedCourses);

      // Fetch Users
      const q = query(collection(db, 'users'), where('role', '==', 'participant'), where('eventId', '==', eventId));
      const querySnapshot = await getDocs(q);
      const fetchedUsers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { status: newStatus });
      setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      addToast(`User status updated to ${newStatus}`, 'success');
    } catch (error) {
      console.error("Error updating status:", error);
      addToast("Failed to update user status.", 'error');
    }
  };

  const handleUpdateCourse = async (userId: string, newCourseId: string) => {
    if (!newCourseId) return;
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { courseId: newCourseId });
      setUsers(users.map(u => u.id === userId ? { ...u, courseId: newCourseId } : u));
      addToast("User course updated", 'success');
    } catch (error) {
      console.error("Error updating course:", error);
      addToast("Failed to change user course.", 'error');
    }
  };

  const handleRemoveUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', userToDelete));
      setUsers(users.filter(u => u.id !== userToDelete));
      addToast("User removed successfully", 'success');
    } catch (error) {
      console.error("Error removing user:", error);
      addToast("Failed to remove user.", 'error');
    } finally {
      setUserToDelete(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesCourse = selectedCourse === 'all' || u.courseId === selectedCourse;
    const matchesName = u.name?.toLowerCase().includes(searchName.toLowerCase());
    return matchesCourse && matchesName;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users & Approvals</h1>
          <p className="text-muted-foreground">Manage participant access to the platform.</p>
        </div>
        <div className="flex items-center gap-2 bg-card p-2 rounded-lg border border-border shadow-sm">
          <label className="text-sm font-medium text-muted-foreground ml-2">Course:</label>
          <div className="relative">
            <select 
              value={selectedCourse} 
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="appearance-none text-sm bg-background border border-border focus:ring-2 focus:ring-primary rounded-md py-2 pl-3 pr-8 cursor-pointer hover:bg-secondary/50 transition-colors shadow-sm outline-none"
            >
              <option value="all">All Courses</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Participants List</CardTitle>
              <CardDescription>View, approve, reject, modify, or remove users.</CardDescription>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="pl-8 pr-4 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-[250px]"
              />
              <svg className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Name</th>
                    <th className="px-6 py-4 font-semibold">Email</th>
                    <th className="px-6 py-4 font-semibold">Course</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium">{user.name}</td>
                      <td className="px-6 py-4 text-muted-foreground">{user.email}</td>
                      <td className="px-6 py-4">
                        <div className="relative inline-block w-full">
                          <select 
                            value={user.courseId || ''} 
                            onChange={(e) => handleUpdateCourse(user.id, e.target.value)}
                            className="appearance-none w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background cursor-pointer hover:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors pr-6 shadow-sm"
                          >
                            <option value="">No Course</option>
                            {courses.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-muted-foreground">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border border-1
                          ${user.status === 'approved' ? 'border-green-700 text-green-700' : 
                            user.status === 'pending' ? 'border-amber-700 text-amber-700' : 
                            'border-red-700 text-red-700'}`}>
                          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {user.status === 'pending' && (
                          <>
                            <Button size="sm" onClick={() => handleUpdateStatus(user.id, 'approved')} className="bg-green-600 hover:bg-green-700 text-white shadow-sm cursor-pointer">Approve</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus(user.id, 'rejected')} className="cursor-pointer shadow-sm">Reject</Button>
                          </>
                        )}
                        {user.status === 'approved' && (
                          <Button size="sm" variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50 cursor-pointer" onClick={() => handleUpdateStatus(user.id, 'suspended')}>Suspend</Button>
                        )}
                        {(user.status === 'suspended' || user.status === 'rejected') && (
                          <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => handleUpdateStatus(user.id, 'approved')}>Restore</Button>
                        )}
                        <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 cursor-pointer" onClick={() => setUserToDelete(user.id)}>Remove</Button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <p>No participants found in this course.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmModal
        isOpen={!!userToDelete}
        title="Remove User"
        description="Are you sure you want to permanently delete this user record? This action cannot be undone."
        confirmText="Remove User"
        onConfirm={handleRemoveUser}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  );
};
