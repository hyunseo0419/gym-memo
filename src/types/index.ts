export type BodyPart = '가슴' | '등' | '하체' | '팔' | '어깨';

export interface Exercise {
  id: string;
  name: string;
  bodyPart: BodyPart;
  target: string; // 세부 타겟 근육
}

export interface WorkoutSet {
  id: string;
  setNumber: number;
  weight: number; // kg
  reps: number;
}

export interface ExerciseLog {
  id: string;
  exercise: Exercise;
  sets: WorkoutSet[];
  note?: string;
}

export interface BodyPartLog {
  bodyPart: BodyPart;
  exercises: ExerciseLog[];
}

export interface WorkoutSession {
  id: string;
  date: string; // ISO string
  bodyPartLogs: BodyPartLog[];
  totalDuration?: number; // minutes
  notes?: string;
}

// 서버에 전송할 데이터 형식
export interface WorkoutPayload {
  session: WorkoutSession;
  deviceInfo?: string;
}

// 유산소 기록
export type CardioType = '런닝머신' | '배드민턴';
export type BadmintonIntensity = 'ガッツリ' | '中間' | 'まったり';

export interface TreadmillData {
  speed: number;    // km/h
  incline: number;  // %
}

export interface BadmintonData {
  intensity: BadmintonIntensity;
}

export interface CardioSession {
  id: string;
  date: string;       // ISO string
  type: CardioType;
  duration: number;   // 분
  calories: number;   // kcal
  weight: number;     // kg (계산 시 사용한 체중)
  details: TreadmillData | BadmintonData;
}

// 식단 기록
export interface DietEntry {
  id: string;
  timestamp: string; // ISO string
  menuName: string;
  calories: number;
  protein: number; // g
}
