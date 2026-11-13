
import { auth } from "./src/auth.js";
import { db } from "./src/db.js";

const PASSWORD = "Student@123";

async function main() {
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(PASSWORD);

  const students = db.prepare(`
    SELECT id, name, email
    FROM "user"
    WHERE id LIKE 'sb_student_%'
    ORDER BY id
  `).all();

  console.log(`Found ${students.length} students`);

  for (const student of students) {
    try {
      const accounts = await ctx.internalAdapter.findAccounts(student.id);
      const credential = accounts.find(a => a.providerId === "credential");

      if (credential) {
        await ctx.internalAdapter.updateAccount(credential.id, {
          password: hash
        });
      } else {
        await ctx.internalAdapter.createAccount({
          userId: student.id,
          providerId: "credential",
          accountId: student.id,
          password: hash
        });
      }

      console.log(`AUTH OK: ${student.email}`);
    } catch (error) {
      console.error(`FAILED: ${student.email}`, error.message);
    }
  }

  console.log("Finished updating student authentication.");
}

main();
