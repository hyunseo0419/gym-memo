import type { Exercise, BodyPart } from '../types';

export const EXERCISES: Exercise[] = [
  // 가슴
  { id: 'chest_1', name: '벤치프레스', bodyPart: '가슴', target: '중간가슴' },
  { id: 'chest_2', name: '인클라인벤치', bodyPart: '가슴', target: '윗가슴' },
  { id: 'chest_3', name: '덤벨프레스', bodyPart: '가슴', target: '중간가슴' },
  { id: 'chest_4', name: '인클라인덤벨', bodyPart: '가슴', target: '윗가슴' },
  { id: 'chest_5', name: '벤치프레스머신', bodyPart: '가슴', target: '중간가슴' },
  { id: 'chest_6', name: '인클라인머신', bodyPart: '가슴', target: '윗가슴' },
  { id: 'chest_7', name: '푸시업', bodyPart: '가슴', target: '가슴전체' },
  { id: 'chest_8', name: '케이블크로스오버', bodyPart: '가슴', target: '안쪽가슴' },
  { id: 'chest_9', name: '체스트플라이', bodyPart: '가슴', target: '안쪽가슴' },
  { id: 'chest_10', name: '케이블플라이', bodyPart: '가슴', target: '안쪽가슴' },

  // 등
  { id: 'back_1', name: '데드리프트', bodyPart: '등', target: '후면전체' },
  { id: 'back_2', name: '풀업', bodyPart: '등', target: '광배근' },
  { id: 'back_3', name: '암풀다운', bodyPart: '등', target: '광배근' },
  { id: 'back_4', name: '티바로우', bodyPart: '등', target: '중부등' },
  { id: 'back_5', name: '바벨로우(언더)', bodyPart: '등', target: '하부등' },
  { id: 'back_6', name: '바벨로우(오버)', bodyPart: '등', target: '중부등' },
  { id: 'back_7', name: '렛풀다운', bodyPart: '등', target: '광배근' },
  { id: 'back_8', name: '시티드로우', bodyPart: '등', target: '중부등' },
  { id: 'back_9', name: '덤벨로우', bodyPart: '등', target: '광배근' },
  { id: 'back_10', name: '로잉머신', bodyPart: '등', target: '중부등' },

  // 어깨
  { id: 'shoulder_1', name: '밀리터리프레스', bodyPart: '어깨', target: '전면삼각근' },
  { id: 'shoulder_2', name: '덤벨프레스', bodyPart: '어깨', target: '전면삼각근' },
  { id: 'shoulder_3', name: '사레레', bodyPart: '어깨', target: '측면삼각근' },
  { id: 'shoulder_4', name: '벤트오버', bodyPart: '어깨', target: '후면삼각근' },
  { id: 'shoulder_5', name: '리버스펙덱', bodyPart: '어깨', target: '후면삼각근' },
  { id: 'shoulder_6', name: '프론트오버', bodyPart: '어깨', target: '전면삼각근' },
  { id: 'shoulder_7', name: '벤트오버원암', bodyPart: '어깨', target: '후면삼각근' },

  // 하체
  { id: 'leg_1', name: '스쿼트', bodyPart: '하체', target: '대퇴사두' },
  { id: 'leg_2', name: '이너타이', bodyPart: '하체', target: '내전근' },
  { id: 'leg_3', name: '아웃타이', bodyPart: '하체', target: '외전근' },
  { id: 'leg_4', name: '레그프레스', bodyPart: '하체', target: '대퇴사두' },
  { id: 'leg_5', name: '런지', bodyPart: '하체', target: '대퇴사두' },
  { id: 'leg_6', name: '레그컬', bodyPart: '하체', target: '햄스트링' },
  { id: 'leg_7', name: '레그익스텐션', bodyPart: '하체', target: '대퇴사두' },
  { id: 'leg_8', name: '브이스쿼트', bodyPart: '하체', target: '대퇴사두' },
  { id: 'leg_9', name: '헥스쿼트', bodyPart: '하체', target: '대퇴사두' },
  { id: 'leg_10', name: '카프레이즈', bodyPart: '하체', target: '종아리' },
  { id: 'leg_11', name: '데드리프트', bodyPart: '하체', target: '후면전체' },
  { id: 'leg_12', name: '굿모닝', bodyPart: '하체', target: '햄스트링' },

  // 팔
  { id: 'arm_1', name: '덤벨컬', bodyPart: '팔', target: '이두' },
  { id: 'arm_2', name: '바벨컬', bodyPart: '팔', target: '이두' },
  { id: 'arm_3', name: '해머컬', bodyPart: '팔', target: '이두(장두)' },
  { id: 'arm_4', name: '프리처컬', bodyPart: '팔', target: '이두' },
  { id: 'arm_5', name: '인클라인덤벨컬', bodyPart: '팔', target: '이두(장두)' },
  { id: 'arm_6', name: '라트익스텐션', bodyPart: '팔', target: '삼두' },
  { id: 'arm_7', name: '덤벨오버헤드익스텐션', bodyPart: '팔', target: '삼두(장두)' },
  { id: 'arm_8', name: '케이불푸쉬다운', bodyPart: '팔', target: '삼두' },
  { id: 'arm_9', name: '암풀푸쉬다운', bodyPart: '팔', target: '삼두' },
  { id: 'arm_10', name: '원암푸시다운', bodyPart: '팔', target: '삼두' },
];

export const BODY_PARTS: BodyPart[] = ['가슴', '등', '하체', '팔', '어깨'];

export const BODY_PART_ICONS: Record<BodyPart, string> = {
  '가슴': '🫁',
  '등': '🏋️',
  '하체': '🦵',
  '팔': '💪',
  '어깨': '🏆',
};

// 부위별 색상 - 차트에서 구분이 잘 되도록 명확히 다른 색 사용
export const BODY_PART_COLORS: Record<BodyPart, { from: string; to: string; accent: string }> = {
  '가슴': { from: '#7ACC00', to: '#AAFF00', accent: '#AAFF00' }, // Monster green
  '등': { from: '#0099CC', to: '#00CCFF', accent: '#00CCFF' }, // Cyan
  '하체': { from: '#CC5500', to: '#FF8C00', accent: '#FF8C00' }, // Orange
  '팔': { from: '#CCBB00', to: '#FFE600', accent: '#FFE600' }, // Yellow
  '어깨': { from: '#9944CC', to: '#CC77FF', accent: '#CC77FF' }, // Purple
};

// 유산소 전용 색상/아이콘
export const CARDIO_COLOR = { from: '#CC0033', to: '#FF3366', accent: '#FF3366' };
export const CARDIO_ICON = '🏃';

export function getExercisesByBodyPart(bodyPart: BodyPart): Exercise[] {
  return EXERCISES.filter(e => e.bodyPart === bodyPart);
}
