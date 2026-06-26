import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  DownloadIcon,
  GearIcon,
  HeartIcon,
  HouseIcon,
  MagnifyingGlassIcon,
  PaperPlaneTiltIcon,
  PlusIcon,
  TrashIcon,
  UploadIcon,
  WarningIcon,
  XIcon,
} from '@phosphor-icons/react';
import type { Meta, StoryObj } from '@storybook/tanstack-react';
import { Icon, type PhosphorIcon } from '../icon/icon';
import { Button } from './button';

const ICONS = {
  none: null,
  ArrowLeft: ArrowLeftIcon,
  ArrowRight: ArrowRightIcon,
  Check: CheckIcon,
  Download: DownloadIcon,
  Gear: GearIcon,
  Heart: HeartIcon,
  House: HouseIcon,
  MagnifyingGlass: MagnifyingGlassIcon,
  PaperPlaneTilt: PaperPlaneTiltIcon,
  Plus: PlusIcon,
  Trash: TrashIcon,
  Upload: UploadIcon,
  Warning: WarningIcon,
  X: XIcon,
} satisfies Record<string, PhosphorIcon | null>;

type IconKey = keyof typeof ICONS;

const iconOptions = Object.keys(ICONS) as IconKey[];
const iconMapping = Object.fromEntries(
  iconOptions.map((key) => [
    key,
    ICONS[key] ? <Icon icon={ICONS[key]} size={16} /> : undefined,
  ]),
) as Record<IconKey, React.ReactNode>;

const meta = {
  title: 'UI/Button',
  component: Button,
  args: {
    children: 'Button',
    variant: 'default',
    size: 'md',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    startIcon: {
      control: 'select',
      options: iconOptions,
      mapping: iconMapping,
    },
    endIcon: {
      control: 'select',
      options: iconOptions,
      mapping: iconMapping,
    },
    disabled: { control: 'boolean' },
    children: { control: 'text' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="default">Default</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button startIcon={<Icon icon={PlusIcon} size={16} />}>Add Item</Button>
      <Button endIcon={<Icon icon={ArrowRightIcon} size={16} />}>Continue</Button>
      <Button variant="destructive" startIcon={<Icon icon={TrashIcon} size={16} />}>Delete</Button>
      <Button variant="outline" startIcon={<Icon icon={DownloadIcon} size={16} />} endIcon={<Icon icon={CheckIcon} size={16} />}>
        Download
      </Button>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button disabled>Default</Button>
      <Button variant="destructive" disabled>Destructive</Button>
      <Button variant="outline" disabled>Outline</Button>
      <Button variant="ghost" disabled>Ghost</Button>
    </div>
  ),
};
