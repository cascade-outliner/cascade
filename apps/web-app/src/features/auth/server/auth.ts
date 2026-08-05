import { createAuth } from "@cascade/auth/server";
import { db } from "@/db";
import { seedOnboardingContent } from "@/features/onboarding/server/seed-onboarding-tree";

export const auth = createAuth(db, {
	onUserCreated: (user) => seedOnboardingContent(user.id),
});
