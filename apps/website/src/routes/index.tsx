import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "#/features/marketing/pages/home-page";

export const Route = createFileRoute("/")({ component: HomePage });
