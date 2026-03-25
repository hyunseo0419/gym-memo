import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { WorkoutSession, BodyPartLog, ExerciseLog, WorkoutSet, Exercise, BodyPart } from '../types';

interface WorkoutState {
  currentSession: WorkoutSession | null;
  activeBodyPart: BodyPart | null;
  activeExerciseLog: ExerciseLog | null;
  sessionStartTime: number | null;
  isSending: boolean;
  sendResult: 'idle' | 'success' | 'error';
}

type WorkoutAction =
  | { type: 'START_SESSION' }
  | { type: 'SELECT_BODY_PART'; bodyPart: BodyPart }
  | { type: 'SELECT_EXERCISE'; exercise: Exercise }
  | { type: 'ADD_SET'; set: Omit<WorkoutSet, 'id' | 'setNumber'> }
  | { type: 'REMOVE_SET'; setId: string }
  | { type: 'FINISH_EXERCISE' }
  | { type: 'FINISH_BODY_PART' }
  | { type: 'SET_SENDING'; sending: boolean }
  | { type: 'SET_SEND_RESULT'; result: 'success' | 'error' }
  | { type: 'RESET_SESSION' };

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function workoutReducer(state: WorkoutState, action: WorkoutAction): WorkoutState {
  switch (action.type) {
    case 'START_SESSION':
      return {
        ...state,
        currentSession: {
          id: generateId(),
          date: new Date().toISOString(),
          bodyPartLogs: [],
        },
        sessionStartTime: Date.now(),
        sendResult: 'idle',
      };

    case 'SELECT_BODY_PART':
      return { ...state, activeBodyPart: action.bodyPart, activeExerciseLog: null };

    case 'SELECT_EXERCISE':
      return {
        ...state,
        activeExerciseLog: {
          id: generateId(),
          exercise: action.exercise,
          sets: [],
        },
      };

    case 'ADD_SET': {
      if (!state.activeExerciseLog) return state;
      const newSet: WorkoutSet = {
        id: generateId(),
        setNumber: state.activeExerciseLog.sets.length + 1,
        weight: action.set.weight,
        reps: action.set.reps,
      };
      return {
        ...state,
        activeExerciseLog: {
          ...state.activeExerciseLog,
          sets: [...state.activeExerciseLog.sets, newSet],
        },
      };
    }

    case 'REMOVE_SET': {
      if (!state.activeExerciseLog) return state;
      const filtered = state.activeExerciseLog.sets.filter(s => s.id !== action.setId);
      const renumbered = filtered.map((s, i) => ({ ...s, setNumber: i + 1 }));
      return {
        ...state,
        activeExerciseLog: { ...state.activeExerciseLog, sets: renumbered },
      };
    }

    case 'FINISH_EXERCISE': {
      if (!state.currentSession || !state.activeBodyPart || !state.activeExerciseLog) return state;
      if (state.activeExerciseLog.sets.length === 0) {
        return { ...state, activeExerciseLog: null };
      }

      const session = state.currentSession;
      const existingBodyPartLog = session.bodyPartLogs.find(l => l.bodyPart === state.activeBodyPart);

      let updatedLogs: BodyPartLog[];
      if (existingBodyPartLog) {
        updatedLogs = session.bodyPartLogs.map(l =>
          l.bodyPart === state.activeBodyPart
            ? { ...l, exercises: [...l.exercises, state.activeExerciseLog!] }
            : l
        );
      } else {
        const newBodyPartLog: BodyPartLog = {
          bodyPart: state.activeBodyPart,
          exercises: [state.activeExerciseLog],
        };
        updatedLogs = [...session.bodyPartLogs, newBodyPartLog];
      }

      return {
        ...state,
        currentSession: { ...session, bodyPartLogs: updatedLogs },
        activeExerciseLog: null,
      };
    }

    case 'FINISH_BODY_PART':
      return { ...state, activeBodyPart: null, activeExerciseLog: null };

    case 'SET_SENDING':
      return { ...state, isSending: action.sending };

    case 'SET_SEND_RESULT':
      return { ...state, sendResult: action.result };

    case 'RESET_SESSION':
      return {
        currentSession: null,
        activeBodyPart: null,
        activeExerciseLog: null,
        sessionStartTime: null,
        isSending: false,
        sendResult: 'idle',
      };

    default:
      return state;
  }
}

const initialState: WorkoutState = {
  currentSession: null,
  activeBodyPart: null,
  activeExerciseLog: null,
  sessionStartTime: null,
  isSending: false,
  sendResult: 'idle',
};

interface WorkoutContextValue {
  state: WorkoutState;
  startSession: () => void;
  selectBodyPart: (bodyPart: BodyPart) => void;
  selectExercise: (exercise: Exercise) => void;
  addSet: (weight: number, reps: number) => void;
  removeSet: (setId: string) => void;
  finishExercise: () => void;
  finishBodyPart: () => void;
  resetSession: () => void;
  dispatch: React.Dispatch<WorkoutAction>;
}

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(workoutReducer, initialState);

  const startSession = useCallback(() => dispatch({ type: 'START_SESSION' }), []);
  const selectBodyPart = useCallback((bodyPart: BodyPart) => dispatch({ type: 'SELECT_BODY_PART', bodyPart }), []);
  const selectExercise = useCallback((exercise: Exercise) => dispatch({ type: 'SELECT_EXERCISE', exercise }), []);
  const addSet = useCallback((weight: number, reps: number) => dispatch({ type: 'ADD_SET', set: { weight, reps } }), []);
  const removeSet = useCallback((setId: string) => dispatch({ type: 'REMOVE_SET', setId }), []);
  const finishExercise = useCallback(() => dispatch({ type: 'FINISH_EXERCISE' }), []);
  const finishBodyPart = useCallback(() => dispatch({ type: 'FINISH_BODY_PART' }), []);
  const resetSession = useCallback(() => dispatch({ type: 'RESET_SESSION' }), []);

  return (
    <WorkoutContext.Provider value={{
      state, dispatch,
      startSession, selectBodyPart, selectExercise,
      addSet, removeSet, finishExercise, finishBodyPart, resetSession,
    }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkout must be used within WorkoutProvider');
  return ctx;
}
