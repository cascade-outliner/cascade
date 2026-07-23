import { authClient } from "@cascade/auth/client";
import { toast } from "@cascade/ui/toast";
import { useMutation } from "@tanstack/react-query";
import { m } from "#/paraglide/messages.js";

function goToLogin() {
	window.location.href = "/login";
}

export function useSignOut() {
	return useMutation({
		mutationFn: () => authClient.signOut(),
		onSuccess: goToLogin,
	});
}

export function useDeleteAccount() {
	return useMutation({
		mutationFn: async () => {
			const { error } = await authClient.deleteUser();
			if (error) throw new Error(error.message ?? m.user_menu_delete_failed());
		},
		onSuccess: goToLogin,
		onError: (error) => toast.error(error.message),
	});
}
