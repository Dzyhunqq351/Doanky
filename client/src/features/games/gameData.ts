import { Bird, Blocks, Gamepad2 } from 'lucide-react';
import type { LocalGame } from '../../../../shared/localMatch.js';

export const games = [
  {
    id: 'flappy' as LocalGame,
    title: 'Flappy Bird',
    titleColor: 'oklch(0.36 0.1 140)',
    icon: Bird,
    description: 'Vượt ống, ghi điểm. Chơi đơn hoặc đấu 2 người.',
    buffTrigger: 'Mỗi 10 điểm',
    buffRatio: '60% lợi / 40% hại',
    buffs: {
      good: ['Hồi sinh (bay về khe an toàn)', 'Cộng điểm thưởng', 'Làm chậm ống'],
      bad: ['Trừ điểm', 'Tăng tốc ống', 'Thu hẹp khe'],
    },
  },
  {
    id: 'pikachu' as LocalGame,
    title: 'Pikachu',
    titleColor: 'oklch(0.38 0.12 80)',
    icon: Gamepad2,
    description: 'Nối cặp giống nhau. Cùng máy thay phiên; online đấu đồng thời.',
    buffTrigger: 'Mỗi 1.000 điểm',
    buffRatio: '60% lợi / 40% hại',
    buffs: {
      good: ['Nhân đôi điểm', 'Đóng băng thời gian', 'Thêm gợi ý miễn phí'],
      bad: ['Trừ điểm trực tiếp', 'Trừ lượt gợi ý / đổi vị trí'],
    },
  },
  {
    id: 'tetris' as LocalGame,
    title: 'Tetris',
    titleColor: 'oklch(0.35 0.1 260)',
    icon: Blocks,
    description: 'Xếp khối, xóa hàng. Chơi đến khi kết thúc và xếp hạng theo điểm.',
    buffTrigger: 'Mỗi 1.000 điểm',
    buffRatio: '60% lợi / 40% hại',
    buffs: {
      good: ['Nhân đôi điểm', 'Rơi chậm hơn', 'Dọn sạch bàn', 'Cộng điểm thưởng'],
      bad: ['Trừ điểm', 'Tăng tốc rơi', 'Gửi hàng rác cho đối thủ'],
    },
  },
] as const;

export type GameItem = (typeof games)[number];
