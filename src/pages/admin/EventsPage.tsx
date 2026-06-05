import React, { useEffect, useState } from 'react';
import { db, auth } from '../../config/firebase';
import { collection, query, getDocs, addDoc, serverTimestamp, doc, writeBatch, where, deleteDoc } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { Folder, Plus, Calendar, Trash2 } from 'lucide-react';
import { useToastStore } from '../../store/useToastStore';

export const EventsPage: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  
  const { addToast } = useToastStore();
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'events'));
      const querySnapshot = await getDocs(q);
      const fetchedEvents = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(fetchedEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim()) return;
    
    setIsCreating(true);
    try {
      const docRef = await addDoc(collection(db, 'events'), {
        name: newEventName.trim(),
        createdAt: serverTimestamp(),
        status: 'inactive'
      });
      setEvents([...events, { id: docRef.id, name: newEventName.trim(), status: 'inactive' }]);
      setNewEventName('');
    } catch (err) {
      console.error("Error creating event", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSetActiveEvent = async (eventId: string) => {
    try {
      const batch = writeBatch(db);
      
      // Set all currently active events to inactive
      const activeEventsQuery = query(collection(db, 'events'), where('status', '==', 'active'));
      const activeSnap = await getDocs(activeEventsQuery);
      
      activeSnap.forEach((activeDoc) => {
        if (activeDoc.id !== eventId) {
          batch.update(doc(db, 'events', activeDoc.id), { status: 'inactive' });
        }
      });
      
      // Set the target event to active
      batch.update(doc(db, 'events', eventId), { status: 'active' });
      
      await batch.commit();
      
      // Update local state
      setEvents(events.map(event => ({
        ...event,
        status: event.id === eventId ? 'active' : 'inactive'
      })));
    } catch (error) {
      console.error("Error setting active event:", error);
    }
  };

  const handleDeleteEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventToDelete || !auth.currentUser?.email) return;

    setIsDeleting(true);
    setDeleteError('');

    try {
      // 1. Re-authenticate admin
      const credential = EmailAuthProvider.credential(auth.currentUser.email, adminPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);

      // 2. Delete the event from Firestore
      await deleteDoc(doc(db, 'events', eventToDelete));
      
      setEvents(events.filter(ev => ev.id !== eventToDelete));
      addToast('Event deleted successfully', 'success');
      
      // Reset modal state
      setEventToDelete(null);
      setAdminPassword('');
    } catch (error: any) {
      console.error("Error deleting event:", error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        setDeleteError("Incorrect password. Please try again.");
      } else {
        setDeleteError("Failed to delete event. " + error.message);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Events Dashboard</h1>
        <p className="text-muted-foreground mt-2">Manage all your assessment events. Select an event to manage its users, courses, and quizzes.</p>
      </div>

      <Card className="border-primary/20 shadow-sm bg-primary/5">
        <CardContent className="p-6">
          <form onSubmit={handleCreateEvent} className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-foreground">Create New Event</label>
              <input 
                type="text" 
                placeholder="e.g. Spring Campus Hiring 2026"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                className="w-full p-2.5 rounded-md border border-border bg-background shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
                required
              />
            </div>
            <Button type="submit" isLoading={isCreating} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 cursor-pointer">
              <Plus className="w-4 h-4" />
              Create Event
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Link key={event.id} to={`/admin/events/${event.id}/dashboard`} className="w-full block">
            <Card className="hover:shadow-md transition-shadow border-border overflow-hidden flex flex-col cursor-pointer group">
              <CardHeader className="bg-secondary/30 border-b border-border pb-4 group-hover:bg-secondary/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary mb-2">
                    <Folder className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${event.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {event.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                    <div className="flex gap-2">
                      {event.status !== 'active' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSetActiveEvent(event.id);
                          }}
                        >
                          Set Active
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEventToDelete(event.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
                <CardTitle className="text-xl">{event.name}</CardTitle>
                <CardDescription className="flex items-center gap-1 mt-1">
                  <Calendar className="w-3 h-3" />
                  Created recently
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 flex-1 flex flex-col justify-end">
                
                  <div className="w-full p-4 bg-muted text-center text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                    Manage Event &rarr;
                  </div>
                
              </CardContent>
            </Card>
            </Link>
          ))}
          {events.length === 0 && (
            <div className="col-span-full p-12 text-center text-muted-foreground bg-muted/30 rounded-xl border border-dashed border-border">
              <Folder className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No events found. Create your first event to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* Admin Password Verification Modal for Deletion */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-border ring-1 ring-border/50 overflow-hidden relative">
            <div className="p-6">
              <h2 className="text-xl font-bold text-destructive mb-2">Security Verification</h2>
              <p className="text-sm text-muted-foreground mb-6">
                You are about to permanently delete an event. This action cannot be undone. Please enter your admin password to confirm.
              </p>
              
              <form onSubmit={handleDeleteEvent} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Admin Password</label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full p-2.5 rounded-md border border-border bg-background focus:ring-2 focus:ring-destructive focus:outline-none"
                    placeholder="Enter your password"
                    required
                    autoFocus
                  />
                  {deleteError && <p className="text-xs text-destructive mt-1">{deleteError}</p>}
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setEventToDelete(null);
                      setAdminPassword('');
                      setDeleteError('');
                    }}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-destructive hover:bg-destructive/90 text-white"
                    isLoading={isDeleting}
                  >
                    Confirm Deletion
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
