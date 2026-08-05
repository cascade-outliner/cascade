export function FieldError({ message }: { message: string | undefined }) {
	if (!message) return null;
	return (
		<p role="alert" className="text-xs text-danger">
			{message}
		</p>
	);
}
