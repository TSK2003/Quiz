import { create } from 'zustand';

interface Question {
  id: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
}

interface QuizState {
  quizId: string | null;
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<string, string>;
  timeLeft: number;
  isSubmitting: boolean;
  setQuiz: (quizId: string, questions: Question[]) => void;
  answerQuestion: (questionId: string, answer: string) => void;
  nextQuestion: () => void;
  setTimeLeft: (time: number) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  resetQuiz: () => void;
}

export const useQuizStore = create<QuizState>((set) => ({
  quizId: null,
  questions: [],
  currentQuestionIndex: 0,
  answers: {},
  timeLeft: 15, // 15 seconds per question
  isSubmitting: false,
  setQuiz: (quizId, questions) => set({ quizId, questions, currentQuestionIndex: 0, answers: {}, timeLeft: 15 }),
  answerQuestion: (questionId, answer) => set((state) => ({
    answers: { ...state.answers, [questionId]: answer }
  })),
  nextQuestion: () => set((state) => ({
    currentQuestionIndex: state.currentQuestionIndex + 1,
    timeLeft: 15
  })),
  setTimeLeft: (time) => set({ timeLeft: time }),
  setSubmitting: (isSubmitting) => set({ isSubmitting }),
  resetQuiz: () => set({ quizId: null, questions: [], currentQuestionIndex: 0, answers: {}, timeLeft: 15, isSubmitting: false })
}));
