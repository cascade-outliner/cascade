import { createFileRoute } from "@tanstack/react-router";
import {
	SignUpPage,
	signUpBeforeLoad,
} from "#/features/auth/routes/sign-up";

export const Route = createFileRoute("/auth/sign-up")({
	beforeLoad: signUpBeforeLoad,
	component: SignUpPage,
});
