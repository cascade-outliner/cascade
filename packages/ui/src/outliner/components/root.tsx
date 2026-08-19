import { cva } from "cva";

const root = cva({ base: "" });

export interface OutlinerRootProps {
	children: React.ReactNode;
	className?: string;
}

export function Root({ children, className }: OutlinerRootProps) {
	return <div className={root({ className })}>{children}</div>;
}
