const { createClient } = require("@supabase/supabase-js");
const { writeFileSync, mkdirSync, existsSync, rmSync } = require("fs");

const supabaseUrl = "https://mbobvuyfcdworlpwkvux.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ib2J2dXlmY2R3b3JscHdrdnV4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY2MjE2ODc5MywiZXhwIjoxOTc3NzQ0NzkzfQ.ay0Es-oO1yUp7JCSdq9u3YhgrV54Vakee07mlU9GVfc";
const options = {};
const supabase = createClient(supabaseUrl, supabaseKey, options);
async function dumpStorage() {
  const storage = supabase.storage;
  const buckets = await storage.listBuckets();
  if (buckets.error) {
    throw new Error(buckets.error);
  }
  let count = 0;
  createDir("./supabase-dump", true);
  for (const bucket of buckets.data) {
    const rootLst = await storage.from(bucket.id).list();
    if (rootLst.error) throw new Error(rootLst.error);
    const dump = async (objects, path = "", depth = 0) => {
      if (depth > 5) throw new Error("Depth exceed");
      await Promise.all(
        objects.map(async (d) => {
          const file = await storage
            .from(bucket.id)
            .download(`${path}/${d.name}`);
          if (file.error) {
            const folder = await storage
              .from(bucket.id)
              .list(`${path}${d.name}`);
            if (folder.error) throw new Error(folder.error);
            await dump(folder.data, `${path}${d.name}/`, depth + 1);
          } else {
            await createDir(`./supabase-dump/${bucket.id}/${path}`, false);
            console.log(`saving ${bucket.id}/${path}${d.name}`);
            writeFileSync(
              `./supabase-dump/${bucket.id}/${path}${d.name}`,
              Buffer.from(await file.data.arrayBuffer())
            );
            count += 1;
          }
        })
      );
    };
    await dump(rootLst.data, "", 0);
  }

  console.log(`${count} Objects Downloaded.`);
}

dumpStorage();
async function createDir(path, remove) {
  const exists = await existsSync(path);
  if (remove && exists) {
    await rmSync(path, { recursive: true, force: true });
  }
  await mkdirSync(path, { recursive: true });
}
