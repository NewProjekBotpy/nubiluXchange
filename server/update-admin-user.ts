import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logError, logInfo } from "./utils/logger";

async function updateGamerToAdmin() {
  try {
    logInfo("Updating gamer@example.com to admin role...", { context: 'updateGamerToAdmin' });

    // Update the user to have admin role and approval
    const [updatedUser] = await db
      .update(users)
      .set({
        role: "admin",
        isAdminApproved: true,
        adminApprovedAt: new Date(),
        adminRequestPending: false
      })
      .where(eq(users.email, "gamer@example.com"))
      .returning();

    if (updatedUser) {
      logInfo("✅ Successfully updated user", {
        context: 'updateGamerToAdmin',
        userId: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        isAdminApproved: updatedUser.isAdminApproved
      });
    } else {
      logInfo("❌ User not found with email: gamer@example.com", { context: 'updateGamerToAdmin' });
    }
  } catch (error) {
    logError("Error updating user", { error, context: 'updateGamerToAdmin' });
  }
}

export { updateGamerToAdmin };

// Run the update if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updateGamerToAdmin()
    .then(() => {
      logInfo("Update completed", { context: 'updateGamerToAdmin' });
      process.exit(0);
    })
    .catch((error) => {
      logError("Update failed", { error, context: 'updateGamerToAdmin' });
      process.exit(1);
    });
}