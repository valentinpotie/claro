import pg from "pg";

const { Client } = pg;

const connectionString = process.env.DB_READONLY_URL;
const schema = process.env.DB_SCHEMA || "public";
const sampleLimit = Number(process.env.DB_SAMPLE_LIMIT || 5);
const targetTable = process.argv[2];

if (!connectionString) {
  console.error("Missing DB_READONLY_URL environment variable.");
  console.error("Example:");
  console.error("  DB_READONLY_URL=postgresql://user:pass@host:5432/postgres?sslmode=require npm run db:inspect");
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const q = async (text, params = []) => {
  const result = await client.query(text, params);
  return result.rows;
};

const printSection = (title) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(`\n=== ${title} ===`);
  }
};

const inspectAllTables = async () => {
  const tables = await q(
    `
    select table_name
    from information_schema.tables
    where table_schema = $1 and table_type = 'BASE TABLE'
    order by table_name asc
    `,
    [schema],
  );

  printSection(`Schema ${schema} - tables (${tables.length})`);
  for (const t of tables) {
    console.log(`- ${t.table_name}`);
  }

  for (const t of tables) {
    const table = t.table_name;

    printSection(`Table ${table}`);

    const columns = await q(
      `
      select
        column_name,
        data_type,
        is_nullable,
        coalesce(column_default, '') as column_default
      from information_schema.columns
      where table_schema = $1 and table_name = $2
      order by ordinal_position asc
      `,
      [schema, table],
    );

    console.log("Columns:");
    for (const c of columns) {
      const nullable = c.is_nullable === "YES" ? "NULL" : "NOT NULL";
      const defaultValue = c.column_default ? ` default=${c.column_default}` : "";
      console.log(`  - ${c.column_name}: ${c.data_type} ${nullable}${defaultValue}`);
    }

    const [{ row_count }] = await q(`select count(*)::int as row_count from "${schema}"."${table}"`);
    console.log(`Rows: ${row_count}`);

    if (row_count > 0) {
      const sampleRows = await q(`select * from "${schema}"."${table}" limit ${sampleLimit}`);
      console.log(`Sample (${Math.min(sampleRows.length, sampleLimit)} rows):`);
      for (const row of sampleRows) {
        console.log(`  - ${JSON.stringify(row)}`);
      }
    }
  }
};

const inspectOneTable = async (table) => {
  const exists = await q(
    `
    select 1
    from information_schema.tables
    where table_schema = $1 and table_name = $2
    limit 1
    `,
    [schema, table],
  );

  if (exists.length === 0) {
    throw new Error(`Table not found: ${schema}.${table}`);
  }

  printSection(`Table ${schema}.${table}`);

  const columns = await q(
    `
    select
      column_name,
      data_type,
      is_nullable,
      coalesce(column_default, '') as column_default
    from information_schema.columns
    where table_schema = $1 and table_name = $2
    order by ordinal_position asc
    `,
    [schema, table],
  );

  console.log("Columns:");
  for (const c of columns) {
    const nullable = c.is_nullable === "YES" ? "NULL" : "NOT NULL";
    const defaultValue = c.column_default ? ` default=${c.column_default}` : "";
    console.log(`  - ${c.column_name}: ${c.data_type} ${nullable}${defaultValue}`);
  }

  const [{ row_count }] = await q(`select count(*)::int as row_count from "${schema}"."${table}"`);
  console.log(`Rows: ${row_count}`);

  if (row_count > 0) {
    const sampleRows = await q(`select * from "${schema}"."${table}" limit ${sampleLimit}`);
    console.log(`Sample (${Math.min(sampleRows.length, sampleLimit)} rows):`);
    for (const row of sampleRows) {
      console.log(`  - ${JSON.stringify(row)}`);
    }
  }
};

const main = async () => {
  await client.connect();

  const [{ now }] = await q("select now()::text as now");
  printSection("Connection");
  console.log(`Connected at: ${now}`);
  console.log(`Schema: ${schema}`);

  if (targetTable) {
    await inspectOneTable(targetTable);
  } else {
    await inspectAllTables();
  }
};

main()
  .catch((error) => {
    console.error("Database inspection failed:");
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await client.end();
    } catch {
      // no-op
    }
  });
