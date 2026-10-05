import {
  Bird,
  Cat,
  Dog,
  Fish,
  Rabbit,
  Turtle,
  Squirrel,
  Bug,
  Ghost,
  Bot,
  Shell,
  Snail,
} from 'lucide-react';
const icons = [Bird, Cat, Dog, Fish, Rabbit, Turtle, Squirrel, Bug, Ghost, Bot, Shell, Snail];
export default function Avatar({ index, small = false }: { index: number; small?: boolean }) {
  const Icon = icons[index % icons.length] || Bird;
  return (
    <span
      className={`avatar avatar-${index % 6} ${small ? 'small' : ''}`}
      role="img"
      aria-label={`Avatar ${index + 1}`}
    >
      <Icon size={small ? 20 : 27} strokeWidth={1.8} />
    </span>
  );
}
