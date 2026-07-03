import { Link } from "@tanstack/react-router";

interface NodeLinkProps {
	id: string;
}

export function NodeLink({ id }: NodeLinkProps) {
	return (
		<Link
			to="/node/$nodeId"
			params={{ nodeId: id }}
			viewTransition
			aria-label="Open node"
			className="relative after:absolute after:-inset-2 w-2 h-2 rounded-full bg-dark-grey hover:bg-redleather transition-colors shrink-0"
		/>
	);
}
