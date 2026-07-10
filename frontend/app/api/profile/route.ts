import { createProfileRouteHandlers } from "@/lib/api/userProfileRouteCore.mjs";
import { requireAuth } from "@/lib/auth/sessionCore.mjs";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

export const dynamic = "force-dynamic";

const handlers = createProfileRouteHandlers({ connectToDatabase, UserModel: User, requireAuth });

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
