export interface Game {
  id: string;
  room_code: string;
  host_id: string;
  frames_per_round: number; // 3, 5, or 8
  current_round: number;
  total_rounds: number;
  status: 'lobby' | 'drawing' | 'viewing' | 'complete' | 'prompt';
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  game_id: string;
  user_id: string;
  nickname: string;
  turn_order: number;
  is_host: boolean;
  created_at: string;
}

export interface Round {
  id: string;
  game_id: string;
  round_number: number;
  prompt: string;
  started_at: string;
  ended_at: string | null;
}

export interface Frame {
  id: string;
  round_id: string;
  player_id: string;
  frame_number: number; // 0-3
  image_data: string; // base64 or storage path
  created_at: string;
}

export interface Prompt {
  id: string;
  game_id: string;
  round_number: number;
  player_id: string;
  prompt: string;
  created_at: string;
  updated_at: string;
}

export type GameStatus = 'lobby' | 'drawing' | 'viewing' | 'complete' | 'prompt';
export type FramesPerRound = 3 | 5 | 8;

