import { createFileRoute } from "@tanstack/react-router";
import {
	SignInPage,
	signInBeforeLoad,
} from "#/features/auth/routes/sign-in";

export const Route = createFileRoute("/auth/sign-in")({
	beforeLoad: signInBeforeLoad,
	component: SignInPage,
});
