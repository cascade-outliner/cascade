import type { Meta, StoryObj } from '@storybook/tanstack-react';
import { Link } from './link';

const meta = {
  title: 'UI/Link',
  component: Link,
  tags: ['autodocs'],
  args: {
    to: '/',
    children: 'Link',
    variant: 'default',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'muted'],
    },
    children: { control: 'text' },
  },
} satisfies Meta<typeof Link>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Link to="/" variant="default">Default</Link>
      <Link to="/" variant="muted">Muted</Link>
</div>
  ),
};

export const External: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Link href="https://tanstack.com" target="_blank">TanStack</Link>
      <Link href="https://tanstack.com" target="_blank" variant="muted">TanStack (muted)</Link>
    </div>
  ),
};
