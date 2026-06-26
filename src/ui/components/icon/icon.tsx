import type { Icon as PhosphorIcon, IconWeight } from '@phosphor-icons/react';

type IconProps = {
  icon: PhosphorIcon;
  size?: number;
  weight?: IconWeight;
  className?: string;
};

function Icon({ icon: IconComponent, size = 16, weight = 'regular', className }: IconProps) {
  return <IconComponent size={size} weight={weight} className={className} />;
}

export { Icon };
export type { IconProps, PhosphorIcon };
