const { createClient } = require("@supabase/supabase-js");
const { writeFileSync, mkdirSync, existsSync, rmSync } = require("fs");

const supabaseUrl = "API_URL";
const supabaseKey = "SERVICE_ROLE_JWT";
const options = {};
const supabase = createClient(supabaseUrl, supabaseKey, options);
async function dumpStorage() {
  const storage = supabase.storage;
  const buckets = await storage.listBuckets();
  if (buckets.error) {
    throw new Error(buckets.error);
  }
  let count = 0;
  createDir("./supabase-dump");
  await Promise.all(
    buckets.data.map(async (bucket) => {
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
              await createDir(`./supabase-dump/${bucket.id}/${path}`);
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
    })
  );
  console.log(`${count} Objects Downloaded.`);
}

dumpStorage();
async function createDir(path) {
  const exists = await existsSync(path);
  if (exists) {
    await rmSync(path, { recursive: true, force: true });
  }
  await mkdirSync(path, { recursive: true });
}
