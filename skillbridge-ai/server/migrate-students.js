
import { db } from "./src/db.js";

const mapping = [
["NKCgK5Icmhwr5FMHGbE7Gl7SKQBNyhki","sb_student_001"],
["UJPZQSlafxNgorrBkYTTh3HQ7J2QjAbF","sb_student_002"],
["opRANii89QOEXLmvExUmixELwOss2pks","sb_student_003"],
["0PpDkDh3dSP1taL1UQSxpKapPzy8pABc","sb_student_004"],
["Aw73XaSOufZVVA1NELOEf6HRcXHzcBgB","sb_student_005"],
["xw4VFJrShvX5fchNHIbNVD9lgAXXFbgW","sb_student_006"],
["pK5noiwBVjHDSZvs2WBv3QXPUgSdPUR2","sb_student_007"],
["9JF1IV69e0g89MPEJyH5tvc4vjjqpm8C","sb_student_008"],
["FeBEf8pWwQPzGRysNLUCggAdD3eMlmGq","sb_student_009"],
["s31bjHggu4NaLfAjZAgQ0cx6a8vWbbEn","sb_student_010"],
["hRoB7mfBev9kHHeDSlEy3ASH1KZYwDOU","sb_student_011"],
["zPQsgM31wo3k6JuwaM4qUTq36haV7Lv4","sb_student_012"],
["4NSe9wJZXZbaskFOtzwZx48ff5OUFn12","sb_student_013"],
["M9ufPT55nZHIvcByompQgte8TmFPl55R","sb_student_014"],
["0lYo27nKiRAPxzRLwZo1BwntEgzd8GuB","sb_student_015"],
["eGhxqGo8JYfWhPy0xCMXUXOgW4YTsK7n","sb_student_016"],
["NLM7i0U87VresOV6Y4iTOFMFKvqa7nEg","sb_student_017"],
["IMECrKXO5m3MsQJ51XX4ngv77rdNpaXV","sb_student_018"],
["kpLca97y2bpbzrpm3KZziR53RYw0RvkD","sb_student_019"],
["kFIvKNgvUi10t8sheLWO82FxE8B9Oi6J","sb_student_020"],
["EiALrEoxr3PVoriqg77oKBj6iSZstXSY","sb_student_021"],
["ibuKc280IMXJ47xLNdatyThTyXaRxLjH","sb_student_022"],
["RILYIgDfs7eTRaEYCHWVYPydeojPDwmb","sb_student_023"],
["JSYER6WRVrr5ksUtKNrTygWU7pol0sux","sb_student_024"],
["nS2lGHRNHf1pKVMQVAexvzxkymZsndDN","sb_student_025"],
["4PUgJSqrtJ18V7F2FtJGYxD1EPBEa7W8","sb_student_026"],
["iEWKZ3OtgbFuNZXP1ADHIIhUKz2mrjbn","sb_student_027"],
["PTZZNO59OBxgix6qZYw0M1uTvef483rc","sb_student_028"],
["CH4iRfgXVvhZnINFJddaGvlKhHpu9Gnl","sb_student_029"],
["ghG6COaEari6wL0J8uOfFmdfL65yr8OV","sb_student_030"]
];

const tables = [
  "skills","projects","certifications","achievements",
  "goals","resume_analyses","applications"
];

const migrate = db.transaction(() => {
  for (const [oldId,newId] of mapping) {
    if (!db.prepare('SELECT id FROM "user" WHERE id=?').get(oldId))
      throw Error("Missing old account: "+oldId);
    if (!db.prepare('SELECT id FROM "user" WHERE id=?').get(newId))
      throw Error("Missing new account: "+newId);

    for (const table of tables) {
      if (table === "applications") {
        db.prepare(`
          DELETE FROM applications
          WHERE user_id=? AND job_id IN
          (SELECT job_id FROM applications WHERE user_id=?)
        `).run(newId,oldId);
      }
      db.prepare(`UPDATE ${table} SET user_id=? WHERE user_id=?`)
        .run(newId,oldId);
    }

    const oldP = db.prepare(
      "SELECT * FROM student_profiles WHERE user_id=?"
    ).get(oldId);

    if (oldP) {
      const newP = db.prepare(
        "SELECT * FROM student_profiles WHERE user_id=?"
      ).get(newId);

      if (!newP)
        db.prepare("INSERT INTO student_profiles(user_id) VALUES (?)")
          .run(newId);

      const cols = Object.keys(oldP).filter(
        c => c !== "user_id" && c !== "updated_at"
      );

      const sets = cols.map(
        c => `"${c}"=COALESCE(NULLIF("${c}",''),?)`
      ).join(",");

      db.prepare(`UPDATE student_profiles SET ${sets},
        updated_at=datetime('now') WHERE user_id=?`)
        .run(...cols.map(c=>oldP[c]),newId);

      db.prepare(
        "DELETE FROM student_profiles WHERE user_id=?"
      ).run(oldId);
    }
  }
});

try {
  migrate();
  console.log("SUCCESS: All 30 student records migrated.");
} catch(e) {
  console.error("FAILED (rolled back):",e.message);
  process.exit(1);
}
