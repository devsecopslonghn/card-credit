import { createAdminUsersRouteHandlers } from "@/lib/api/userProfileRouteCore.mjs";
import { requireAuth } from "@/lib/auth/sessionCore.mjs";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

export const dynamic = "force-dynamic";

const handlers = createAdminUsersRouteHandlers({ connectToDatabase, UserModel: User, requireAuth });

export const PATCH = handlers.PATCH;
