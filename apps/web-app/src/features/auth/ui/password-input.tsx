import { Input, type InputProps } from "@cascade/ui/input";
import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react/ssr";
import { useId, useState } from "react";
import { m } from "#/paraglide/messages.js";

export function PasswordInput(
	props: Omit<InputProps, "type" | "endAdornment">,
) {
	const [visible, setVisible] = useState(false);
	const toggleId = useId();

	return (
		<Input
			{...props}
			type={visible ? "text" : "password"}
			endAdornment={
				<button
					type="button"
					id={toggleId}
					onClick={() => setVisible((current) => !current)}
					className="cursor-pointer rounded-sm p-1.5 text-muted transition-colors duration-small-enter hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/50 dark:hover:text-surface"
					aria-label={
						visible
							? m.auth_password_hide_label()
							: m.auth_password_show_label()
					}
				>
					{visible ? (
						<EyeSlashIcon className="size-4" weight="bold" />
					) : (
						<EyeIcon className="size-4" weight="bold" />
					)}
				</button>
			}
		/>
	);
}
